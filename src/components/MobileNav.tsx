import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Compass, House, Plus, UserRound, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';

export default function MobileNav() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const handleNotificationState = (event: Event) => {
      setNotificationsOpen(Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open));
    };
    window.addEventListener('ds:notifications-state', handleNotificationState);
    return () => window.removeEventListener('ds:notifications-state', handleNotificationState);
  }, []);

  const isHome = location.pathname === '/feed';
  const isExplore = location.pathname === '/discover';
  const isUsers = location.pathname === '/search';
  const isProfile = location.pathname === '/profile' || location.pathname.startsWith('/profile/');
  const activeClass = (active: boolean) => `relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] ${active ? 'text-[var(--accent)]' : 'text-white/55 hover:text-white'}`;

  const openComposer = () => {
    if (isHome) {
      window.dispatchEvent(new Event('ds:create-post'));
    } else {
      navigate('/feed?compose=1');
    }
  };

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="fixed inset-x-0 bottom-0 z-40 h-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom))] border-t border-[var(--border)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,.28)] backdrop-blur-xl lg:hidden"
      dir="ltr"
    >
      <div className="mx-auto flex h-[var(--mobile-nav-height)] max-w-2xl items-stretch px-1 sm:px-3">
        <motion.button type="button" onClick={() => navigate('/feed')} whileTap={{ scale: 0.94 }} aria-label="الرئيسية" aria-current={isHome ? 'page' : undefined} className={activeClass(isHome)}>
          <House className="h-5 w-5" aria-hidden="true" />
          <span dir="auto" className="max-w-full truncate text-[10px] font-medium max-[380px]:text-[9px]">الرئيسية</span>
          {isHome && <span className="absolute inset-x-[32%] top-0 h-0.5 rounded-full bg-current" />}
        </motion.button>

        <motion.button type="button" onClick={() => navigate('/discover')} whileTap={{ scale: 0.94 }} aria-label="اكتشف" aria-current={isExplore ? 'page' : undefined} className={activeClass(isExplore)}>
          <Compass className="h-5 w-5" aria-hidden="true" />
          <span dir="auto" className="max-w-full truncate text-[10px] font-medium max-[380px]:text-[9px]">اكتشف</span>
          {isExplore && <span className="absolute inset-x-[32%] top-0 h-0.5 rounded-full bg-current" />}
        </motion.button>

        <motion.button type="button" onClick={openComposer} whileTap={{ scale: 0.9 }} aria-label="إنشاء منشور" className="-mt-4 grid w-[64px] shrink-0 place-items-center self-start text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
          <span className="grid h-[56px] w-[56px] place-items-center rounded-full border-[5px] border-[var(--bg)] bg-[var(--accent-gradient)] text-white shadow-[0_0_28px_var(--accent-glow)]">
            <Plus className="h-7 w-7" aria-hidden="true" />
          </span>
        </motion.button>

        <motion.button type="button" onClick={() => navigate('/search')} whileTap={{ scale: 0.94 }} aria-label="الأعضاء" aria-current={isUsers ? 'page' : undefined} className={activeClass(isUsers)}>
          <Users className="h-5 w-5" aria-hidden="true" />
          <span dir="auto" className="max-w-full truncate text-[10px] font-medium max-[380px]:text-[9px]">الأعضاء</span>
          {isUsers && <span className="absolute inset-x-[32%] top-0 h-0.5 rounded-full bg-current" />}
        </motion.button>

        <motion.button type="button" onClick={() => window.dispatchEvent(new Event('ds:toggle-notifications'))} whileTap={{ scale: 0.94 }} aria-label="الإشعارات" aria-expanded={notificationsOpen} className={activeClass(notificationsOpen)}>
          <Bell className="h-5 w-5" aria-hidden="true" />
          <span dir="auto" className="max-w-full truncate text-[10px] font-medium max-[380px]:text-[9px]">الإشعارات</span>
          {notificationsOpen && <span className="absolute inset-x-[32%] top-0 h-0.5 rounded-full bg-current" />}
        </motion.button>

        <motion.button type="button" onClick={() => navigate(profile?.id ? `/profile/${profile.id}` : '/profile')} whileTap={{ scale: 0.94 }} aria-label="الملف الشخصي" aria-current={isProfile ? 'page' : undefined} className={activeClass(isProfile)}>
          {profile ? <Avatar src={profile.avatar_url} name={profile.full_name ?? profile.username} type={profile.avatar_type} emoji={profile.avatar_emoji} size={24} /> : <UserRound className="h-5 w-5" aria-hidden="true" />}
          <span dir="auto" className="max-w-full truncate text-[10px] font-medium max-[380px]:text-[9px]">ملفي</span>
          {isProfile && <span className="absolute inset-x-[32%] top-0 h-0.5 rounded-full bg-current" />}
        </motion.button>
      </div>
    </nav>
  );
}
