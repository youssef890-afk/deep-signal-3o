import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Compass, Ellipsis, House, MessagesSquare, Radio, Settings2, Sparkles, UserRound, Video, WandSparkles, X } from 'lucide-react';
import { useMessages } from '@/context/MessagesContext';
import { useAuth } from '@/context/AuthContext';
import { getStoredLanguage, LANGUAGE_CHANGE_EVENT, translate, type Language } from '@/lib/i18n';

const primaryItems = [
  { path: '/feed', Icon: House, label: 'الرئيسية' },
  { path: '/discover', Icon: Compass, label: 'اكتشف' },
  { path: '/chat', Icon: MessagesSquare, label: 'الرسائل' },
];

const moreItems = [
  { path: '/rooms', Icon: Radio, label: 'الغرف الصوتية' },
  { path: '/reels', Icon: Video, label: 'ريلز' },
  { path: '/jokal', Icon: Sparkles, label: 'aiPageTitle' },
  { path: '/profile', Icon: UserRound, label: 'الملف الشخصي' },
  { path: '/avatar-studio', Icon: WandSparkles, label: 'استوديو الأفاتار' },
  { path: '/settings', Icon: Settings2, label: 'الإعدادات' },
];

function isRouteActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function MobileNav({ direction, onToggleDirection }: { direction: 'rtl' | 'ltr'; onToggleDirection: () => void }) {
  const { unreadCount } = useMessages();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [language, setLanguage] = useState(getStoredLanguage);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const morePanelRef = useRef<HTMLElement>(null);
  const moreRouteActive = moreItems.some(({ path }) => isRouteActive(location.pathname, path));

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      setLanguage((event as CustomEvent<{ language: Language }>).detail.language);
    };
    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = morePanelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
      moreButtonRef.current?.focus();
    };
  }, [moreOpen]);

  const getLabel = (label: string) => label === 'aiPageTitle' ? translate(language, 'aiPageTitle') : label;
  const getPath = (path: string) => path === '/profile' && profile?.id ? `/profile/${profile.id}` : path;

  return (
    <>
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="إغلاق قائمة المزيد"
            onClick={() => setMoreOpen(false)}
            className="fixed inset-0 z-[48] bg-black/55 backdrop-blur-[2px]"
          />
          <section
            ref={morePanelRef}
            id="mobile-more-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-title"
            dir="rtl"
            className="fixed inset-x-3 bottom-[calc(64px_+_env(safe-area-inset-bottom))] z-[50] mx-auto max-h-[min(68dvh,520px)] max-w-xl overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 pb-5 text-[var(--text)] shadow-2xl shadow-black/40"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 id="mobile-more-title" className="text-sm font-bold">المزيد</h2>
                <p className="mt-1 text-[10px] text-[var(--text)]/45">خدمات وروابط إضافية</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="إغلاق القائمة"
                className="grid h-9 w-9 place-items-center rounded-full text-[var(--text)]/60 transition hover:bg-[var(--text)]/[0.07] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav aria-label="روابط إضافية" className="grid grid-cols-3 gap-2">
              {moreItems.map(({ path, Icon, label }) => {
                const active = isRouteActive(location.pathname, path);
                return (
                  <Link
                    key={path}
                    to={getPath(path)}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${active ? 'border-[var(--accent)]/35 bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--bg-base)]/45 text-[var(--text)]/70 hover:border-[var(--accent)]/25 hover:bg-[var(--text)]/[0.04]'}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span className="text-[10px] font-medium leading-4">{getLabel(label)}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  onToggleDirection();
                  setMoreOpen(false);
                }}
                className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-base)]/45 px-2 py-3 text-center text-[var(--text)]/70 transition hover:border-[var(--accent)]/25 hover:bg-[var(--text)]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
                <span className="text-[10px] font-medium leading-4">{direction === 'rtl' ? 'تغيير الاتجاه إلى LTR' : 'تغيير الاتجاه إلى RTL'}</span>
              </button>
            </nav>
          </section>
        </>
      )}

      <nav
        aria-label="التنقل الرئيسي"
        className="fixed inset-x-0 bottom-0 z-40 h-[calc(64px+env(safe-area-inset-bottom))] border-t border-[var(--border)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,.18)] backdrop-blur-xl lg:hidden"
        dir="rtl"
      >
        <div className="mx-auto flex h-16 max-w-xl items-stretch px-2">
          {primaryItems.map(({ path, Icon, label }) => {
            const active = isRouteActive(location.pathname, path);
            const badge = path === '/chat' ? unreadCount : 0;
            return (
              <motion.button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                whileTap={{ scale: 0.93 }}
                aria-label={badge ? `${label}، ${badge} رسائل غير مقروءة` : label}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] ${active ? 'text-[var(--accent)]' : 'text-[var(--text)]/45 hover:text-[var(--text)]/80'}`}
              >
                <span className="relative grid h-6 place-items-center">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {badge > 0 && <span className="absolute -end-2 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-[var(--accent-foreground)]">{badge > 99 ? '99+' : badge}</span>}
                </span>
                <span className="max-w-full truncate text-[10px] font-medium">{label}</span>
                {active && <span className="absolute inset-x-1/3 top-0 h-0.5 rounded-full bg-[var(--accent)]" />}
              </motion.button>
            );
          })}
          <motion.button
            ref={moreButtonRef}
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            whileTap={{ scale: 0.93 }}
            aria-label={moreOpen ? 'إغلاق قائمة المزيد' : 'المزيد من الصفحات'}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            aria-controls={moreOpen ? 'mobile-more-panel' : undefined}
            aria-current={moreRouteActive ? 'page' : undefined}
            className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] ${moreRouteActive || moreOpen ? 'text-[var(--accent)]' : 'text-[var(--text)]/45 hover:text-[var(--text)]/80'}`}
          >
            <span className="grid h-6 place-items-center"><Ellipsis className="h-5 w-5" aria-hidden="true" /></span>
            <span className="text-[10px] font-medium">المزيد</span>
            {(moreRouteActive || moreOpen) && <span className="absolute inset-x-1/3 top-0 h-0.5 rounded-full bg-[var(--accent)]" />}
          </motion.button>
        </div>
      </nav>
    </>
  );
}
