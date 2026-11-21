import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ArrowLeftRight, BadgeCheck, Bell, CircleUserRound, Gamepad2, Heart, Loader2, MessageCircle, MessagesSquare, Radio, Search, Settings2, Sparkles, UserRound, UserRoundPlus, Video, WandSparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { DSLogo } from '@/components/icons/BrandIcons';
import Avatar from '@/components/Avatar';
import { getStoredLanguage, translate } from '@/lib/i18n';
import { useMessages } from '@/context/MessagesContext';
import { appFeatures } from '@/lib/appFeatures';

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
  const { unreadCount } = useMessages();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const notificationTriggerRef = useRef<HTMLButtonElement>(null);
  const notificationsPanelRef = useRef<HTMLElement>(null);
  const profileMenuAnchorRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [profileMenuPosition, setProfileMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const t = (key: Parameters<typeof translate>[1]) => translate(getStoredLanguage(), key);

  useEffect(() => {
    const openNotifications = () => setNotificationsOpen(true);
    const toggleNotifications = () => setNotificationsOpen((open) => !open);
    window.addEventListener('ds:open-notifications', openNotifications);
    window.addEventListener('ds:toggle-notifications', toggleNotifications);
    return () => {
      window.removeEventListener('ds:open-notifications', openNotifications);
      window.removeEventListener('ds:toggle-notifications', toggleNotifications);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ds:notifications-state', { detail: { open: notificationsOpen } }));
  }, [notificationsOpen]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (notificationsPanelRef.current?.contains(target) || notificationTriggerRef.current?.contains(target)) return;
      setNotificationsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotificationsOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [notificationsOpen]);

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
    <header className="sticky top-0 z-30 h-[var(--desktop-header-height)] border-b border-white/[0.08] bg-[var(--bg)]/95 px-3 backdrop-blur-2xl sm:px-6">
      <div className="mx-auto flex h-full max-w-[1500px] items-center justify-between gap-3" dir="ltr">
        <Link to="/feed" className="flex min-w-0 items-center gap-3" aria-label="Deep-Signal, home">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-blue-500/10 shadow-[0_0_26px_rgba(124,58,237,.16)]">
            <DSLogo size={36} />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-[17px] font-bold leading-tight tracking-tight text-white sm:text-xl">Deep-Signal <BadgeCheck className="h-[17px] w-[17px] shrink-0 fill-blue-500 text-white" /></span>
            <span className="mt-1 hidden truncate text-[11px] font-medium tracking-wide text-white/55 sm:block">Connect · Create · Explore</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2" dir={direction}>
          <Link to="/search" aria-label="البحث" title="البحث" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/75 transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 md:w-[min(360px,30vw)] md:justify-start md:gap-3 md:rounded-xl md:border md:border-white/10 md:bg-white/[0.04] md:px-4">
            <Search className="h-[21px] w-[21px]" />
            <span className="hidden min-w-0 flex-1 truncate text-right text-xs font-medium text-white/45 md:block">{t('searchPlaceholder')}</span>
          </Link>
          <Link to="/chat" aria-label={unreadCount > 0 ? `الرسائل، ${unreadCount} غير مقروءة` : 'الرسائل'} title="الرسائل" className="relative grid h-10 w-10 place-items-center rounded-full text-white/75 transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
            <MessagesSquare className="h-[21px] w-[21px]" />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-[17px] min-w-[17px] place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </Link>

          <div className="relative">
            <button ref={notificationTriggerRef} type="button" onClick={() => setNotificationsOpen((open) => !open)} aria-label="فتح الإشعارات" aria-expanded={notificationsOpen} aria-controls={notificationsOpen ? 'notifications-panel' : undefined} className={`relative hidden h-10 w-10 place-items-center rounded-full transition md:grid ${notificationsOpen ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/[0.07] hover:text-white'}`}>
              <Bell className="h-[20px] w-[20px]" />
              {activities.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-400 ring-2 ring-[#050508]" />}
            </button>
            {notificationsOpen && (
              <section ref={notificationsPanelRef} id="notifications-panel" className="fixed inset-x-3 bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom)+12px)] z-50 mx-auto max-h-[min(65dvh,480px)] w-full max-w-[360px] overflow-y-auto overscroll-contain rounded-[var(--radius-card)] border border-white/10 bg-[#101018] text-right text-white shadow-2xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-12 md:mx-0 md:max-h-[min(70vh,480px)] md:w-[min(360px,calc(100vw-24px))]" dir="rtl" aria-label="الإشعارات">
                <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3"><h2 className="text-sm font-semibold">الإشعارات</h2><span className="text-[11px] text-white/40">أحدث النشاطات</span></div>
                <div className="max-h-[min(420px,70vh)] overflow-y-auto">
                  {notificationsLoading ? <div className="flex items-center justify-center gap-2 py-8 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل</div> : <>
                    {notificationsError && <p role="alert" className="border-b border-rose-400/10 px-4 py-2 text-[10px] leading-5 text-rose-300">{notificationsError}</p>}
                    {activities.length === 0 ? <p className="px-4 py-8 text-center text-xs text-white/50">لا توجد نشاطات جديدة.</p> : activities.map((activity) => (
                      <button key={activity.id} type="button" onClick={() => { setNotificationsOpen(false); navigate(activity.actorId ? `/profile/${activity.actorId}` : '/feed'); }} className="flex w-full items-start gap-3 border-b border-white/[0.06] px-4 py-3 text-right transition hover:bg-white/[0.04]">
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06]">{activityIcon(activity.kind)}</span>
                        <span className="min-w-0 flex-1"><span className="block text-xs leading-5 text-white/85"><b className="font-semibold text-white">{activity.actor}</b> {activity.description}</span><time className="mt-1 block text-[10px] text-white/35">{new Intl.DateTimeFormat('ar-MA', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(activity.createdAt))}</time></span>
                      </button>
                    ))}
                  </>}
                </div>
              </section>
            )}
          </div>

          <button type="button" onClick={onToggleDirection} aria-label={`تبديل الاتجاه إلى ${direction === 'rtl' ? 'LTR' : 'RTL'}`} title={`تبديل الاتجاه إلى ${direction === 'rtl' ? 'LTR' : 'RTL'}`} className="hidden h-9 w-9 place-items-center rounded-full text-white/40 transition hover:bg-white/[0.06] hover:text-white lg:grid">
            <ArrowLeftRight className="h-4 w-4" />
          </button>
          <div className="relative">
            <button ref={profileMenuAnchorRef} type="button" onClick={() => setProfileMenuOpen((open) => !open)} aria-label="قائمة الحساب" aria-expanded={profileMenuOpen} className="grid h-10 w-10 place-items-center rounded-full ring-1 ring-white/15 transition hover:ring-violet-300/60">
              <Avatar src={profile?.avatar_url} name={profile?.full_name ?? profile?.username ?? user?.email ?? 'مستخدم'} type={profile?.avatar_type} emoji={profile?.avatar_emoji} size={34} showStatus online />
            </button>
            {profileMenuOpen && profileMenuPosition && createPortal(
              <div ref={profileMenuRef} role="menu" aria-label="قائمة الحساب" dir="rtl" style={{ position: 'fixed', top: profileMenuPosition.top, insetInlineStart: window.innerWidth - profileMenuPosition.left - 200, width: '200px' }} className="z-[60] min-w-[200px] max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)] overflow-y-auto rounded-xl border border-white/10 bg-[#101018] p-1.5 text-right text-white shadow-2xl">
                {profile && <Link role="menuitem" to={`/profile/${profile.id}`} onClick={() => setProfileMenuOpen(false)} className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm transition hover:bg-white/[0.06]"><UserRound className="h-4 w-4 text-violet-300" /> الملف الشخصي</Link>}
                <Link role="menuitem" to="/search" onClick={() => setProfileMenuOpen(false)} className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm transition hover:bg-white/[0.06]"><Search className="h-4 w-4 text-violet-300" /> البحث عن الأعضاء</Link>
                <Link role="menuitem" to="/rooms" onClick={() => setProfileMenuOpen(false)} className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm transition hover:bg-white/[0.06]"><Radio className="h-4 w-4 text-violet-300" /> الغرف الصوتية</Link>
                <Link role="menuitem" to="/reels" onClick={() => setProfileMenuOpen(false)} className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm transition hover:bg-white/[0.06]"><Video className="h-4 w-4 text-violet-300" /> ريلز</Link>
                {appFeatures.games && <Link role="menuitem" to="/games" onClick={() => setProfileMenuOpen(false)} className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm transition hover:bg-white/[0.06]"><Gamepad2 className="h-4 w-4 text-violet-300" /> الألعاب</Link>}
                <Link role="menuitem" to="/jokal" onClick={() => setProfileMenuOpen(false)} className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm transition hover:bg-white/[0.06]"><Sparkles className="h-4 w-4 text-violet-300" /> Jokal AI</Link>
                <Link role="menuitem" to="/avatar-studio" onClick={() => setProfileMenuOpen(false)} className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm transition hover:bg-white/[0.06]"><WandSparkles className="h-4 w-4 text-violet-300" /> استوديو الأفاتار</Link>
                <Link role="menuitem" to="/settings" onClick={() => setProfileMenuOpen(false)} className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm transition hover:bg-white/[0.06]"><Settings2 className="h-4 w-4 text-violet-300" /> الإعدادات</Link>
              </div>, document.body
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
