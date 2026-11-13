import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import PostCard, { type PostCardPost } from '@/components/PostCard';
import { Link } from 'react-router-dom';
import { ArrowUpLeft, Compass, Gamepad2, Image, Mic2, Plus, Smile, Sparkles, Video } from 'lucide-react';
import { CreatePostModal } from '@/components/CreatePostModal';
import Avatar from '@/components/Avatar';
import { Button, Card } from '@/components/ui';
import { useOnlinePresenceProfiles, useOnlineUsers, type PresenceProfile } from '@/hooks/useOnlinePresence';

function PresencePerson({ profile, online, status, dimmed = false }: {
  profile: PresenceProfile;
  online: boolean;
  status?: string;
  dimmed?: boolean;
}) {
  const name = profile.full_name?.trim() || profile.username?.trim() || 'مستخدم';

  return (
    <Link
      to={`/profile/${profile.id}`}
      className={`flex min-w-0 items-center gap-2.5 rounded-xl px-2 py-2 transition duration-200 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${dimmed ? 'opacity-45 grayscale' : ''}`}
    >
      <Avatar
        src={profile.avatar_url}
        name={name}
        type={profile.avatar_type}
        emoji={profile.avatar_emoji}
        size={34}
        showStatus={online}
        online={online}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold">{name}</span>
        {status && <span className="mt-0.5 block text-[10px] text-[var(--text)]/45">{status}</span>}
      </span>
    </Link>
  );
}

export default function FeedPage() {
  const { session, profile } = useAuth();
  const user = session?.user ?? null;
  const { onlineIds } = useOnlineUsers();
  const {
    onlineProfiles,
    recentProfiles,
    recentProfilesLoading,
    recentProfilesError,
  } = useOnlinePresenceProfiles();
  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const otherOnlineIds = onlineIds.filter((id) => id !== user?.id);
  const onlineProfilesById = new Map(onlineProfiles.map((onlineProfile) => [onlineProfile.id, onlineProfile]));
  const getOnlinePerson = (id: string): PresenceProfile => (
    onlineProfilesById.get(id) ?? {
      id,
      username: null,
      full_name: null,
      avatar_url: null,
      avatar_type: null,
      avatar_emoji: null,
    }
  );
  const activePeople = otherOnlineIds.slice(0, 8).map(getOnlinePerson);
  const memberOnlinePeople = otherOnlineIds.map(getOnlinePerson);
  const offlinePeople = recentProfiles
    .filter((recentProfile) => recentProfile.id !== user?.id && !onlineIds.includes(recentProfile.id))
    .slice(0, 30);

  useEffect(() => {
    let isMounted = true;

    const loadFeed = async () => {
      try {
        setLoading(true);
        setFeedError(null);

        const { data, error } = await supabase
          .from('posts')
          .select('id, user_id, post_type, image_url, video_url, audio_url, caption, created_at, likes(count), comments_count:comments(count), comments(id, user_id, content, created_at, profiles:profiles(username)), profiles:profiles(id, username, avatar_url)')
          .order('created_at', { ascending: false })
          .limit(2, { foreignTable: 'comments' })
          .limit(40);

        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        const postIds = (data ?? []).map((post) => String(post.id));
        let likedPostIds = new Set<string>();
        let savedPostIds = new Set<string>();
        if (user?.id && postIds.length > 0) {
          const [likesResult, bookmarksResult] = await Promise.all([
            supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
            supabase.from('post_bookmarks').select('post_id').eq('user_id', user.id).in('post_id', postIds),
          ]);
          if (likesResult.error) throw likesResult.error;
          if (bookmarksResult.error) throw bookmarksResult.error;
          likedPostIds = new Set((likesResult.data ?? []).map((like) => String(like.post_id)));
          savedPostIds = new Set((bookmarksResult.data ?? []).map((bookmark) => String(bookmark.post_id)));
        }

        if (!isMounted) return;

        const normalizedPosts: PostCardPost[] = (data ?? []).map((post) => {
          const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
          const audioUrl = typeof post.audio_url === 'string' ? post.audio_url : null;
          const videoUrl = typeof post.video_url === 'string' ? post.video_url : null;
          const imageUrl = typeof post.image_url === 'string' ? post.image_url : null;
          const postComments = Array.isArray(post.comments) ? post.comments : [];
          const commentCount = Array.isArray(post.comments_count)
            ? Number(post.comments_count[0]?.count ?? 0)
            : 0;
          const likesCount = Array.isArray(post.likes) ? Number(post.likes[0]?.count ?? 0) : 0;
          return {
            id: String(post.id),
            type: audioUrl ? 'audio' : videoUrl ? 'video' : imageUrl ? 'image' : 'text',
            url: audioUrl ?? videoUrl ?? imageUrl,
            userId: String(post.user_id),
            author: profile && typeof profile.username === 'string' ? profile.username : 'مستخدم',
            avatar: profile && typeof profile.avatar_url === 'string' ? profile.avatar_url : null,
            caption: typeof post.caption === 'string' ? post.caption : null,
            likes: likesCount,
            commentCount,
            likedByCurrentUser: likedPostIds.has(String(post.id)),
            savedByCurrentUser: savedPostIds.has(String(post.id)),
            comments: postComments.map((comment) => {
              const commentProfile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
              return {
                id: String(comment.id),
                userId: String(comment.user_id),
                author: commentProfile?.username ?? 'مستخدم',
                text: String(comment.content),
              };
            }),
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

  useEffect(() => {
    if (loading || !window.location.hash.startsWith('#post-')) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [loading, posts]);

  return (
    <div className="relative isolate min-h-[calc(100dvh-68px)] overflow-x-clip bg-[var(--bg)] text-[var(--text)]" dir="rtl">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[560px] overflow-hidden">
        <span className="absolute -top-40 start-[10%] h-96 w-96 rounded-full bg-[var(--accent)]/10 blur-[120px]" />
        <span className="absolute top-40 end-[18%] h-72 w-72 rounded-full bg-[var(--accent)]/[0.06] blur-[110px]" />
        <span className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-[var(--bg)]" />
      </div>
      <div className="relative z-10 mx-auto grid w-full max-w-[1320px] grid-cols-1 gap-6 px-4 pb-24 pt-3 sm:px-6 sm:pt-5 xl:grid-cols-[minmax(0,680px)_320px] xl:gap-6 2xl:grid-cols-[260px_minmax(0,680px)_300px] 2xl:gap-5">
        <aside className="hidden 2xl:block">
          <div className="sticky top-[88px] space-y-4">
            <Card className="rounded-2xl border border-white/10 bg-[var(--surface)] p-3">
              <h2 className="px-2 text-sm font-bold">متصل — {otherOnlineIds.length.toLocaleString('ar')}</h2>
              <div className="mt-2 max-h-[360px] space-y-0.5 overflow-y-auto">
                {memberOnlinePeople.length > 0 ? memberOnlinePeople.map((person) => (
                  <PresencePerson key={person.id} profile={person} online />
                )) : <p className="px-2 py-3 text-xs text-[var(--text)]/45">لا أحد نشط الآن</p>}
              </div>
            </Card>
            <Card className="rounded-2xl border border-white/10 bg-[var(--surface)] p-3">
              <h2 className="px-2 text-sm font-bold">غير متصل — {offlinePeople.length.toLocaleString('ar')}</h2>
              <div className="mt-2 max-h-[280px] space-y-0.5 overflow-y-auto">
                {offlinePeople.length > 0 ? offlinePeople.map((person) => (
                  <PresencePerson key={person.id} profile={person} online={false} dimmed />
                )) : recentProfilesError ? (
                  <p role="alert" className="px-2 py-3 text-xs text-[var(--text)]/45">تعذر تحميل الأعضاء</p>
                ) : recentProfilesLoading ? (
                  <div aria-label="جارٍ تحميل الأعضاء" className="space-y-3 px-2 py-3">
                    <span className="block h-8 animate-pulse rounded-lg bg-white/[0.05]" />
                    <span className="block h-8 animate-pulse rounded-lg bg-white/[0.05]" />
                  </div>
                ) : <p className="px-2 py-3 text-xs text-[var(--text)]/45">لا يوجد أعضاء غير متصلين</p>}
              </div>
            </Card>
          </div>
        </aside>

        <main className="mx-auto min-w-0 w-full max-w-[680px]" aria-label="موجز المجتمع">
          <header className="sticky top-[68px] z-20 -mx-3 border-b border-white/[0.08] bg-[var(--bg)]/85 px-3 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent)]/15 to-[var(--surface)] text-[var(--accent)] shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                  <Compass className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-[var(--text)]/45">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
                    مساحة المجتمع
                  </p>
                  <h1 className="text-xl font-bold tracking-tight sm:text-2xl">الموجز</h1>
                </div>
              </div>
              <Link to="/discover" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 text-xs font-semibold text-[var(--text-muted)] shadow-sm transition duration-200 hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/10 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                اكتشف <ArrowUpLeft className="h-4 w-4" />
              </Link>
            </div>
          </header>

          <div role="tablist" aria-label="تصنيفات الموجز" className="mx-auto mt-3 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-[var(--surface)]/90 p-1 shadow-[0_10px_30px_rgba(0,0,0,0.16)]">
            <button type="button" role="tab" aria-selected="true" className="shrink-0 rounded-full bg-[var(--accent)] px-5 py-2 text-xs font-bold text-[var(--accent-foreground)] shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">الكل</button>
            <button type="button" role="tab" aria-selected="false" className="shrink-0 rounded-full px-5 py-2 text-xs font-medium text-[var(--text)]/55 transition duration-200 hover:bg-white/[0.06] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">المتابَعون</button>
            <button type="button" role="tab" aria-selected="false" className="shrink-0 rounded-full px-5 py-2 text-xs font-medium text-[var(--text)]/55 transition duration-200 hover:bg-white/[0.06] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">الأحدث</button>
          </div>

          <Card className="my-4 rounded-2xl border border-white/10 bg-[var(--surface)] p-3 shadow-[0_18px_48px_rgba(0,0,0,0.16)] transition duration-200 hover:border-white/15 focus-within:border-[var(--accent)]/25 sm:p-4">
            <div className="flex items-start gap-3">
              <Avatar src={profile?.avatar_url} name={profile?.username ?? user?.email ?? 'مستخدم'} type={profile?.avatar_type} emoji={profile?.avatar_emoji} size={40} />
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/[0.07] bg-black/10 px-4 py-3 text-right text-sm leading-6 text-[var(--text-muted)] transition duration-200 hover:border-white/15 hover:bg-black/15 focus:min-h-20 focus:border-[var(--accent)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                شارك فكرة أو لحظة مع المجتمع...
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
              <div className="flex items-center gap-1">
                {[
                  { label: 'إضافة صورة', Icon: Image },
                  { label: 'إضافة فيديو', Icon: Video },
                  { label: 'إضافة رمز تعبيري', Icon: Smile },
                ].map(({ label, Icon }) => (
                  <button key={label} type="button" onClick={() => setComposerOpen(true)} aria-label={label} className="grid h-9 w-9 place-items-center rounded-xl text-[var(--text)]/55 transition duration-200 hover:bg-white/[0.06] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
                <button type="button" onClick={() => setComposerOpen(true)} aria-label="إضافة منشور" className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] transition duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button onClick={() => setComposerOpen(true)} className="h-9 rounded-xl px-5 text-xs">نشر</Button>
            </div>
          </Card>

          {feedError && posts.length === 0 && !loading && (
            <Card role="alert" className="p-6 text-center">
              <p className="text-sm text-[var(--text-muted)]">{feedError}</p>
              <Button onClick={() => { setLoading(true); setRetryCount((count) => count + 1); }} className="mt-4">إعادة المحاولة</Button>
            </Card>
          )}

          {loading && (
            <div className="space-y-4" aria-label="جاري تحميل المنشورات" aria-busy="true">
              {Array.from({ length: 3 }, (_, index) => (
                <Card key={index} className="animate-pulse overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface)] p-4">
                  <div className="flex items-center gap-3"><span className="h-11 w-11 rounded-full bg-white/10" /><span className="space-y-2"><span className="block h-3 w-28 rounded bg-white/10" /><span className="block h-2 w-20 rounded bg-white/[0.06]" /></span></div>
                  <div className="mt-4 h-3 w-3/4 rounded bg-white/10" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-white/[0.06]" />
                  <div className="mt-4 aspect-video rounded-xl bg-white/[0.05]" />
                  <div className="mt-4 h-8 rounded-xl bg-white/[0.04]" />
                </Card>
              ))}
            </div>
          )}

          {!loading && !feedError && posts.length === 0 && (
            <Card className="rounded-2xl border border-white/10 bg-[var(--surface)] px-6 py-14 text-center">
              <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]"><Compass className="h-5 w-5" /></span>
              <p className="text-sm font-medium">الموجز هادئ حالياً</p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">كن أول من يشارك فكرة مع المجتمع.</p>
              <Button onClick={() => setComposerOpen(true)} className="mt-5">إنشاء منشور</Button>
            </Card>
          )}

          {!loading && posts.length > 0 && (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id ?? null}
                  currentUsername={profile?.username ?? 'أنت'}
                  onEngagementChanged={() => setRetryCount((count) => count + 1)}
                />
              ))}
            </div>
          )}
        </main>

        <aside className="hidden xl:block">
          <div className="sticky top-[88px] space-y-4">
            <Card className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4">
              <h2 className="mb-4 text-sm font-bold">نشط الآن</h2>
              {activePeople.length > 0 ? (
                <div className="space-y-0.5">
                  {activePeople.map((person) => <PresencePerson key={person.id} profile={person} online status="متصل الآن" />)}
                </div>
              ) : (
                <div className="rounded-xl bg-white/[0.03] px-3 py-4 text-center text-xs text-[var(--text)]/50">لا أحد نشط الآن</div>
              )}
            </Card>

            <Card className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4">
              <h2 className="mb-3 text-sm font-bold">غرف مباشرة</h2>
              <Link to="/rooms" className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3 text-xs text-[var(--text)]/75 transition duration-200 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                <span>استكشف الغرف الصوتية</span>
              </Link>
            </Card>

            <Card className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4">
              <h2 className="mb-3 text-sm font-bold">اختصارات</h2>
              <nav className="space-y-1">
                <Link to="/games" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-[var(--text)]/70 transition duration-200 hover:bg-white/[0.06] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"><Gamepad2 className="h-4 w-4 text-[var(--accent)]" />الألعاب</Link>
                <Link to="/rooms" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-[var(--text)]/70 transition duration-200 hover:bg-white/[0.06] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"><Mic2 className="h-4 w-4 text-[var(--accent)]" />الغرف الصوتية</Link>
                <Link to="/jokal" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-[var(--text)]/70 transition duration-200 hover:bg-white/[0.06] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"><Sparkles className="h-4 w-4 text-[var(--accent)]" />مساعد Signal</Link>
              </nav>
            </Card>
          </div>
        </aside>
      </div>

      <CreatePostModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onPostCreated={() => setRetryCount((count) => count + 1)}
      />
    </div>
  );
}
