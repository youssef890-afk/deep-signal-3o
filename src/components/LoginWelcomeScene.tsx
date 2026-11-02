import { useState, type PointerEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Language } from '@/lib/i18n';
import { translateAuth } from '@/i18n/auth';

type Props = {
  language: Language;
  isTalking: boolean;
  status?: 'idle' | 'thinking' | 'error' | 'success';
  compact?: boolean;
};

export default function LoginWelcomeScene({ language, isTalking, status, compact = false }: Props) {
  const reduceMotion = useReducedMotion();
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const robotLabel = translateAuth(language, 'robotAlt');
  const activeStatus = status ?? (isTalking ? 'thinking' : 'idle');
  const talking = activeStatus === 'thinking';
  const gazeX = Number.isFinite(gaze.x) ? gaze.x : 0;
  const gazeY = Number.isFinite(gaze.y) ? gaze.y : 0;
  const followPointer = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') {
      setGaze({ x: 0, y: 0 });
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    setGaze({
      x: Math.max(-2.5, Math.min(2.5, ((event.clientX - bounds.left) / bounds.width - 0.5) * 5)),
      y: Math.max(-2, Math.min(2, ((event.clientY - bounds.top) / bounds.height - 0.35) * 3)),
    });
  };

  return (
    <section onPointerMove={followPointer} onPointerLeave={() => setGaze({ x: 0, y: 0 })} className="relative mx-auto flex w-full max-w-sm flex-col items-center px-2 pb-0 pt-0 text-center" aria-label={robotLabel}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-12 top-6 h-28 rounded-full bg-[#F5F2EB]/10 blur-3xl" />
      <motion.span aria-hidden="true" className="pointer-events-none absolute top-16 h-28 w-28 rounded-full border border-[#F5F2EB]/25" animate={reduceMotion || !talking ? { opacity: 0, scale: 0.94 } : { opacity: [0, 0.55, 0], scale: [0.92, 1.18, 1.34] }} transition={{ duration: 1.6, repeat: talking && !reduceMotion ? Infinity : 0, ease: 'easeOut' }} />
      <motion.div
        className={`relative z-10 ${compact ? 'h-28 w-36 sm:h-32 sm:w-40' : 'h-36 w-44 sm:h-40 sm:w-48'}`}
        animate={reduceMotion
          ? { x: 0, y: 0, rotate: 0, scale: 1 }
          : activeStatus === 'error'
            ? { x: [0, -4, 4, -3, 3, 0], y: 0, rotate: 0, scale: 1 }
            : activeStatus === 'success'
              ? { x: 0, y: [0, -5, 0, -3, 0], rotate: [0, -2, 2, 0], scale: [1, 1.04, 1, 1.02, 1] }
              : talking
                ? { y: [0, -3, 0], rotate: [-1.5, 1.5, -1.5], scale: [1, 1.015, 1] }
                : { y: [0, -3, 0], rotate: [0, -0.6, 0] }}
        transition={{ duration: reduceMotion ? 0 : activeStatus === 'error' ? 0.35 : activeStatus === 'success' ? 0.8 : talking ? 0.55 : 3.4, repeat: !reduceMotion && activeStatus === 'idle' ? Infinity : 0, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 240 200" role="img" aria-label={robotLabel} className="h-full w-full overflow-visible drop-shadow-[0_16px_28px_rgba(0,0,0,.42)]">
          <defs>
            <linearGradient id="robot-shell" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#F5F2EB"/><stop offset=".34" stopColor="#D8D3CA"/><stop offset=".68" stopColor="#B8B1A5"/><stop offset="1" stopColor="#8A847A"/></linearGradient>
            <linearGradient id="robot-face" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#171614"/><stop offset="1" stopColor="#292723"/></linearGradient>
            <linearGradient id="robot-body" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#F5F2EB"/><stop offset=".38" stopColor="#D8D3CA"/><stop offset=".7" stopColor="#B8B1A5"/><stop offset="1" stopColor="#292723"/></linearGradient>
            <filter id="robot-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <ellipse cx="120" cy="183" rx="72" ry="9" fill="#B8B1A5" opacity=".28" />
          <motion.path initial={{ d: 'M70 148Q58 155 52 166' }} d="M70 148Q58 155 52 166" fill="none" stroke="#8A847A" strokeWidth="8" strokeLinecap="round" animate={reduceMotion || !talking ? { d: 'M70 148Q58 155 52 166' } : { d: ['M70 148Q58 155 52 166', 'M70 148Q43 137 48 116', 'M70 148Q48 121 57 108', 'M70 148Q43 137 48 116', 'M70 148Q58 155 52 166'] }} transition={{ duration: 1.25, repeat: talking && !reduceMotion ? Infinity : 0, ease: 'easeInOut' }} />
          <motion.path initial={{ d: 'M170 148Q182 155 188 166' }} d="M170 148Q182 155 188 166" fill="none" stroke="#8A847A" strokeWidth="8" strokeLinecap="round" animate={reduceMotion || !talking ? { d: 'M170 148Q182 155 188 166' } : { d: ['M170 148Q182 155 188 166', 'M170 148Q197 137 192 116', 'M170 148Q192 121 183 108', 'M170 148Q197 137 192 116', 'M170 148Q182 155 188 166'] }} transition={{ duration: 1.25, repeat: talking && !reduceMotion ? Infinity : 0, ease: 'easeInOut', delay: .32 }} />
          <motion.circle initial={{ cx: 52, cy: 166 }} cx="52" cy="166" r="6" fill="#D8D3CA" stroke="#F5F2EB" strokeWidth="2" animate={reduceMotion || !talking ? { cx: 52, cy: 166 } : { cx: [52, 48, 57, 48, 52], cy: [166, 116, 108, 116, 166] }} transition={{ duration: 1.25, repeat: talking && !reduceMotion ? Infinity : 0, ease: 'easeInOut' }} />
          <motion.circle initial={{ cx: 188, cy: 166 }} cx="188" cy="166" r="6" fill="#D8D3CA" stroke="#F5F2EB" strokeWidth="2" animate={reduceMotion || !talking ? { cx: 188, cy: 166 } : { cx: [188, 192, 183, 192, 188], cy: [166, 116, 108, 116, 166] }} transition={{ duration: 1.25, repeat: talking && !reduceMotion ? Infinity : 0, ease: 'easeInOut', delay: .32 }} />
          <path d="M63 178c2-31 21-49 57-49s55 18 57 49v5H63z" fill="url(#robot-body)" stroke="#F5F2EB" strokeOpacity=".75" strokeWidth="2" />
          <path d="m95 133 25 20 25-20" fill="none" stroke="#F5F2EB" strokeOpacity=".8" strokeWidth="3" />
          <path d="M105 124h30v21c-8 8-22 8-30 0z" fill="url(#robot-shell)" stroke="#F5F2EB" strokeOpacity=".6" />
          <path d="M82 47c0-16 13-29 29-29h20c19 0 34 15 34 34v43c0 26-19 44-44 44s-44-18-44-44V60c0-5 2-9 5-13z" fill="url(#robot-shell)" stroke="#D8D3CA" strokeWidth="2" />
          <path d="M90 53c0-12 10-21 22-21h19c14 0 25 11 25 25v35c0 18-14 31-33 31s-33-13-33-31z" fill="url(#robot-face)" stroke="#F5F2EB" strokeOpacity=".85" strokeWidth="2" />
          <path d="M75 60c-12 0-18 8-18 20s6 20 18 20M165 60c12 0 18 8 18 20s-6 20-18 20" fill="none" stroke="#B8B1A5" strokeWidth="6" strokeLinecap="round" />
          <path d="M120 19V8m0 0c-7 0-11-5-11-9" fill="none" stroke="#F5F2EB" strokeWidth="4" strokeLinecap="round" />
          <circle cx="109" cy="-1" r="5" fill="#F5F2EB" filter="url(#robot-glow)" />
          <motion.ellipse initial={{ ry: 9 }} cx="106" cy="72" rx="7" ry="9" fill="#F5F2EB" filter="url(#robot-glow)" animate={reduceMotion ? { ry: 9 } : { ry: [9, 9, 9, 1.2, 9, 9] }} transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: .45 }} />
          <motion.ellipse initial={{ ry: 9 }} cx="144" cy="72" rx="7" ry="9" fill="#F5F2EB" filter="url(#robot-glow)" animate={reduceMotion ? { ry: 9 } : { ry: [9, 9, 9, 1.2, 9, 9] }} transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: .55 }} />
          <motion.circle initial={{ cx: 106, cy: 72 }} cx="106" cy="72" r="2.4" fill="#171614" animate={{ cx: 106 + gazeX, cy: 72 + gazeY }} transition={{ type: 'spring', stiffness: 180, damping: 18 }} />
          <motion.circle initial={{ cx: 144, cy: 72 }} cx="144" cy="72" r="2.4" fill="#171614" animate={{ cx: 144 + gazeX, cy: 72 + gazeY }} transition={{ type: 'spring', stiffness: 180, damping: 18 }} />
          <path d="M119 88h12" stroke="#F5F2EB" strokeWidth="3" strokeLinecap="round" opacity=".9" />
          <motion.ellipse initial={{ rx: 8, ry: 2.5 }} cx="125" cy="103" rx="8" ry="2.5" fill="#F5F2EB" filter="url(#robot-glow)" animate={reduceMotion || !talking ? { rx: 8, ry: 2.5 } : { rx: [7, 10, 6, 9, 7], ry: [2.5, 5, 2.5, 4.5, 2.5] }} transition={{ duration: .42, repeat: talking && !reduceMotion ? Infinity : 0, ease: 'easeInOut' }} />
          <circle cx="120" cy="163" r="4" fill="#F5F2EB" opacity=".9" />
        </svg>
      </motion.div>
      <div aria-hidden="true" className="relative z-10 -mt-2 h-px w-24 bg-gradient-to-r from-transparent via-[#F5F2EB]/60 to-transparent" />
    </section>
  );
}
