import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Play, Send, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModalScrollLock } from '@/hooks/useModalLayer';
import { directionForLanguage, getStoredLanguage } from '@/lib/i18n';

export interface PostComment {
  id: string;
  author: string;
  text: string;
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
  comments: PostComment[];
  createdAt: string;
}

interface PostCardProps {
  post: PostCardPost;
}

const PostCard = ({ post }: PostCardProps) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedCaption, setExpandedCaption] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [comments, setComments] = useState(post.comments);
  const [commentText, setCommentText] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const hasVideo = post.type === 'video';
  useModalScrollLock(lightboxOpen && !hasVideo);
  const captionIsLong = (post.caption?.length ?? 0) > 120;
  const displayedComments = showAllComments ? comments : comments.slice(0, 2);

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

  const addComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setComments((current) => [...current, { id: `${post.id}-${Date.now()}`, author: 'أنت', text }]);
    setCommentText('');
    setShowAllComments(true);
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
          <button type="button" onClick={() => setLiked((current) => !current)} aria-label={liked ? 'إزالة الإعجاب' : 'إعجاب'} aria-pressed={liked} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${liked ? 'border-[var(--text)]/30 bg-[var(--text)]/10 text-[var(--text)]' : 'border-[var(--text)]/10 text-[var(--text)]/75 hover:border-[var(--text)]/25 hover:bg-[var(--text)]/[0.04]'}`}><Heart className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} /><span>تفاعل</span></button>
          <button type="button" onClick={() => document.getElementById(`comment-input-${post.id}`)?.focus()} aria-label="التعليقات" className="inline-flex items-center gap-2 rounded-xl border border-[var(--text)]/10 px-3 py-2 text-xs font-semibold text-[var(--text)]/75 transition hover:border-[var(--text)]/25 hover:bg-[var(--text)]/[0.04]"><MessageCircle className="h-4 w-4" /><span>ناقش</span></button>
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(window.location.href); }} aria-label="مشاركة المنشور" className="inline-flex items-center gap-2 rounded-xl border border-[var(--text)]/10 px-3 py-2 text-xs font-semibold text-[var(--text)]/75 transition hover:border-[var(--text)]/25 hover:bg-[var(--text)]/[0.04]"><Send className="h-4 w-4" /><span>شارك</span></button>
          <button type="button" onClick={() => setSaved((current) => !current)} aria-label={saved ? 'إزالة من المحفوظات' : 'حفظ المنشور'} aria-pressed={saved} className={`mr-auto rounded-xl border p-2 transition ${saved ? 'border-[var(--text)]/30 bg-[var(--text)]/10 text-[var(--text)]' : 'border-[var(--text)]/10 text-[var(--text)]/65 hover:bg-[var(--text)]/[0.04]'}`}><Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} /></button>
        </div>

        <p className="mb-2 text-xs font-semibold text-[var(--text)]/55">{(post.likes + Number(liked)).toLocaleString('en-US')} تفاعل مع هاد المنشور</p>
        {post.caption && (
          <p className="text-sm leading-7 text-[var(--text)]/85">
            <button type="button" onClick={() => navigate(`/profile/${post.author}`)} className="ml-1 font-semibold text-[var(--text)]">{post.author}</button>
            {captionIsLong && !expandedCaption ? `${post.caption.slice(0, 120)}…` : post.caption}
            {captionIsLong && <button type="button" onClick={() => setExpandedCaption((current) => !current)} className="mr-1 text-[var(--text)]/50">{expandedCaption ? 'أقل' : 'المزيد'}</button>}
          </p>
        )}
        {comments.length > 0 && (
          <div className="mt-2 space-y-1">
            {!showAllComments && comments.length > 2 && <button type="button" onClick={() => setShowAllComments(true)} className="text-sm text-[var(--text)]/50">شوف كل التعليقات ({comments.length})</button>}
            {displayedComments.map((comment) => <p key={comment.id} className="text-sm leading-5"><span className="ml-1 font-semibold">{comment.author}</span><span className="text-[var(--text)]/80">{comment.text}</span></p>)}
          </div>
        )}
        <form onSubmit={addComment} className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--text)]/[0.08] bg-black/15 px-3">
          <input id={`comment-input-${post.id}`} value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="زيد فكرة للنقاش..." aria-label="أضف تعليقاً" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text)]/40" />
          <button type="submit" disabled={!commentText.trim()} className="rounded-lg px-2 py-1 text-xs font-semibold text-[var(--text)] transition hover:bg-[var(--text)]/10 disabled:opacity-40">إرسال</button>
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
