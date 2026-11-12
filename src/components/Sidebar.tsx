import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, Gamepad2, House, MessagesSquare, Radio, Settings2, Sparkles, Video } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';
import { DSLogo } from '@/components/icons/BrandIcons';
import { getStoredLanguage, LANGUAGE_CHANGE_EVENT, translate, type Language } from '@/lib/i18n';
import { useMessages } from '@/context/MessagesContext';

const items = [
  { to: '/feed', label: 'الرئيسية', Icon: House },
  { to: '/discover', label: 'اكتشف', Icon: Compass },
  { to: '/rooms', label: 'الغرف الصوتية', Icon: Radio },
  { to: '/games', label: 'الألعاب', Icon: Gamepad2 },
  { to: '/reels', label: 'ريلز', Icon: Video },
  { to: '/jokal', label: 'aiPageTitle', Icon: Sparkles },
  { to: '/chat', label: 'الرسائل', Icon: MessagesSquare },
];

export default function Sidebar() {
  const { profile } = useAuth();
  const { unreadCount } = useMessages();
  const [language, setLanguage] = useState(getStoredLanguage);

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      setLanguage((event as CustomEvent<{ language: Language }>).detail.language);
    };
    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
  }, []);

  return (
    <aside dir="ltr" className="sticky top-0 flex h-[100dvh] w-[72px] shrink-0 flex-col items-center border-r border-[var(--border)] bg-[var(--surface)]/95 py-4 backdrop-blur-md">
      <NavLink to="/feed" aria-label="Deep-Signal الرئيسية" title="Deep-Signal" className="mb-7 grid h-11 w-11 place-items-center rounded-2xl border border-[var(--text)]/[0.08] bg-[var(--text)]/[0.04] transition hover:bg-[var(--text)]/[0.08]">
        <DSLogo size={30} />
      </NavLink>
      <nav aria-label="التنقل الرئيسي" className="flex w-full flex-col items-center gap-2">
        {items.map(({ to, label, Icon }) => {
          const itemLabel = label === 'aiPageTitle' ? translate(language, 'aiPageTitle') : label;
          const accessibleLabel = to === '/chat' && unreadCount > 0
            ? `${itemLabel}، ${unreadCount} رسائل غير مقروءة`
            : itemLabel;
          return (
            <NavLink key={to} to={to} aria-label={accessibleLabel} title={accessibleLabel} className={({ isActive }) => `group relative grid h-11 w-11 place-items-center rounded-2xl transition-colors ${isActive ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text)]/45 hover:bg-[var(--text)]/[0.06] hover:text-[var(--text)]/85'}`}>
              {({ isActive }) => <>
                {isActive && <span className="absolute -right-[11px] h-6 w-[3px] rounded-l-full bg-[var(--accent)]" />}
                <span className="relative">
                  <Icon className="h-[19px] w-[19px] transition-transform group-hover:scale-105" />
                  {to === '/chat' && unreadCount > 0 && <span className="absolute -end-2 -top-2 grid min-h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-[var(--accent-foreground)]">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                </span>
              </>}
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-2">
        <NavLink to="/settings" aria-label="الإعدادات" title="الإعدادات" className={({ isActive }) => `grid h-11 w-11 place-items-center rounded-2xl transition-colors ${isActive ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text)]/45 hover:bg-[var(--text)]/[0.06] hover:text-[var(--text)]/85'}`}>
          <Settings2 className="h-[19px] w-[19px]" />
        </NavLink>
        {profile && <NavLink to={`/profile/${profile.id}`} aria-label="الملف الشخصي" title={profile.username} className="rounded-full p-1 ring-1 ring-[var(--text)]/10 transition hover:ring-[var(--text)]/30"><Avatar src={profile.avatar_url} name={profile.username} type={profile.avatar_type} emoji={profile.avatar_emoji} size={40} /></NavLink>}
      </div>
    </aside>
  );
}
