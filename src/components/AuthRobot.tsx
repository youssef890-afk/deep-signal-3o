import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Language } from '@/lib/i18n';
import LoginWelcomeScene from '@/components/LoginWelcomeScene';

type Props = {
  language: Language;
  message: string;
  status?: 'idle' | 'thinking' | 'error' | 'success';
  compact?: boolean;
};

export default function AuthRobot({ language, message, status = 'idle', compact = false }: Props) {
  const reduceMotion = useReducedMotion();
  const [typed, setTyped] = useState(reduceMotion ? message : '');

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
      <LoginWelcomeScene language={language} isTalking={status === 'thinking'} status={status} compact={compact} />
      <button
        type="button"
        onClick={() => setTyped(message)}
        aria-label={message}
        className={`relative w-full rounded-2xl border text-start text-[var(--text)]/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
          compact ? 'mt-0 px-3 py-2 text-xs leading-5' : 'mt-1 px-4 py-3 text-sm leading-6'
        } ${
          status === 'error'
            ? 'border-[var(--accent)]/45 bg-[var(--surface-2)]'
            : 'border-[var(--text)]/12 bg-[var(--surface-2)]/80'
        }`}
      >
        <span role={statusRole} aria-live={status === 'error' ? 'assertive' : 'polite'}>
          {typed}
        </span>
        {typed.length < message.length && !reduceMotion && (
          <motion.span
            aria-hidden="true"
            className="ms-1 inline-block h-4 w-0.5 align-middle bg-[var(--accent)]"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.7, repeat: Infinity }}
          />
        )}
        {status === 'thinking' && (
          <span aria-hidden="true" className="ms-2 inline-flex gap-1">
            {[0, 1, 2].map((item) => (
              <motion.span
                key={item}
                className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                animate={reduceMotion ? { opacity: 1, y: 0 } : { opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: item * 0.14 }}
              />
            ))}
          </span>
        )}
      </button>
    </div>
  );
}
