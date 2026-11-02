import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import PostCard, { type PostCardPost } from '@/components/PostCard';
import { Link } from 'react-router-dom';
import { ArrowUpLeft, Plus } from 'lucide-react';
import { CreatePostModal } from '@/components/CreatePostModal';
import Avatar from '@/components/Avatar';
import { Button, Card } from '@/components/ui';

export default function FeedPage() {
  const { session, profile } = useAuth();
  const user = session?.user ?? null;
  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadFeed = async () => {
      try {
        setLoading(true);
        setFeedError(null);

        const { data, error } = await supabase
          .from('posts')
          .select('id, user_id, image_url, video_url, caption, created_at, likes_count, profiles:profiles(id, username, avatar_url)')
          .order('created_at', { ascending: false })
          .limit(40);

        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        const normalizedPosts: PostCardPost[] = (data ?? []).map((post) => {
          const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
          const videoUrl = typeof post.video_url === 'string' ? post.video_url : null;
          return {
            id: String(post.id),
            type: videoUrl ? 'video' : 'image',
            url: videoUrl ?? (typeof post.image_url === 'string' ? post.image_url : ''),
            userId: String(post.user_id),
            author: profile && typeof profile.username === 'string' ? profile.username : 'مستخدم',
            avatar: profile && typeof profile.avatar_url === 'string' ? profile.avatar_url : null,
            caption: typeof post.caption === 'string' ? post.caption : null,
            likes: Number(post.likes_count ?? 0),
            comments: [],
            createdAt: typeof post.created_at === 'string' ? post.created_at : new Date().toISOString(),
          };
        });

        setPosts(normalizedPosts);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error('Feed load error:', error);
        setFeedError('مشكل فالتحميل، عاود جرب');
        setPosts([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadFeed();
    return () => {
      isMounted = false;
    };
  }, [retryCount, user?.id]);

  return (
    <div className="min-h-[calc(100dvh-68px)] bg-[var(--bg)] text-[var(--text)]" dir="rtl">
      <div className="mx-auto w-full max-w-[760px] px-3 pb-24 pt-6 sm:px-6 sm:pt-8">
        <main className="mx-auto min-w-0 w-full max-w-[720px]" aria-label="موجز المجتمع">
          <header className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="mb-1 text-[11px] font-medium tracking-wide text-[var(--text)]/45">مساحة المجتمع</p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">الموجز</h1>
            </div>
            <Link to="/discover" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold text-[var(--text-muted)] transition hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)] hover:text-[var(--text)]">
              اكتشف <ArrowUpLeft className="h-4 w-4" />
            </Link>
          </header>

          <Card className="mb-6 p-3">
            <button type="button" onClick={() => setComposerOpen(true)} className="flex w-full items-center gap-3 rounded-xl text-right transition hover:bg-white/[0.03]">
              <Avatar src={profile?.avatar_url ?? null} name={profile?.username ?? user?.email ?? 'مستخدم'} size="sm" />
              <span className="min-w-0 flex-1 truncate py-2 text-sm text-[var(--text-muted)]">شارك فكرة أو لحظة مع المجتمع...</span>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)]"><Plus className="h-5 w-5" /></span>
            </button>
          </Card>

          {feedError && posts.length === 0 && !loading && (
            <Card role="alert" className="p-6 text-center">
              <p className="text-sm text-[var(--text-muted)]">{feedError}</p>
              <Button onClick={() => { setLoading(true); setRetryCount((count) => count + 1); }} className="mt-4">إعادة المحاولة</Button>
            </Card>
          )}

          {loading && (
            <div className="space-y-4" aria-label="جاري تحميل المنشورات" aria-busy="true">
              {Array.from({ length: 2 }, (_, index) => (
                <Card key={index} className="animate-pulse overflow-hidden p-4">
                  <div className="flex items-center gap-3"><span className="h-10 w-10 rounded-full bg-white/10" /><span className="h-3 w-28 rounded bg-white/10" /></div>
                  <div className="mt-4 aspect-[16/9] rounded-xl bg-white/[0.05]" />
                  <div className="mt-4 h-3 w-3/4 rounded bg-white/10" />
                </Card>
              ))}
            </div>
          )}

          {!loading && !feedError && posts.length === 0 && (
            <Card className="px-6 py-14 text-center">
              <p className="text-sm font-medium">الموجز هادئ حالياً</p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">كن أول من يشارك فكرة مع المجتمع.</p>
              <Button onClick={() => setComposerOpen(true)} className="mt-5">إنشاء منشور</Button>
            </Card>
          )}

          {!loading && posts.length > 0 && (
            <div className="space-y-4">
              {posts.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          )}
        </main>

      </div>

      <CreatePostModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onPostCreated={() => setRetryCount((count) => count + 1)}
      />
    </div>
  );
}
