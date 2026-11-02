import { NavLink } from 'react-router-dom';
import { Compass, Gamepad2, House, MessageCircle, Radio, Settings2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';
import { DSLogo } from '@/components/icons/BrandIcons';

const items = [
  { to: '/feed', label: 'الرئيسية', Icon: House },
  { to: '/discover', label: 'اكتشف', Icon: Compass },
  { to: '/rooms', label: 'الغرف الصوتية', Icon: Radio },
  { to: '/games', label: 'الألعاب', Icon: Gamepad2 },
  { to: '/jokal', label: 'تخطيط الأفكار', Icon: Sparkles },
  { to: '/chat', label: 'الرسائل', Icon: MessageCircle },
];

export default function Sidebar() {
  const { profile } = useAuth();

  return (
    <aside dir="ltr" className="sticky top-0 flex h-[100dvh] w-[72px] shrink-0 flex-col items-center border-r border-[var(--border)] bg-[var(--surface)]/95 py-4 backdrop-blur-md">
      <NavLink to="/feed" aria-label="Deep-Signal الرئيسية" title="Deep-Signal" className="mb-7 grid h-11 w-11 place-items-center rounded-2xl border border-[var(--text)]/[0.08] bg-[var(--text)]/[0.04] transition hover:bg-[var(--text)]/[0.08]">
        <DSLogo size={30} />
      </NavLink>
      <nav aria-label="التنقل الرئيسي" className="flex w-full flex-col items-center gap-2">
        {items.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} aria-label={label} title={label} className={({ isActive }) => `group relative grid h-11 w-11 place-items-center rounded-2xl transition-colors ${isActive ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text)]/45 hover:bg-[var(--text)]/[0.06] hover:text-[var(--text)]/85'}`}>
            {({ isActive }) => <>
            {isActive && <span className="absolute -right-[11px] h-6 w-[3px] rounded-l-full bg-[var(--accent)]" />}
              <Icon className="h-[19px] w-[19px] transition-transform group-hover:scale-105" />
            </>}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-2">
        <NavLink to="/settings" aria-label="الإعدادات" title="الإعدادات" className={({ isActive }) => `grid h-11 w-11 place-items-center rounded-2xl transition-colors ${isActive ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text)]/45 hover:bg-[var(--text)]/[0.06] hover:text-[var(--text)]/85'}`}>
          <Settings2 className="h-[19px] w-[19px]" />
        </NavLink>
        {profile && <NavLink to={`/profile/${profile.id}`} aria-label="الملف الشخصي" title={profile.username} className="rounded-full p-1 ring-1 ring-[var(--text)]/10 transition hover:ring-[var(--text)]/30"><Avatar src={profile.avatar_url} name={profile.username} size="sm" /></NavLink>}
      </div>
    </aside>
  );
}
