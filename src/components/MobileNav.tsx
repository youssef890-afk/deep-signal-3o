import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, Gamepad2, House, MessageCircle, Radio, Sparkles } from 'lucide-react';
import { useMessages } from '@/context/MessagesContext';
import { getStoredLanguage, LANGUAGE_CHANGE_EVENT, translate, type Language } from '@/lib/i18n';

const items = [
  { path: '/feed', Icon: House, label: 'الرئيسية' },
  { path: '/discover', Icon: Compass, label: 'اكتشف' },
  { path: '/rooms', Icon: Radio, label: 'الغرف' },
  { path: '/games', Icon: Gamepad2, label: 'الألعاب' },
  { path: '/jokal', Icon: Sparkles, label: 'aiPageTitle' },
  { path: '/chat', Icon: MessageCircle, label: 'الرسائل' },
];

export default function MobileNav() {
  const { unreadCount } = useMessages();
  const navigate = useNavigate();
  const location = useLocation();
  const [language, setLanguage] = useState(getStoredLanguage);

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      setLanguage((event as CustomEvent<{ language: Language }>).detail.language);
    };
    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
  }, []);

  return (
    <nav aria-label="التنقل الرئيسي" className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden" dir="rtl">
      <div className="mx-auto flex h-[68px] max-w-xl items-center justify-around px-1">
        {items.map(({ path, Icon, label: itemLabel }) => {
          const label = itemLabel === 'aiPageTitle' ? translate(language, 'aiPageTitle') : itemLabel;
          const active = location.pathname === path || location.pathname.startsWith(`${path}/`);
          const badge = path === '/chat' ? unreadCount : 0;
          return (
            <motion.button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              whileTap={{ scale: 0.92 }}
              aria-label={badge ? `${label}، ${badge} رسائل غير مقروءة` : label}
              aria-current={active ? 'page' : undefined}
              className={`relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors ${active ? 'text-[var(--accent)]' : 'text-[var(--text)]/40 hover:text-[var(--text)]/75'}`}
            >
              <span className="relative">
                <Icon className="h-[19px] w-[19px]" />
                {badge > 0 && <span className="absolute -right-2 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-[var(--accent-foreground)]">{badge > 99 ? '99+' : badge}</span>}
              </span>
              <span className="max-w-full truncate text-[9px] font-medium">{label}</span>
              {active && <span className="absolute inset-x-1/3 top-0 h-0.5 rounded-full bg-[var(--accent)]" />}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
