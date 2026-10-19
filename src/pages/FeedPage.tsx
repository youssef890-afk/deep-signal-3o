import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import PostCard, { type PostCardPost } from '@/components/PostCard';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpLeft, Gamepad2, House, MessageCircle, Radio, Search, Sparkles, UsersRound } from 'lucide-react';

const videoUrls = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://www.w3schools.com/html/movie.mp4',
  'https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080.mp4',
  'https://videos.pexels.com/video-files/855885/855885-hd_1920_1080.mp4',
  'https://videos.pexels.com/video-files/856019/856019-hd_1920_1080.mp4',
];

export const MOCK_POSTS: PostCardPost[] = Array.from({ length: 20 }, (_, index) => {
  const isVideo = index >= 14;
  const seed = (index % 14) + 1;
  const username = `youssef_${index + 1}`;
  const createdAt = new Date(Date.now() - (index + 1) * 47 * 60 * 1000).toISOString();

  return {
    id: `mock-${index + 1}`,
    type: isVideo ? 'video' : 'image',
    url: isVideo ? videoUrls[index - 14] : `https://picsum.photos/seed/${seed}/800/800`,
    userId: `mock-user-${index + 1}`,
    author: username,
    avatar: `https://picsum.photos/seed/avatar-${seed}/128/128`,
    caption: index % 2 === 0
      ? 'لحظات صغيرة كتخلي النهار أجمل. شاركوني أجمل لقطة عندكم اليوم ✨'
      : 'نهار جديد، أماكن جديدة، وذكريات كتستاهل تبقى. 🌿',
    likes: 1234 + index * 37,
    comments: [
      { id: `comment-${index}-1`, author: 'sara', text: 'زوين بزاف 😍' },
      { id: `comment-${index}-2`, author: 'amine', text: 'فين هاد البلاصة؟' },
      { id: `comment-${index}-3`, author: 'meryem', text: 'التصويرة رائعة!' },
    ],
    createdAt,
  };
});

const suggestions = ['lina.photo', 'omar_travels', 'sara.art', 'mehdi.fit', 'nour.daily'];

export default function FeedPage() {
  const { session } = useAuth();
  const user = session?.user ?? null;
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostCardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [followedSuggestions, setFollowedSuggestions] = useState<string[]>([]);

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

        setPosts(normalizedPosts.length > 0 ? normalizedPosts : MOCK_POSTS);
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
    <div className="min-h-screen text-white" dir="rtl">
      <div className="mx-auto w-full max-w-[1380px] px-3 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
        <header
          className="relative mb-6 overflow-hidden border-y border-white/10 bg-[#0b1217] px-5 py-7 sm:px-8 sm:py-9"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        >
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="mb-3 font-mono text-[10px] font-semibold text-[#b9e978]">DEEP-SIGNAL <span className="text-white/30">/</span> مساحة المجتمع</p>
              <h1 className="font-serif text-3xl font-bold sm:text-4xl">الأفكار كتجمعنا</h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/60">موجز هادئ باش تكتشف نقاشات الناس، تدخل لغرفة صوتية، ولا تلقى موضوع جديد يهمك.</p>
            </div>
            <Link to="/discover" className="inline-flex min-h-10 items-center justify-center gap-2 self-start border-r-2 border-[#b9e978] bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.08] lg:self-auto">
              اكتشف المجتمع <ArrowUpLeft className="h-4 w-4 text-[#b9e978]" />
            </Link>
          </div>
        </header>

        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-white/65">المساحات الرئيسية</h2>
          <span className="font-mono text-[10px] text-white/35">06 MODULES</span>
        </div>
        <nav className="mb-8 grid grid-cols-2 gap-x-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="المساحات الرئيسية">
          {[
            { to: '/feed', label: 'الرئيسية', detail: 'موجز المجتمع', Icon: House, tone: 'text-cyan-200' },
            { to: '/search', label: 'البحث', detail: 'اعثر على موضوع', Icon: Search, tone: 'text-[#b9e978]' },
            { to: '/games', label: 'الألعاب', detail: 'العب وتواصل', Icon: Gamepad2, tone: 'text-amber-200' },
            { to: '/rooms', label: 'الغرف الصوتية', detail: 'حوار مباشر', Icon: Radio, tone: 'text-rose-200' },
            { to: '/jokal', label: 'تخطيط الأفكار', detail: 'رتب فكرتك', Icon: Sparkles, tone: 'text-violet-200' },
            { to: '/chat', label: 'الرسائل', detail: 'تابع محادثاتك', Icon: MessageCircle, tone: 'text-sky-200' },
          ].map(({ to, label, detail, Icon, tone }) => (
            <Link key={to} to={to} className="group flex min-h-[76px] min-w-0 items-center gap-3 border-t border-white/[0.1] px-3 py-3 transition-colors hover:bg-white/[0.04]">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/[0.045] ${tone}`}><Icon className="h-[18px] w-[18px]" /></span>
              <span className="min-w-0"><span className="block truncate text-xs font-semibold text-white/90">{label}</span><span className="mt-1 block truncate text-[10px] text-white/40">{detail}</span></span>
            </Link>
          ))}
        </nav>

        <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="min-w-0" aria-label="موجز المجتمع">
            <div className="mb-4 flex items-end justify-between gap-3 px-1">
              <div><h2 className="text-lg font-bold">منشورات المجتمع</h2><p className="mt-1 text-xs text-white/45">آخر الأفكار واللحظات اللي تشاركات</p></div>
              <span className="hidden items-center gap-2 text-xs text-white/45 sm:inline-flex"><span className="h-2 w-2 rounded-full bg-cyan-300" /> موجز جديد</span>
            </div>
            {feedError && posts.length === 0 && !loading && (
              <div role="alert" className="rounded-2xl border border-rose-400/20 bg-[#111827] p-6 text-center">
                <p className="text-sm text-rose-200">{feedError}</p>
                <button type="button" onClick={() => { setLoading(true); setRetryCount((count) => count + 1); }} className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold transition hover:scale-[1.02] hover:bg-white/15">إعادة المحاولة</button>
              </div>
            )}

            {loading && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2" aria-label="جاري تحميل المنشورات">
                {Array.from({ length: 2 }, (_, index) => (
                  <article key={index} className="animate-pulse overflow-hidden rounded-[22px] border border-white/10 bg-[#111827]">
                    <div className="flex h-16 items-center gap-3 px-4"><span className="h-10 w-10 rounded-2xl bg-white/10" /><span className="h-3 w-28 rounded bg-white/10" /></div>
                    <div className="aspect-[4/3] bg-white/[0.06]" />
                    <div className="space-y-3 p-3"><div className="h-5 w-24 rounded bg-white/10" /><div className="h-3 w-3/4 rounded bg-white/10" /></div>
                  </article>
                ))}
              </div>
            )}

            {!loading && !feedError && posts.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#111827] p-10 text-center text-sm text-white/60">ما كاين حتى منشور دابا</div>
            )}

            {!loading && posts.length > 0 && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {posts.map((post) => <PostCard key={post.id} post={post} />)}
              </div>
            )}
          </section>

          <aside className="hidden min-w-0 xl:block" aria-label="اقتراحات المتابعة">
            <div className="sticky top-[88px] space-y-5">
              <section className="rounded-2xl border border-white/10 bg-[#101827]/90 p-4">
                <div className="mb-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-400/10 text-violet-200"><UsersRound className="h-4 w-4" /></span><h2 className="text-sm font-bold">وجوه جديدة</h2></div>
                <p className="mb-4 text-xs leading-5 text-white/45">ناس عندهم اهتمامات قريبة من مجتمعك.</p>
                <div className="space-y-4">
                  {suggestions.map((username, index) => {
                    const isFollowed = followedSuggestions.includes(username);
                    return (
                      <div key={username} className="flex min-w-0 items-center gap-2" dir="rtl">
                        <button type="button" onClick={() => navigate(`/profile/${username}`)} className="h-9 w-9 shrink-0 rounded-full ring-1 ring-white/10 transition hover:scale-105">
                          <img src={`https://picsum.photos/seed/suggestion-${index}/96/96`} alt="" className="h-full w-full rounded-full object-cover" />
                        </button>
                        <button type="button" onClick={() => navigate(`/profile/${username}`)} className="min-w-0 flex-1 truncate text-right text-xs font-semibold">{username}</button>
                        <button type="button" onClick={() => setFollowedSuggestions((current) => isFollowed ? current.filter((name) => name !== username) : [...current, username])} className={`shrink-0 text-xs font-bold transition hover:scale-105 ${isFollowed ? 'text-white/55' : 'text-sky-300'}`}>{isFollowed ? 'متابَع' : 'متابعة'}</button>
                      </div>
                    );
                  })}
                </div>
              </section>
              <footer className="px-2 text-[11px] leading-6 text-white/35">
                <nav className="flex flex-wrap gap-x-2" aria-label="روابط مساعدة">
                  <a href="#about" className="hover:text-white/60">حول</a><a href="#help" className="hover:text-white/60">مساعدة</a><a href="#privacy" className="hover:text-white/60">خصوصية</a><a href="#terms" className="hover:text-white/60">شروط</a>
                </nav>
                <p className="mt-2">© 2026 Deep-Signal</p>
              </footer>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
