import { useEffect, useState } from 'react';
import type { Language } from '@/lib/i18n';
import LoginWelcomeScene from '@/components/LoginWelcomeScene';

type Props = {
  language: Language;
  message: string;
  status?: 'idle' | 'thinking' | 'error' | 'success';
  compact?: boolean;
};

const ROBOT_NAME = 'Signal';

export default function AuthRobot({ language, message, status = 'idle', compact = false }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReduceMotion(preference.matches);
    updatePreference();
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setTyped(message);
      return;
    }

    setTyped('');
    let index = 0;
    const timer = window.setInterval(() => {
      index = Math.min(index + 1, message.length);
      setTyped(message.slice(0, index));
      if (index >= message.length) window.clearInterval(timer);
    }, 22);
    return () => window.clearInterval(timer);
  }, [message, reduceMotion]);

  const statusRole = status === 'error' ? 'alert' : 'status';

  return (
    <div className="mx-auto w-full max-w-xl">
      <LoginWelcomeScene language={language} isTalking={status === 'thinking'} status={status} compact={compact} reduceMotion={reduceMotion} />
      <div className="relative mx-auto w-full">
        <span aria-hidden="true" className="mb-1 block text-center text-[10px] font-semibold tracking-wide text-[var(--text)]/55">
          {ROBOT_NAME}
        </span>
        <button
          type="button"
          onClick={() => setTyped(message)}
          aria-label={message}
          className={`login-robot-bubble relative block w-full rounded-[1.4rem] border text-start text-[var(--text)]/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
            compact ? 'px-3 py-2 text-xs leading-5' : 'px-4 py-3 text-sm leading-6'
          } ${
            status === 'error'
              ? 'border-[var(--accent)]/45 bg-[var(--surface-2)]'
              : 'border-[var(--text)]/15 bg-[var(--surface-2)]/85'
          }`}
        >
          <span className="relative z-10" role={statusRole} aria-live={status === 'error' ? 'assertive' : 'polite'}>
            {typed}
          </span>
          {typed.length < message.length && !reduceMotion && (
            <span aria-hidden="true" className="login-robot-cursor relative z-10 ms-1 inline-block h-4 w-0.5 align-middle bg-[var(--accent)]" />
          )}
          {status === 'thinking' && (
            <span aria-hidden="true" className="ms-2 inline-flex gap-1">
              {[0, 1, 2].map((item) => (
                <span
                  key={item}
                  className={`relative z-10 h-1.5 w-1.5 rounded-full bg-[var(--accent)] ${reduceMotion ? '' : 'login-robot-thinking-dot'}`}
                  style={{ animationDelay: `${item * 0.14}s` }}
                />
              ))}
            </span>
          )}
          <span aria-hidden="true" className="login-robot-bubble-tail absolute -top-1.5 left-1/2 z-10 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-[var(--text)]/15 bg-[var(--surface-2)]/95" />
        </button>
      </div>
    </div>
  );
}
