import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ArrowLeftRight, Bell, CircleUserRound, Gamepad2, Heart, Loader2, MessageCircle, Search, Settings2, UserRound, UserRoundPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { DSLogo } from '@/components/icons/BrandIcons';
import Avatar from '@/components/Avatar';
import { getStoredLanguage, translate } from '@/lib/i18n';

interface ActivityItem {
  id: string;
  kind: 'follow' | 'like' | 'comment' | 'view';
  actor: string;
  actorId?: string;
  createdAt: string;
  description: string;
}

interface UserActivityRow {
  id: string;
  user_id: string;
  created_at: string;
}

export default function Navbar({ direction, onToggleDirection }: { direction: 'rtl' | 'ltr'; onToggleDirection: () => void }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const profileMenuAnchorRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [profileMenuPosition, setProfileMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const t = (key: Parameters<typeof translate>[1]) => translate(getStoredLanguage(), key);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [profileMenuOpen]);

  useLayoutEffect(() => {
    if (!profileMenuOpen) {
      setProfileMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchor = profileMenuAnchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const menuWidth = Math.min(200, window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
      setProfileMenuPosition({ top: rect.bottom + 8, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [profileMenuOpen]);

  useLayoutEffect(() => {
    const menu = profileMenuRef.current;
    const anchor = profileMenuAnchorRef.current;
    if (!profileMenuOpen || !profileMenuPosition || !menu || !anchor) return;

    const menuHeight = menu.getBoundingClientRect().height;
    const anchorTop = anchor.getBoundingClientRect().top;
    const top = profileMenuPosition.top + menuHeight > window.innerHeight - 8
      ? Math.max(8, anchorTop - menuHeight - 8)
      : profileMenuPosition.top;
    if (top !== profileMenuPosition.top) {
      setProfileMenuPosition({ ...profileMenuPosition, top });
    }
  }, [profileMenuOpen, profileMenuPosition]);

  useEffect(() => {
    const setOnlineStatus = () => setOnline(navigator.onLine);
    window.addEventListener('online', setOnlineStatus);
    window.addEventListener('offline', setOnlineStatus);
    return () => {
      window.removeEventListener('online', setOnlineStatus);
      window.removeEventListener('offline', setOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (!notificationsOpen || !user) return;
    let active = true;

    const loadActivities = async () => {
      setNotificationsLoading(true);
      setNotificationsError('');
      try {
        const [followResult, postResult, viewResult] = await Promise.all([
          supabase.from('follows').select('id, follower_id, created_at').eq('following_id', user.id).order('created_at', { ascending: false }).limit(12),
          supabase.from('posts').select('id').eq('user_id', user.id),
          supabase.from('profile_views').select('id, viewer_id, created_at').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(12),
        ]);
        const partialErrors: unknown[] = [];
        for (const [label, error] of [
          ['follows', followResult.error],
          ['posts', postResult.error],
          ['profile views', viewResult.error],
        ] as const) {
          if (error) {
            partialErrors.push(error);
            console.error(`Unable to load ${label} for notifications:`, error);
          }
        }

        const ownPostIds = (postResult.data ?? []).map((post) => post.id);
        let likeRows: UserActivityRow[] = [];
        let commentRows: UserActivityRow[] = [];
        if (ownPostIds.length) {
          const [likeResult, commentResult] = await Promise.all([
              supabase.from('likes').select('id, user_id, created_at').in('post_id', ownPostIds).neq('user_id', user.id).order('created_at', { ascending: false }).limit(12),
              supabase.from('comments').select('id, user_id, created_at').in('post_id', ownPostIds).neq('user_id', user.id).order('created_at', { ascending: false }).limit(12),
          ]);
          if (likeResult.error) {
            partialErrors.push(likeResult.error);
            console.error('Unable to load likes for notifications:', likeResult.error);
          } else {
            likeRows = (likeResult.data ?? []) as UserActivityRow[];
          }
          if (commentResult.error) {
            partialErrors.push(commentResult.error);
            console.error('Unable to load comments for notifications:', commentResult.error);
          } else {
            commentRows = (commentResult.data ?? []) as UserActivityRow[];
          }
        }

        const followerRows = (followResult.data ?? []) as { id: string; follower_id: string; created_at: string }[];
        const viewRows = (viewResult.data ?? []) as { id: string; viewer_id: string | null; created_at: string }[];
        const actorIds = [...new Set([
          ...followerRows.map((item) => item.follower_id),
          ...likeRows.map((item) => item.user_id),
          ...commentRows.map((item) => item.user_id),
          ...viewRows.map((item) => item.viewer_id).filter((id): id is string => Boolean(id)),
        ])];
        const profileResult = actorIds.length
          ? await supabase.from('profiles').select('id, username').in('id', actorIds)
          : { data: [] };
        if ('error' in profileResult && profileResult.error) {
          partialErrors.push(profileResult.error);
          console.error('Unable to load notification actor profiles:', profileResult.error);
        }
        const usernames = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile.username]));
        const nextActivities: ActivityItem[] = [
          ...followerRows.map((item) => ({ id: `follow-${item.id}`, kind: 'follow' as const, actor: usernames.get(item.follower_id) ?? 'مستخدم', actorId: item.follower_id, createdAt: item.created_at, description: 'بدأ بمتابعتك' })),
          ...likeRows.map((item) => ({ id: `like-${item.id}`, kind: 'like' as const, actor: usernames.get(item.user_id) ?? 'مستخدم', actorId: item.user_id, createdAt: item.created_at, description: 'أعجب بمنشورك' })),
          ...commentRows.map((item) => ({ id: `comment-${item.id}`, kind: 'comment' as const, actor: usernames.get(item.user_id) ?? 'مستخدم', actorId: item.user_id, createdAt: item.created_at, description: 'علّق على منشورك' })),
          ...viewRows.filter((item) => item.viewer_id).map((item) => ({ id: `view-${item.id}`, kind: 'view' as const, actor: usernames.get(item.viewer_id!) ?? 'مستخدم', actorId: item.viewer_id!, createdAt: item.created_at, description: 'زار ملفك الشخصي' })),
        ];

        nextActivities.sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
        if (active) {
          setActivities(nextActivities.slice(0, 20));
          setNotificationsError(partialErrors.length ? t('activityPartialError') : '');
        }
      } catch (error) {
        console.error('Unable to load notifications:', error);
        if (active) {
          setActivities([]);
          setNotificationsError(t('activityLoadError'));
        }
      } finally {
        if (active) setNotificationsLoading(false);
      }
    };

    void loadActivities();
    const refreshTimer = window.setInterval(() => void loadActivities(), 30_000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [notificationsOpen, user]);

  const activityIcon = (kind: ActivityItem['kind']) => {
    if (kind === 'follow') return <UserRoundPlus className="h-4 w-4 text-[var(--text)]" />;
    if (kind === 'like') return <Heart className="h-4 w-4 text-[var(--text)]" />;
    if (kind === 'comment') return <MessageCircle className="h-4 w-4 text-[var(--text)]" />;
    if (kind === 'view') return <CircleUserRound className="h-4 w-4 text-[var(--text)]" />;
    return <CircleUserRound className="h-4 w-4 text-[var(--text)]" />;
  };

  return (
    <header className="sticky top-0 z-30 h-[68px] border-b border-[var(--text)]/[0.08] bg-[var(--nav-bg)] px-3 backdrop-blur-2xl sm:px-6">
      <div className="mx-auto grid h-full max-w-[1500px] grid-cols-3 items-center" dir="ltr">
        <div className="relative justify-self-start" dir="rtl">
          <button
            type="button"
            onClick={() => setNotificationsOpen((open) => !open)}
            aria-label="فتح الإشعارات"
            aria-expanded={notificationsOpen}
            className={`relative grid h-10 w-10 place-items-center rounded-full border transition ${notificationsOpen ? 'border-[var(--text)]/35 bg-[var(--text)]/10 text-[var(--text)]' : 'border-[var(--text)]/10 bg-[var(--text)]/[0.03] text-[var(--text)]/70 hover:bg-[var(--text)]/[0.08] hover:text-[var(--text)]'}`}
          >
            <Bell className="h-[19px] w-[19px]" />
            {activities.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--text)] ring-2 ring-[var(--bg)]" />}
          </button>

          {notificationsOpen && (
            <section className="absolute left-0 top-12 z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-[var(--text)]/10 bg-[var(--surface)] text-right shadow-2xl" dir="rtl" aria-label="الإشعارات">
              <div className="flex items-center justify-between border-b border-[var(--text)]/[0.08] px-4 py-3">
                <h2 className="text-sm font-semibold text-[var(--text)]">الإشعارات</h2>
                <span className="text-[11px] text-[var(--text)]/40">أحدث النشاطات</span>
              </div>
              <div className="max-h-[min(420px,70vh)] overflow-y-auto">
                {notificationsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text)]/50">
                    <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل
                  </div>
                ) : (
                  <>
                    {notificationsError && <p role="alert" className="border-b border-[var(--error)]/10 px-4 py-2 text-[10px] leading-5 text-[var(--error)]">{notificationsError}</p>}
                    {activities.length === 0 ? (
                      <p className="px-4 py-8 text-center text-xs text-[var(--text)]/50">لا توجد نشاطات جديدة.</p>
                    ) : activities.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate(activity.actorId ? `/profile/${activity.actorId}` : '/feed');
                    }}
                    className="flex w-full items-start gap-3 border-b border-[var(--text)]/[0.06] px-4 py-3 text-right transition hover:bg-[var(--text)]/[0.04]"
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--text)]/[0.06]">{activityIcon(activity.kind)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs leading-5 text-[var(--text)]/85"><b className="font-semibold text-[var(--text)]">{activity.actor}</b> {activity.description}</span>
                      <time className="mt-1 block text-[10px] text-[var(--text)]/35">{new Intl.DateTimeFormat('ar-MA', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(activity.createdAt))}</time>
                    </span>
                  </button>
                    ))}
                  </>
                )}
              </div>
            </section>
          )}
        </div>

        <Link to="/search" aria-label="البحث" className="flex h-10 w-full max-w-[420px] items-center justify-self-center gap-3 rounded-xl border border-[var(--text)]/[0.08] bg-[var(--text)]/[0.035] px-3 text-right text-xs text-[var(--text)]/45 transition hover:border-[var(--text)]/25 hover:bg-[var(--text)]/[0.06]">
          <DSLogo size={24} />
          <Search className="h-4 w-4 shrink-0 text-[var(--text)]/70" />
          <span className="min-w-0 flex-1 truncate">ابحث عن أشخاص أو غرف أو مقاطع</span>
        </Link>

        <div className="flex items-center justify-self-end gap-1">
          <button
            type="button"
            onClick={onToggleDirection}
            aria-label={`تبديل الاتجاه إلى ${direction === 'rtl' ? 'LTR' : 'RTL'}`}
            title={`تبديل الاتجاه إلى ${direction === 'rtl' ? 'LTR' : 'RTL'}`}
            className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text)]/45 transition hover:bg-[var(--text)]/[0.06] hover:text-[var(--text)]"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
          <Link
          to="/games"
          dir="rtl"
          aria-label={`الألعاب، ${online ? 'متصل' : 'غير متصل'}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--text)]/10 bg-[var(--text)]/[0.03] px-3 text-[var(--text)]/80 transition hover:border-[var(--text)]/20 hover:bg-[var(--text)]/[0.07]"
          >
            <Gamepad2 className="h-[19px] w-[19px] text-[var(--text)]" />
            <span className="hidden text-xs font-medium sm:inline">الألعاب</span>
            <span className={`h-2 w-2 rounded-full ${online ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]/50'}`} />
            <span className="hidden text-[10px] text-[var(--text)]/45 md:inline">{online ? 'متصل' : 'أوفلاين'}</span>
          </Link>
          <div className="relative">
            <button
              ref={profileMenuAnchorRef}
              type="button"
              onClick={() => setProfileMenuOpen((open) => !open)}
              aria-label="قائمة الحساب"
              aria-expanded={profileMenuOpen}
              className="grid h-10 w-10 place-items-center rounded-full ring-1 ring-[var(--border)] transition hover:ring-[var(--accent)]"
            >
              <Avatar src={profile?.avatar_url} name={profile?.username ?? user?.email ?? 'مستخدم'} type={profile?.avatar_type} emoji={profile?.avatar_emoji} size={32} />
            </button>
            {profileMenuOpen && (
              profileMenuPosition && createPortal(
                <div
                  ref={profileMenuRef}
                  role="menu"
                  aria-label="قائمة الحساب"
                  dir="rtl"
                  style={{
                    position: 'fixed',
                    top: profileMenuPosition.top,
                    insetInlineStart: window.innerWidth - profileMenuPosition.left - 200,
                    width: '200px',
                  }}
                  className="z-[60] min-w-[200px] max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 text-right text-[var(--text)] shadow-[var(--shadow-lg)]"
                >
                  {profile && (
                    <Link role="menuitem" to={`/profile/${profile.id}`} onClick={() => setProfileMenuOpen(false)} className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-[var(--text)] transition hover:bg-[var(--accent-soft)]">
                      <UserRound className="h-4 w-4 text-[var(--accent)]" /> الملف الشخصي
                    </Link>
                  )}
                  <Link role="menuitem" to="/settings" onClick={() => setProfileMenuOpen(false)} className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-[var(--text)] transition hover:bg-[var(--accent-soft)]">
                    <Settings2 className="h-4 w-4 text-[var(--accent)]" /> الإعدادات
                  </Link>
                </div>,
                document.body
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
