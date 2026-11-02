import { useEffect, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { ModalPortal, useModalScrollLock } from '@/hooks/useModalLayer';
import { directionForLanguage, getStoredLanguage } from '@/lib/i18n';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:brightness-110',
  secondary: 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-white/10',
  ghost: 'text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text)]',
  danger: 'bg-[var(--error)] text-zinc-950 hover:brightness-110',
};

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius)] px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${className}`}
    />
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
}

export function Input({ icon, className = '', ...props }: InputProps) {
  return (
    <span className="relative block">
      {icon && <span className="pointer-events-none absolute inset-inline-start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{icon}</span>}
      <input
        {...props}
        className={`h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/90 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25 ${icon ? 'ps-10' : ''} ${className}`}
      />
    </span>
  );
}

export function Card({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={`rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] ${className}`}>
      {children}
    </div>
  );
}

interface ModalProps {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, title, closeLabel, onClose, children, className = '' }: ModalProps) {
  const titleId = useId();
  useModalScrollLock(open);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <ModalPortal>
      <div dir={directionForLanguage(getStoredLanguage())} className="fixed inset-0 z-[200] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`max-h-[85dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-lg)] ${className}`}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="mb-4 flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-lg font-bold text-[var(--text)]">{title}</h2>
            <button type="button" aria-label={closeLabel} onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text)]">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>
          {children}
        </section>
      </div>
    </ModalPortal>
  );
}

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}

export function Tabs({ items, value, onChange, label, className = '' }: TabsProps) {
  return (
    <div role="tablist" aria-label={label} className={`flex gap-2 ${className}`}>
      {items.map((item) => (
        <button
          key={item.id}
          id={`tab-${item.id}`}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          tabIndex={value === item.id ? 0 : -1}
          onClick={() => onChange(item.id)}
          className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition ${value === item.id ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5'}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function Chip({ selected = false, className = '', type = 'button', ...props }: ChipProps) {
  return (
    <button
      {...props}
      type={type}
      aria-pressed={selected}
      className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm transition ${selected ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-white/5'} ${className}`}
    />
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-dashed border-[var(--border)] p-6 text-center">
      <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
      {description && <p className="max-w-md text-sm text-[var(--text-muted)]">{description}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-[var(--radius)] ${className}`} />;
}

export function Toast({ children, status = 'status', className = '' }: { children: ReactNode; status?: 'status' | 'alert'; className?: string }) {
  return (
    <div role={status} className={`rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)] shadow-[var(--shadow-md)] ${className}`}>
      {children}
    </div>
  );
}
