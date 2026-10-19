import { useState, type ComponentType } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';
import { DSLogo, DSHome, DSChat, DSSearch, DSRooms } from '@/components/icons/BrandIcons';
import { Code2, Compass, Gamepad2, LogOut, Clapperboard, Sparkles, X, Settings2 } from 'lucide-react';

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [showParticipationInfo, setShowParticipationInfo] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItem = (to: string, Icon: ComponentType<{ className?: string }>, label: string) => (
    <NavLink
      to={to}
      aria-label={label}
      className={({ isActive }) =>
        `group relative flex items-center gap-4 px-3 xl:px-4 py-3 rounded-xl transition-all duration-200 ${
          isActive
            ? 'bg-gradient-to-l from-cyan-300/15 via-violet-400/10 to-transparent font-bold text-white'
            : 'text-white/55 hover:bg-white/[0.05] hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute right-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-l-full bg-cyan-300" />
          )}
          <Icon className="w-[22px] h-[22px] shrink-0 transition-transform group-hover:scale-110" />
          <span className="text-sm font-medium">{label}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <aside dir="ltr" className="sticky top-0 flex h-screen w-[314px] overflow-hidden border-r border-white/[0.08] bg-[#09111f]/95 backdrop-blur-2xl">
      <nav aria-label="المساحات" className="flex w-[64px] shrink-0 flex-col items-center gap-3 border-r border-white/[0.06] bg-[#070b12] py-4">
        <NavLink to="/feed" aria-label="الرئيسية" title="الرئيسية" className="mb-2 grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.06] transition hover:bg-cyan-300/15">
          <DSLogo size={30} />
        </NavLink>
        {[
          { to: '/discover', Icon: Compass, label: 'اكتشف' },
          { to: '/rooms', Icon: DSRooms, label: 'الغرف' },
          { to: '/chat', Icon: DSChat, label: 'الرسائل' },
        ].map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            title={label}
            className={({ isActive }) => `grid h-11 w-11 place-items-center rounded-2xl transition ${isActive ? 'bg-cyan-300/15 text-cyan-200' : 'text-white/50 hover:bg-white/[0.07] hover:text-white'}`}
          >
            <Icon className="h-5 w-5" />
          </NavLink>
        ))}
      </nav>

      <div dir="rtl" className="flex min-w-0 flex-1 flex-col overflow-y-auto px-3 py-4">
        <NavLink to="/feed" aria-label="Deep-Signal الرئيسية" className="mb-7 flex items-center gap-3 px-2">
          <span className="min-w-0">
            <span className="block truncate font-serif text-lg font-bold text-white">Deep-Signal</span>
            <span className="block text-[10px] tracking-wide text-white/35">مساحتك الاجتماعية</span>
          </span>
        </NavLink>

        <nav className="space-y-1" aria-label="التنقل الرئيسي">
          <p className="px-3 pb-2 text-[10px] font-semibold text-white/35">القنوات</p>
          {navItem('/feed', DSHome, 'الرئيسية')}
          {navItem('/search', DSSearch, 'البحث')}
          {navItem('/discover', Compass, 'اكتشف')}
          {navItem('/reels', Clapperboard, 'ريلز')}
          <p className="px-3 pb-2 pt-5 text-[10px] font-semibold text-white/35">التواصل</p>
          {navItem('/chat', DSChat, 'الرسائل')}
          {navItem('/rooms', DSRooms, 'الغرف الصوتية')}
          {navItem('/games', Gamepad2, 'الألعاب')}
          {navItem('/jokal', Sparkles, 'تخطيط الأفكار')}
        </nav>

        <div className="mt-auto space-y-1 border-t border-white/[0.07] pt-3">
          {navItem('/settings', Settings2, 'الإعدادات')}
        <button
          onClick={() => setShowParticipationInfo(true)}
          aria-label="شارك في بناء التطبيق"
          title="شارك في بناء التطبيق"
          className="w-full flex items-center gap-4 rounded-xl px-3 py-3 text-white/55 transition-all hover:bg-white/5 hover:text-white"
        >
          <Code2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">شارك في بناء التطبيق</span>
        </button>
        <button onClick={handleSignOut} aria-label="تسجيل الخروج" className="w-full flex items-center gap-4 rounded-xl px-3 py-3 text-white/50 transition-all hover:bg-white/5 hover:text-white">
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">تسجيل الخروج</span>
        </button>
        {profile && (
          <NavLink
            to={`/profile/${profile.id}`}
            aria-label="الملف الشخصي"
            title="الملف الشخصي"
            className="flex items-center rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
          >
            <Avatar src={profile.avatar_url} name={profile.username} size="sm" />
          </NavLink>
        )}
      </div>
      </div>

      {showParticipationInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setShowParticipationInfo(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="participation-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200">
                  <Code2 className="h-5 w-5" />
                </span>
                <h2 id="participation-title" className="text-lg font-semibold text-white">شارك في بناء التطبيق</h2>
              </div>
              <button onClick={() => setShowParticipationInfo(false)} aria-label="إغلاق" className="rounded-lg p-1 text-white/50 transition-colors hover:bg-white/5 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm leading-7 text-white/70">
              تقدر تساهم بأفكارك أو تساعد في تطوير التطبيق. حالياً ما كايناش آلية ربح مفعّلة، وما نقدرش نضمن أي دخل. إلا تطلقات مكافآت مستقبلاً، غادي تتوضح طريقة الاستفادة والشروط قبلها.
            </p>
            <p className="mt-3 text-sm leading-7 text-white/50">
              تقدر تخطي الدعوة وتكمل استعمال التطبيق، ولكن ميزات المشاركة والمكافآت المستقبلية المرتبطة بها ما غاديش تكون متاحة لحسابك.
            </p>
            <button
              onClick={() => setShowParticipationInfo(false)}
              className="mt-6 w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              تخطي الآن
            </button>
          </section>
        </div>
      )}
    </aside>
  );
}
