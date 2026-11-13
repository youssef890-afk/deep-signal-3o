import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { AudioLines, Bookmark, Heart, Image as ImageIcon, MessageCircle, MoreHorizontal, Play, Send, Video, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModalScrollLock } from '@/hooks/useModalLayer';
import { directionForLanguage, getStoredLanguage, translate } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import Avatar from '@/components/Avatar';

export interface PostComment {
  id: string;
  author: string;
  text: string;
  userId: string;
}

export interface PostCardPost {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio';
  url: string | null;
  userId: string;
  author: string;
  avatar: string | null;
  caption: string | null;
  likes: number;
  commentCount: number;
  likedByCurrentUser: boolean;
  savedByCurrentUser: boolean;
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
  const [saved, setSaved] = useState(post.savedByCurrentUser);
  const [saveLoading, setSaveLoading] = useState(false);
  const [expandedCaption, setExpandedCaption] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [comments, setComments] = useState(post.comments);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [commentText, setCommentText] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [interactionError, setInteractionError] = useState('');
  const [interactionNotice, setInteractionNotice] = useState('');
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const hasVideo = post.type === 'video';
  const hasAudio = post.type === 'audio';
  const hasImage = post.type === 'image';
  useModalScrollLock(lightboxOpen && !hasVideo);
  const captionIsLong = (post.caption?.length ?? 0) > 120;
  const displayedComments = showAllComments ? comments : comments.slice(0, 2);

  useEffect(() => {
    setLiked(post.likedByCurrentUser);
    setSaved(post.savedByCurrentUser);
    setLikeCount(post.likes);
    setComments(post.comments);
    setCommentCount(post.commentCount);
  }, [post.id, post.likedByCurrentUser, post.savedByCurrentUser, post.likes, post.comments, post.commentCount]);

  useEffect(() => {
    setMediaLoaded(false);
    setMediaError(false);
  }, [post.url]);

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
    if (hasImage) setLightboxOpen(true);
  };

  const toggleSaved = async () => {
    if (!currentUserId || saveLoading) return;
    setSaveLoading(true);
    setInteractionError('');

    try {
      const { error } = saved
        ? await supabase.from('post_bookmarks').delete().eq('post_id', post.id).eq('user_id', currentUserId)
        : await supabase.from('post_bookmarks').insert({ post_id: post.id, user_id: currentUserId });

      if (error && !(error.code === '23505' && !saved)) throw error;
      setSaved(!saved);
    } catch (error) {
      console.error('Post bookmark update failed:', error);
      setInteractionError('تعذر تحديث المحفوظات. تحقق من الاتصال وحاول مرة أخرى.');
    } finally {
      setSaveLoading(false);
    }
  };

  const sharePost = async () => {
    const url = new URL(`/feed#post-${encodeURIComponent(post.id)}`, window.location.origin).toString();
    setInteractionError('');
    setInteractionNotice('');
    try {
      if (navigator.share) {
        await navigator.share({ title: `منشور ${post.author}`, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setInteractionNotice('تم نسخ رابط المنشور.');
      } else {
        window.prompt('انسخ رابط المنشور', url);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Post share failed:', error);
      setInteractionError('تعذرت مشاركة المنشور. حاول مرة أخرى.');
    }
  };

  const copyPostLink = async () => {
    const url = new URL(`/feed#post-${encodeURIComponent(post.id)}`, window.location.origin).toString();
    setMenuOpen(false);
    setInteractionError('');
    setInteractionNotice('');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setInteractionNotice('تم نسخ رابط المنشور.');
      } else {
        window.prompt('انسخ رابط المنشور', url);
      }
    } catch (error) {
      console.error('Post link could not be copied:', error);
      setInteractionError('تعذر نسخ الرابط. حاول مرة أخرى.');
    }
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
    <article id={`post-${post.id}`} className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[0_16px_48px_rgba(0,0,0,0.16)] transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_22px_60px_rgba(0,0,0,0.24)]" dir="rtl">
      <header className="flex min-h-[72px] items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => navigate(`/profile/${post.author}`)} aria-label={`عرض الملف الشخصي ${post.author}`} className="shrink-0 rounded-full transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
          <Avatar src={post.avatar} name={post.author} size={44} />
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => navigate(`/profile/${post.author}`)} className="block max-w-full truncate text-right text-sm font-bold text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">{post.author}</button>
          <div className="mt-1 flex items-center gap-2"><span className="text-[10px] font-medium text-[var(--text)]/55">إشارة من المجتمع</span><span className="h-1 w-1 rounded-full bg-[var(--text)]/25" /><time dateTime={post.createdAt} className="text-[11px] text-[var(--text)]/45">{postedAt}</time></div>
        </div>
        <div className="relative">
          <button type="button" aria-label="خيارات المنشور" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="rounded-xl p-2 text-[var(--text)]/55 transition duration-200 hover:bg-white/[0.06] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"><MoreHorizontal className="h-5 w-5" /></button>
          {menuOpen && <div role="menu" className="absolute start-0 top-full z-30 mt-1 min-w-40 rounded-xl border border-white/10 bg-[var(--surface)] p-1 shadow-xl">
            <button type="button" role="menuitem" onClick={() => void copyPostLink()} className="w-full rounded-lg px-3 py-2 text-right text-xs text-[var(--text)]/80 transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">نسخ رابط المنشور</button>
          </div>}
        </div>
      </header>

      {post.caption && (
        <div className="px-4 pb-3 pt-1">
          <p
            className="text-sm leading-7 text-[var(--text)]/85"
            style={!expandedCaption ? { display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
          >
            <button type="button" onClick={() => navigate(`/profile/${post.author}`)} className="ml-1 font-semibold text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">{post.author}</button>
            {post.caption}
          </p>
          {captionIsLong && <button type="button" onClick={() => setExpandedCaption((current) => !current)} className="mt-1 text-xs text-[var(--text)]/55 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">{expandedCaption ? 'أقل' : 'عرض المزيد'}</button>}
        </div>
      )}

      {hasAudio && post.url && (
        <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <AudioLines aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--accent)]" />
          <audio controls preload="metadata" src={post.url} className="min-w-0 flex-1" />
        </div>
      )}

      {post.url && (hasImage || hasVideo) && <button type="button" onClick={openMedia} aria-label={hasVideo ? 'فتح الفيديو في ريلز' : 'عرض الصورة بالحجم الكامل'} className="group/media block w-full overflow-hidden bg-black text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]">
        <div className="relative mx-auto aspect-video max-h-[480px] w-full overflow-hidden bg-black">
          {mediaError ? (
            <div className="absolute inset-0 grid place-items-center text-white/35">
              {hasVideo ? <Video className="h-8 w-8" /> : <ImageIcon className="h-8 w-8" />}
            </div>
          ) : hasVideo ? (
            <>
              <video
                src={post.url}
                muted
                playsInline
                preload="metadata"
                onLoadedData={() => setMediaLoaded(true)}
                onError={() => { setMediaLoaded(true); setMediaError(true); }}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <span className="grid h-14 w-14 place-items-center rounded-full border border-white/25 bg-black/45 text-white shadow-xl backdrop-blur-sm transition duration-200 group-hover/media:scale-105">
                  <Play className="h-6 w-6 fill-current" />
                </span>
              </div>
            </>
          ) : (
            <>
              <img
                src={post.url}
                alt={post.caption ?? 'منشور'}
                onLoad={() => setMediaLoaded(true)}
                onError={() => { setMediaLoaded(true); setMediaError(true); }}
                className="absolute inset-0 h-full w-full object-cover transition duration-200 group-hover/media:scale-[1.01]"
                loading="lazy"
                decoding="async"
              />
            </>
          )}
          {!mediaLoaded && !mediaError && <div aria-hidden="true" className="absolute inset-0 z-10 animate-pulse bg-white/[0.07]" />}
        </div>
      </button>}

      <div className="px-3 pb-4 pt-2 sm:px-4">
        <div className="mb-2 flex items-stretch gap-1 border-b border-white/[0.06] pb-2">
          <button type="button" onClick={() => void toggleLike()} disabled={likeLoading || !currentUserId} aria-label={liked ? 'إزالة الإعجاب' : 'إعجاب'} aria-pressed={liked} className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition duration-200 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-wait disabled:opacity-60 ${liked ? 'text-[var(--accent)]' : 'text-[var(--text)]/65'}`}><span className="flex items-center gap-1.5"><Heart className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} /><span>تفاعل</span></span><span>{likeCount.toLocaleString('en-US')}</span></button>
          <button type="button" onClick={() => document.getElementById(`comment-input-${post.id}`)?.focus()} aria-label={commentsLabel} className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold text-[var(--text)]/65 transition duration-200 hover:bg-white/[0.05] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"><span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /><span>{commentsLabel}</span></span><span>{commentCount.toLocaleString('en-US')}</span></button>
          <button type="button" onClick={() => void sharePost()} aria-label="مشاركة المنشور" className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold text-[var(--text)]/65 transition duration-200 hover:bg-white/[0.05] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"><span className="flex items-center gap-1.5"><Send className="h-4 w-4" /><span>شارك</span></span><span aria-hidden="true">&nbsp;</span></button>
          <button type="button" onClick={() => void toggleSaved()} disabled={!currentUserId || saveLoading} aria-label={saved ? 'إزالة من المحفوظات' : 'حفظ المنشور'} aria-pressed={saved} className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition duration-200 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50 ${saved ? 'text-[var(--accent)]' : 'text-[var(--text)]/65 hover:text-[var(--text)]'}`}><span className="flex items-center gap-1.5"><Bookmark className="h-4 w-4" /><span>حفظ</span></span><span aria-hidden="true">&nbsp;</span></button>
        </div>

        <p className="mb-2 text-xs font-semibold text-[var(--text)]/55">{likeCount.toLocaleString('en-US')} تفاعل مع هاد المنشور · {commentCount.toLocaleString('en-US')} تعليق</p>
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
        {interactionNotice && <p role="status" className="mt-3 text-xs leading-5 text-[var(--accent)]">{interactionNotice}</p>}
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
