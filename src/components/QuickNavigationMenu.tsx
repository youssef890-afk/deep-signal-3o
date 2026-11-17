import { useEffect, useState } from 'react';
import { Heart, House, MessagesSquare, Plus, Radio, Sparkles, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const items = [
  { to: '/feed', label: 'الموجز', Icon: House, x: 160, y: 18 },
  { to: '/rooms', label: 'الغرف الصوتية', Icon: Radio, x: 132, y: 66 },
  { to: '/games', label: 'الألعاب', Icon: Heart, x: 94, y: 108 },
  { to: '/jokal', label: 'الذكاء الاصطناعي', Icon: Sparkles, x: 48, y: 138 },
  { to: '/chat', label: 'الرسائل', Icon: MessagesSquare, x: 0, y: 152 },
];

export default function QuickNavigationMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="إغلاق قائمة التنقل"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[54] cursor-default bg-black/10"
        />
      )}
      <div className="fixed bottom-6 right-4 z-[55] hidden h-14 w-14 lg:block">
        <div id="quick-navigation-items" aria-hidden={!open}>
          {items.map(({ to, label, Icon, x, y }, index) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              aria-current={location.pathname === to ? 'page' : undefined}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              style={{
                right: 28,
                bottom: 28,
                marginRight: -22,
                marginBottom: -22,
                transform: open ? `translate(${-x}px, ${-y}px) scale(1)` : 'translate(0, 0) scale(.25)',
                transitionDelay: open ? `${index * 35}ms` : '0ms',
              }}
              className={`absolute grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-slate-900/95 text-[var(--accent)] shadow-[0_8px_28px_rgba(0,0,0,.45)] backdrop-blur-xl transition duration-200 hover:border-[var(--accent)]/50 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-slate-900/95 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
                {label}
              </span>
            </Link>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? 'إغلاق التنقل السريع' : 'فتح التنقل السريع'}
          aria-expanded={open}
          aria-controls="quick-navigation-items"
          className="relative z-10 grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_0_32px_var(--accent-glow)] transition duration-200 hover:scale-105 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </>
  );
}
