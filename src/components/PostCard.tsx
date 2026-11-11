import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Play, Send, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModalScrollLock } from '@/hooks/useModalLayer';
import { directionForLanguage, getStoredLanguage, translate } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

export interface PostComment {
  id: string;
  author: string;
  text: string;
  userId: string;
}

export interface PostCardPost {
  id: string;
  type: 'image' | 'video';
  url: string;
  userId: string;
  author: string;
  avatar: string | null;
  caption: string | null;
  likes: number;
  commentCount: number;
  likedByCurrentUser: boolean;
  comments: PostComment[];
  createdAt: string;
}

interface PostCardProps {
  post: PostCardPost;
  currentUserId: string | null;
  currentUsername: string;
  onEngagementChanged: () => void;
}

const PostCard = ({ post, currentUserId, currentUsername, onEngagementChanged }: PostCardProps) => {
  const navigate = useNavigate();
  const commentsLabel = translate(getStoredLanguage(), 'comments');
  const [liked, setLiked] = useState(post.likedByCurrentUser);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [saved, setSaved] = useState(false);
  const [expandedCaption, setExpandedCaption] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [comments, setComments] = useState(post.comments);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [commentText, setCommentText] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [interactionError, setInteractionError] = useState('');
  const hasVideo = post.type === 'video';
  useModalScrollLock(lightboxOpen && !hasVideo);
  const captionIsLong = (post.caption?.length ?? 0) > 120;
  const displayedComments = showAllComments ? comments : comments.slice(0, 2);

  useEffect(() => {
    setLiked(post.likedByCurrentUser);
    setLikeCount(post.likes);
    setComments(post.comments);
    setCommentCount(post.commentCount);
  }, [post.id, post.likedByCurrentUser, post.likes, post.comments, post.commentCount]);

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [lightboxOpen]);

  const openMedia = () => {
    if (hasVideo) {
      navigate('/reels');
      return;
    }
    setLightboxOpen(true);
  };

  const toggleLike = async () => {
    if (!currentUserId || likeLoading) return;
    setLikeLoading(true);
    setInteractionError('');

    try {
      const { error } = liked
        ? await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUserId)
        : await supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId });

      if (error && !(error.code === '23505' && !liked)) throw error;

      setLiked(!liked);
      setLikeCount((count) => Math.max(0, count + (liked ? -1 : 1)));
      onEngagementChanged();
    } catch (error) {
      console.error('Post like update failed:', error);
      setInteractionError('تعذر تحديث الإعجاب. تحقق من الاتصال وحاول مرة أخرى.');
    } finally {
      setLikeLoading(false);
    }
  };

  const fetchAllComments = async (): Promise<PostComment[]> => {
      const { data, error } = await supabase
        .from('comments')
        .select('id, user_id, content, created_at, profiles:profiles(username)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      if (error) throw error;

      return (data ?? []).map((comment) => {
        const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
        return {
          id: String(comment.id),
          userId: String(comment.user_id),
          author: profile?.username ?? 'مستخدم',
          text: String(comment.content),
        };
      });
  };

  const loadAllComments = async () => {
    if (commentsLoading) return;
    if (comments.length >= commentCount) {
      setShowAllComments(true);
      return;
    }

    setCommentsLoading(true);
    setInteractionError('');
    try {
      setComments(await fetchAllComments());
      setShowAllComments(true);
    } catch (error) {
      console.error('Post comments could not be loaded:', error);
      setInteractionError('تعذر تحميل التعليقات. تحقق من الاتصال وحاول مرة أخرى.');
    } finally {
      setCommentsLoading(false);
    }
  };

  const addComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text || !currentUserId || commentLoading) return;
    setCommentLoading(true);
    setInteractionError('');

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ post_id: post.id, user_id: currentUserId, content: text })
        .select('id, user_id, content')
        .single();
      if (error) throw error;

      const savedComment = {
        id: String(data.id),
        userId: String(data.user_id),
        author: currentUsername || 'أنت',
        text: String(data.content),
      };
      setCommentCount((count) => count + 1);
      setCommentText('');
      onEngagementChanged();

      try {
        setComments(await fetchAllComments());
        setShowAllComments(true);
      } catch (refreshError) {
        console.error('Saved comment, but could not refresh the comments:', refreshError);
        setComments((current) => [...current.slice(-1), savedComment]);
        setShowAllComments(false);
        setInteractionError('تم إرسال تعليقك، لكن تعذر تحديث بقية التعليقات.');
      }
    } catch (error) {
      console.error('Post comment could not be saved:', error);
      setInteractionError('تعذر إرسال التعليق. تحقق من الاتصال وحاول مرة أخرى.');
    } finally {
      setCommentLoading(false);
    }
  };

  const relativeTime = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });
  const minutesAgo = Math.max(1, Math.floor((Date.now() - Date.parse(post.createdAt)) / 60000));
  const postedAt = minutesAgo < 60
    ? relativeTime.format(-minutesAgo, 'minute')
    : minutesAgo < 1440
      ? relativeTime.format(-Math.floor(minutesAgo / 60), 'hour')
      : relativeTime.format(-Math.floor(minutesAgo / 1440), 'day');

  return (
    <article className="overflow-hidden rounded-[22px] border border-[var(--text)]/[0.09] bg-[var(--surface)]/95 shadow-[0_16px_48px_rgba(0,0,0,0.2)] transition duration-300 hover:border-[var(--text)]/20" dir="rtl">
      <header className="flex min-h-[72px] items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => navigate(`/profile/${post.author}`)} aria-label={`عرض الملف الشخصي ${post.author}`} className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl ring-1 ring-[var(--text)]/20 transition hover:scale-105">
          <img src={post.avatar ?? `https://picsum.photos/seed/${post.userId}/96/96`} alt="" className="h-full w-full object-cover" />
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => navigate(`/profile/${post.author}`)} className="block max-w-full truncate text-right text-sm font-semibold text-[var(--text)]">{post.author}</button>
          <div className="mt-1 flex items-center gap-2"><span className="text-[10px] font-medium text-[var(--text)]/70">إشارة من المجتمع</span><span className="h-1 w-1 rounded-full bg-[var(--text)]/25" /><time dateTime={post.createdAt} className="text-[11px] text-[var(--text)]/45">{postedAt}</time></div>
        </div>
        <button type="button" aria-label="خيارات المنشور" className="rounded-xl p-2 text-[var(--text)]/55 transition hover:bg-[var(--text)]/[0.06] hover:text-[var(--text)]"><MoreHorizontal className="h-5 w-5" /></button>
      </header>

      <button type="button" onClick={openMedia} aria-label={hasVideo ? 'فتح الفيديو في ريلز' : 'عرض الصورة بالحجم الكامل'} className="group/media block w-full overflow-hidden bg-black text-right">
        <div className="relative aspect-[4/3] max-h-[520px] w-full overflow-hidden bg-[var(--bg)]">
          {hasVideo ? (
            <>
              <video
                src={post.url}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg)]/20">
                <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[var(--text)]/30 bg-[#171614]/65 text-[var(--text)] shadow-lg backdrop-blur-sm transition group-hover/media:scale-110">
                  <Play className="h-6 w-6 fill-current" />
                </span>
              </div>
            </>
          ) : (
            <img
              src={post.url}
              alt={post.caption ?? 'منشور'}
              className="h-full w-full object-cover transition duration-500 group-hover/media:scale-[1.015]"
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
      </button>

      <div className="px-4 pb-4 pt-3">
        <div className="mb-3 flex items-center gap-2" dir="ltr">
          <button type="button" onClick={() => void toggleLike()} disabled={likeLoading || !currentUserId} aria-label={liked ? 'إزالة الإعجاب' : 'إعجاب'} aria-pressed={liked} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-60 ${liked ? 'border-[var(--text)]/30 bg-[var(--text)]/10 text-[var(--text)]' : 'border-[var(--text)]/10 text-[var(--text)]/75 hover:border-[var(--text)]/25 hover:bg-[var(--text)]/[0.04]'}`}><Heart className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} /><span>تفاعل</span></button>
          <button type="button" onClick={() => document.getElementById(`comment-input-${post.id}`)?.focus()} aria-label={commentsLabel} className="inline-flex items-center gap-2 rounded-xl border border-[var(--text)]/10 px-3 py-2 text-xs font-semibold text-[var(--text)]/75 transition hover:border-[var(--text)]/25 hover:bg-[var(--text)]/[0.04]"><MessageCircle className="h-4 w-4" /><span>{commentsLabel}</span></button>
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(window.location.href); }} aria-label="مشاركة المنشور" className="inline-flex items-center gap-2 rounded-xl border border-[var(--text)]/10 px-3 py-2 text-xs font-semibold text-[var(--text)]/75 transition hover:border-[var(--text)]/25 hover:bg-[var(--text)]/[0.04]"><Send className="h-4 w-4" /><span>شارك</span></button>
          <button type="button" onClick={() => setSaved((current) => !current)} aria-label={saved ? 'إزالة من المحفوظات' : 'حفظ المنشور'} aria-pressed={saved} className={`mr-auto rounded-xl border p-2 transition ${saved ? 'border-[var(--text)]/30 bg-[var(--text)]/10 text-[var(--text)]' : 'border-[var(--text)]/10 text-[var(--text)]/65 hover:bg-[var(--text)]/[0.04]'}`}><Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} /></button>
        </div>

        <p className="mb-2 text-xs font-semibold text-[var(--text)]/55">{likeCount.toLocaleString('en-US')} تفاعل مع هاد المنشور · {commentCount.toLocaleString('en-US')} تعليق</p>
        {post.caption && (
          <p className="text-sm leading-7 text-[var(--text)]/85">
            <button type="button" onClick={() => navigate(`/profile/${post.author}`)} className="ml-1 font-semibold text-[var(--text)]">{post.author}</button>
            {captionIsLong && !expandedCaption ? `${post.caption.slice(0, 120)}…` : post.caption}
            {captionIsLong && <button type="button" onClick={() => setExpandedCaption((current) => !current)} className="mr-1 text-[var(--text)]/50">{expandedCaption ? 'أقل' : 'المزيد'}</button>}
          </p>
        )}
        {commentCount > 2 && !showAllComments && (
          <button type="button" onClick={() => void loadAllComments()} disabled={commentsLoading} className="mt-2 text-sm text-[var(--text)]/50 disabled:opacity-50">
            {commentsLoading ? 'جارٍ تحميل التعليقات…' : `شوف كل التعليقات (${commentCount})`}
          </button>
        )}
        {comments.length > 0 && (
          <div className="mt-2 space-y-1">
            {displayedComments.map((comment) => <p key={comment.id} className="text-sm leading-5"><span className="ml-1 font-semibold">{comment.author}</span><span className="text-[var(--text)]/80">{comment.text}</span></p>)}
          </div>
        )}
        {interactionError && <p role="alert" className="mt-3 text-xs leading-5 text-[var(--error)]">{interactionError}</p>}
        <form onSubmit={addComment} className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--text)]/[0.08] bg-black/15 px-3">
          <input id={`comment-input-${post.id}`} value={commentText} maxLength={2000} onChange={(event) => setCommentText(event.target.value)} placeholder="زيد تعليقك..." aria-label="أضف تعليقاً" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text)]/40" />
          <button type="submit" disabled={!commentText.trim() || commentLoading || !currentUserId} className="rounded-lg px-2 py-1 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--text)]/10 disabled:opacity-40">{commentLoading ? 'جارٍ الإرسال…' : 'إرسال'}</button>
        </form>
      </div>

      {lightboxOpen && !hasVideo && (
        createPortal(<div role="dialog" aria-modal="true" aria-label="عرض الصورة" dir={directionForLanguage(getStoredLanguage())} onMouseDown={(event) => { if (event.target === event.currentTarget) setLightboxOpen(false); }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-3 sm:p-8">
          <button type="button" onClick={() => setLightboxOpen(false)} aria-label="إغلاق الصورة" className="absolute inset-inline-start-4 top-4 z-10 rounded-full bg-[var(--text)]/10 p-2 text-[var(--text)] transition hover:scale-105 hover:bg-[var(--text)]/20"><X className="h-6 w-6" /></button>
          <img src={post.url} alt={post.caption ?? 'منشور'} onClick={(event) => event.stopPropagation()} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>, document.body)
      )}
    </article>
  );
};

export default PostCard;
