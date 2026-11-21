import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import PostCard, { type PostCardPost } from '@/components/PostCard';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpLeft, Compass, Image, Mic2, Plus, Smile, Sparkles, Video } from 'lucide-react';
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
  const location = useLocation();
  const navigate = useNavigate();
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
  const communityProfiles = [...onlineProfiles, ...recentProfiles]
    .filter((person, index, profiles) => person.id !== user?.id && profiles.findIndex((item) => item.id === person.id) === index)
    .slice(0, 12);

  useEffect(() => {
    const openComposer = () => setComposerOpen(true);
    window.addEventListener('ds:create-post', openComposer);
    return () => window.removeEventListener('ds:create-post', openComposer);
  }, []);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('compose') !== '1') return;
    setComposerOpen(true);
    navigate('/feed', { replace: true });
  }, [location.search, navigate]);

  useEffect(() => {
    let isMounted = true;

    const loadFeed = async () => {
      try {
        setLoading(true);
        setFeedError(null);

        const { data, error } = await supabase
          .from('posts')
          .select('id, user_id, post_type, image_url, video_url, media_urls, caption, created_at, likes(count), comments_count:comments(count), comments(id, user_id, content, created_at, profiles:profiles(username)), profiles:profiles(id, username, full_name, avatar_url, avatar_type, avatar_emoji)')
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
            supabase.from('saved_posts').select('post_id').eq('user_id', user.id).in('post_id', postIds),
          ]);
          if (likesResult.error) throw likesResult.error;
          if (bookmarksResult.error) throw bookmarksResult.error;
          likedPostIds = new Set((likesResult.data ?? []).map((like) => String(like.post_id)));
          savedPostIds = new Set((bookmarksResult.data ?? []).map((bookmark) => String(bookmark.post_id)));
        }

        if (!isMounted) return;

        const normalizedPosts: PostCardPost[] = (data ?? []).map((post) => {
          const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
          const videoUrl = typeof post.video_url === 'string' ? post.video_url : null;
          const imageUrl = typeof post.image_url === 'string' ? post.image_url : null;
          const mediaUrls = Array.isArray(post.media_urls)
            ? post.media_urls.filter((url): url is string => typeof url === 'string' && Boolean(url.trim()))
            : [];
          const imageUrls = imageUrl || post.post_type === 'image' ? mediaUrls.length > 0 ? mediaUrls : imageUrl ? [imageUrl] : [] : [];
          const postComments = Array.isArray(post.comments) ? post.comments : [];
          const commentCount = Array.isArray(post.comments_count)
            ? Number(post.comments_count[0]?.count ?? 0)
            : 0;
          const likesCount = Array.isArray(post.likes) ? Number(post.likes[0]?.count ?? 0) : 0;
          return {
            id: String(post.id),
            type: videoUrl ? 'video' : imageUrls.length > 0 ? 'image' : post.post_type === 'audio' ? 'audio' : 'text',
            url: videoUrl ?? imageUrls[0] ?? (post.post_type === 'audio' && mediaUrls[0] ? mediaUrls[0] : null),
            mediaUrls: imageUrls,
            userId: String(post.user_id),
            author: profile && typeof profile.full_name === 'string' && profile.full_name.trim() ? profile.full_name : profile && typeof profile.username === 'string' ? profile.username : 'مستخدم',
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
    <div className="relative isolate min-h-[calc(100dvh_-_var(--desktop-header-height))] overflow-x-clip bg-[var(--bg)] text-[var(--text)]" dir="rtl">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[560px] overflow-hidden">
        <span className="absolute -top-40 start-[10%] h-96 w-96 rounded-full bg-[var(--accent)]/10 blur-[120px]" />
        <span className="absolute top-40 end-[18%] h-72 w-72 rounded-full bg-[var(--accent)]/[0.06] blur-[110px]" />
        <span className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-[var(--bg)]" />
      </div>
      <div className="relative z-10 mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-5 px-3 pb-10 pt-5 sm:gap-6 sm:px-6 sm:pt-6 xl:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[250px_minmax(0,1fr)_280px] 2xl:gap-6">
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

        <main className="mx-auto min-w-0 w-full max-w-[860px]" aria-label="موجز المجتمع">
          <header className="mb-5 flex items-center justify-between gap-4 px-1 sm:mb-6">
            <div className="min-w-0">
              <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-violet-300/75">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,.8)]" />
                Deep-Signal
              </p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">الموجز</h1>
            </div>
            <Link to="/discover" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-400/[0.06] px-4 text-xs font-semibold text-violet-100/80 transition hover:border-violet-300/30 hover:bg-violet-400/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
              اكتشف <ArrowUpLeft className="h-4 w-4" />
            </Link>
          </header>

          <Card className="mb-5 overflow-hidden rounded-3xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(18,16,28,.98),rgba(12,12,18,.98))] p-4 shadow-[0_16px_44px_rgba(0,0,0,.24)] sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <h2 className="text-sm font-bold tracking-tight">أعضاء المجتمع</h2>
                <p className="mt-1 text-[11px] text-white/45">حسابات حقيقية من مجتمع Deep-Signal</p>
              </div>
              <Link to="/discover" className="text-[11px] font-semibold text-violet-300 transition hover:text-violet-200">عرض الكل</Link>
            </div>
            <div className="flex snap-x gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button type="button" onClick={() => setComposerOpen(true)} className="flex w-[88px] shrink-0 snap-start flex-col items-center gap-2 rounded-xl p-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
                <span className="relative grid h-[68px] w-[68px] place-items-center rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-blue-500 p-[2px]">
                  <span className="grid h-full w-full place-items-center rounded-full bg-[#101018]">
                    <Avatar src={profile?.avatar_url} name={profile?.full_name ?? profile?.username ?? user?.email ?? 'مستخدم'} type={profile?.avatar_type} emoji={profile?.avatar_emoji} size={54} />
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-[#101018] bg-violet-500 text-white"><Plus className="h-3.5 w-3.5" /></span>
                </span>
                <span className="max-w-full truncate text-[11px] font-medium text-white/80">منشور جديد</span>
              </button>
              {communityProfiles.map((person) => {
                const name = person.full_name?.trim() || person.username?.trim() || 'مستخدم';
                const online = onlineIds.includes(person.id);
                return (
                  <Link key={person.id} to={`/profile/${person.id}`} className="flex w-[88px] shrink-0 snap-start flex-col items-center gap-2 rounded-xl p-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
                    <span className={`grid h-[68px] w-[68px] place-items-center rounded-full p-[2px] ${online ? 'bg-gradient-to-br from-violet-500 via-fuchsia-500 to-blue-500' : 'bg-white/15'}`}>
                      <span className="grid h-full w-full place-items-center rounded-full bg-[#101018] p-[3px]">
                        <Avatar src={person.avatar_url} name={name} type={person.avatar_type} emoji={person.avatar_emoji} size={56} showStatus online={online} />
                      </span>
                    </span>
                    <span className="max-w-full truncate text-[11px] font-medium text-white/80">{name}</span>
                  </Link>
                );
              })}
              {communityProfiles.length === 0 && !recentProfilesLoading && (
                <p className="flex min-h-[96px] min-w-[220px] items-center justify-center text-xs text-white/45">ستظهر حسابات المجتمع هنا عند توفرها.</p>
              )}
              {recentProfilesLoading && <span aria-label="جارٍ تحميل الأعضاء" className="h-[68px] w-[68px] shrink-0 animate-pulse rounded-full bg-white/[0.06]" />}
            </div>
          </Card>

          <Card className="my-5 rounded-3xl border border-violet-300/[0.12] bg-[linear-gradient(145deg,rgba(17,16,25,.98),rgba(12,12,18,.98))] p-4 shadow-[0_16px_44px_rgba(0,0,0,.22)] transition duration-200 hover:border-violet-300/20 focus-within:border-violet-400/35 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="shrink-0 rounded-full bg-gradient-to-br from-violet-400/80 via-fuchsia-400/70 to-indigo-400/70 p-[2px]">
                <span className="block rounded-full bg-[#101018] p-[2px]">
                  <Avatar src={profile?.avatar_url} name={profile?.full_name ?? profile?.username ?? user?.email ?? 'مستخدم'} type={profile?.avatar_type} emoji={profile?.avatar_emoji} size={38} showStatus online />
                </span>
              </span>
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="min-h-12 min-w-0 flex-1 rounded-2xl border border-white/[0.07] bg-black/25 px-5 py-3 text-right text-sm leading-6 text-white/50 transition duration-200 hover:border-violet-300/20 hover:bg-black/35 focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                شارك فكرة مع المجتمع...
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.07] pt-3">
              <div className="flex items-center gap-1">
                {[
                  { label: 'إضافة صورة', Icon: Image },
                  { label: 'إضافة فيديو', Icon: Video },
                  { label: 'إضافة رمز تعبيري', Icon: Smile },
                ].map(({ label, Icon }) => (
                  <button key={label} type="button" onClick={() => setComposerOpen(true)} aria-label={label} className="grid h-9 w-9 place-items-center rounded-xl text-[var(--text)]/55 transition duration-200 hover:bg-white/[0.06] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
                    <Icon className="h-4 w-4 text-violet-300" />
                  </button>
                ))}
                <button type="button" onClick={() => setComposerOpen(true)} aria-label="إضافة منشور" className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-white transition duration-200 hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button onClick={() => setComposerOpen(true)} className="h-9 rounded-xl bg-violet-600 px-5 text-xs text-white hover:bg-violet-500">إنشاء منشور</Button>
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
