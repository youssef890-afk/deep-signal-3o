import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Language } from '@/lib/i18n';

const sceneCopy = {
  ar: { greeting: 'مرحبا بك في موقعي', tagline: 'أفكارك تبدأ بإشارة', robot: 'روبوت Deep-Signal المساعد' },
  fr: { greeting: 'Bienvenue chez vous', tagline: 'Vos idées commencent par un signal', robot: 'Robot assistant Deep-Signal' },
  en: { greeting: 'Welcome to Deep-Signal', tagline: 'Your ideas start with a signal', robot: 'Deep-Signal assistant robot' },
} as const;
const robotImage = 'https://png.pngtree.com/png-clipart/20250207/original/pngtree-ai-powered-robot-interacting-with-a-tablet-device-png-image_19770445.png';
const signalBars = [
  { color: 'bg-[#b9e978]', height: 'h-5' },
  { color: 'bg-[#54c9bd]', height: 'h-8' },
  { color: 'bg-[#6f92d9]', height: 'h-11' },
  { color: 'bg-[#b9e978]', height: 'h-7' },
  { color: 'bg-[#d68bd1]', height: 'h-10' },
  { color: 'bg-[#54c9bd]', height: 'h-6' },
  { color: 'bg-[#d7e0e7]', height: 'h-9' },
  { color: 'bg-[#6f92d9]', height: 'h-5' },
];

type Props = {
  language?: Language;
  conversationStep?: 'language' | 'consent';
  onLanguageSelect?: (language: Language) => void;
  onNoTime?: () => void;
  onYesTime?: () => void;
};

export default function LoginWelcomeScene({ language = 'ar', conversationStep, onLanguageSelect, onNoTime, onYesTime }: Props) {
  const reduceMotion = useReducedMotion();
  const [robotLoaded, setRobotLoaded] = useState(false);
  const { greeting, tagline, robot } = sceneCopy[language];
  const conversation = conversationStep === 'consent'
    ? language === 'ar' ? 'أرجو منك بعض الوقت لتمكينك من تسجيل الدخول أو إنشاء حساب.' : language === 'fr' ? 'Accordez-moi un instant pour vous connecter ou créer un compte.' : 'Please give me a moment to help you sign in or create an account.'
    : 'مرحباً بك في موقعنا';
  const [typedText, setTypedText] = useState(conversation);
  useEffect(() => {
    setTypedText(reduceMotion ? conversation : '');
    if (reduceMotion) return;
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedText(conversation.slice(0, index));
      if (index >= conversation.length) window.clearInterval(timer);
    }, 38);
    return () => window.clearInterval(timer);
  }, [conversation, reduceMotion]);
  const letters = Array.from(greeting);
  const armTransition = { duration: 1.35, times: [0, 0.62, 1], delay: 0.2, ease: 'easeInOut' as const };

  return (
    <div className="relative mx-auto flex w-full max-w-xl flex-col items-center py-5 sm:py-8" dir={language === 'ar' || conversationStep === 'language' ? 'rtl' : 'ltr'}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-1/4 top-1/4 h-64 rounded-full bg-cyan-400/[0.08] blur-3xl" />
      <svg viewBox="0 0 560 430" className="relative w-full overflow-visible" role="img" aria-labelledby="welcome-title welcome-desc">
        <title id="welcome-title">{greeting}</title>
        <desc id="welcome-desc">شاب يرحب بك بفتح ذراعيه تحت عبارة ترحيبية منحنية.</desc>
        <defs>
          <linearGradient id="welcome-shirt" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#b9e978" /><stop offset="1" stopColor="#54c9bd" /></linearGradient>
          <filter id="welcome-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <path id="greeting-arc" d="M 82 190 Q 280 8 478 190" />
        </defs>
        <motion.path d="M 82 190 Q 280 8 478 190" fill="none" stroke="#b9e978" strokeOpacity=".13" strokeWidth="1" strokeDasharray="4 9" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 1.5, delay: 0.3 }} />
        <text fill="#d9f6a9" fontSize="25" fontWeight="700" textAnchor="middle" filter="url(#welcome-glow)">
          <textPath href="#greeting-arc" startOffset="50%" textAnchor="middle">
            {letters.map((letter, index) => (
              <motion.tspan key={`${letter}-${index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 1.1 + index * 0.13 }}>
                {letter === ' ' ? '\u00a0' : letter}
              </motion.tspan>
            ))}
          </textPath>
        </text>
        <motion.g style={{ display: robotLoaded ? 'none' : undefined }} animate={reduceMotion ? undefined : { y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 3.7 }}>
          <ellipse cx="280" cy="378" rx="100" ry="14" fill="#000" opacity=".28" />
          <path d="M251 311 L247 365 Q246 377 257 377 L274 377 L280 322 M300 311 L307 364 Q308 377 297 377 L280 377 L273 322" fill="#25364a" stroke="#60788a" strokeWidth="4" strokeLinejoin="round" />
          <path d="M250 370 Q244 372 243 381 L276 381 Q278 373 270 370 M304 370 Q311 373 312 381 L279 381 Q277 373 285 370" fill="#d8e4e7" />
          <path d="M246 218 Q280 198 314 218 L333 313 Q280 332 227 313 Z" fill="url(#welcome-shirt)" stroke="#d7f3ac" strokeOpacity=".65" strokeWidth="2" />
          <path d="M264 214 Q280 229 296 214" fill="none" stroke="#315f60" strokeWidth="4" strokeLinecap="round" />
          <path d="M267 202 L267 226 Q280 237 293 226 L293 202" fill="#c88969" />
          <ellipse cx="280" cy="165" rx="43" ry="49" fill="#c88969" />
          <path d="M237 164 Q233 121 274 115 Q316 114 324 153 L319 164 Q310 144 291 139 Q267 151 240 151Z" fill="#17202b" />
          <path d="M249 168 Q257 164 266 168 M294 168 Q303 164 311 168" fill="none" stroke="#27313a" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M270 188 Q280 194 290 188" fill="none" stroke="#874b42" strokeWidth="3" strokeLinecap="round" />
          <motion.path d="M244 232 Q218 250 189 244 Q155 236 128 199" fill="none" stroke="#c88969" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" initial={{ d: 'M244 232 Q219 211 219 173 Q221 135 238 112' }} animate={{ d: reduceMotion ? 'M244 232 Q218 250 189 244 Q155 236 128 199' : ['M244 232 Q219 211 219 173 Q221 135 238 112', 'M244 232 Q218 250 189 244 Q155 236 128 199', 'M244 232 Q218 250 189 244 Q155 236 128 199'] }} transition={armTransition} />
          <motion.path d="M316 232 Q342 250 371 244 Q405 236 432 199" fill="none" stroke="#c88969" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" initial={{ d: 'M316 232 Q341 211 341 173 Q339 135 322 112' }} animate={{ d: reduceMotion ? 'M316 232 Q342 250 371 244 Q405 236 432 199' : ['M316 232 Q341 211 341 173 Q339 135 322 112', 'M316 232 Q342 250 371 244 Q405 236 432 199', 'M316 232 Q342 250 371 244 Q405 236 432 199'] }} transition={armTransition} />
          <motion.circle cx="238" cy="111" r="10" fill="#c88969" initial={{ cy: 111 }} animate={{ cy: reduceMotion ? 199 : [111, 199, 199] }} transition={armTransition} />
          <motion.circle cx="322" cy="111" r="10" fill="#c88969" initial={{ cy: 111 }} animate={{ cy: reduceMotion ? 199 : [111, 199, 199] }} transition={armTransition} />
          <motion.path d="M352 254 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" fill="#b9e978" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: [0, 0.9, 0.35], scale: [0.4, 1, 0.85] }} transition={{ duration: 1.2, delay: 2.7 }} />
        </motion.g>
      </svg>
      <motion.img src={robotImage} alt={robot} onLoad={() => setRobotLoaded(true)} onError={() => setRobotLoaded(false)} className="pointer-events-none absolute left-1/2 top-[18%] z-10 h-[54%] max-h-[270px] w-[62%] object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,.42)]" style={{ x: '-50%' }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: robotLoaded ? 1 : 0, y: [0, -4, 0] }} transition={{ opacity: { duration: 0.4 }, y: { duration: 4, repeat: Infinity, ease: 'easeInOut' } }} />
      <motion.div
        aria-label="إشارة بث Deep-Signal"
        className="relative mt-1 flex items-center gap-4 rounded-2xl border border-white/[0.09] bg-[#080d18]/80 px-5 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-sm"
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.65, delay: reduceMotion ? 0 : 3.45, ease: 'easeOut' }}
      >
        <div aria-hidden="true" className="flex h-12 items-center gap-1.5">
          {signalBars.map((bar, index) => (
            <motion.span
              key={index}
              className={`w-1.5 rounded-full ${bar.color} ${bar.height} opacity-80`}
              initial={reduceMotion ? false : { scaleY: 0.25, opacity: 0.35 }}
              animate={reduceMotion ? undefined : { scaleY: [0.75, 1, 0.82], opacity: [0.65, 1, 0.78] }}
              transition={{ duration: 1.8, delay: 3.55 + index * 0.045, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
              style={{ transformOrigin: 'center' }}
            />
          ))}
        </div>
        <div className="border-r border-white/10 pr-4 text-right">
          <p className="text-[9px] font-bold tracking-[.24em] text-[#b9e978]">DEEP-SIGNAL</p>
          <p className="mt-1 text-[10px] text-white/45">مساحة الإشارة</p>
        </div>
        <motion.span aria-hidden="true" className="absolute -left-1.5 top-3 h-2 w-2 rounded-full bg-[#b9e978] shadow-[0_0_12px_rgba(185,233,120,0.8)]" animate={reduceMotion ? undefined : { opacity: [1, 0.45, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} />
      </motion.div>
      <p className="relative mt-2 text-center text-xs tracking-[.12em] text-white/40">{tagline}</p>
      {conversationStep && <motion.section layout className="relative z-20 mt-5 w-full rounded-[24px] border border-white/10 bg-[#0d1728]/95 p-5 text-right shadow-[0_24px_70px_rgba(0,0,0,.38)] backdrop-blur-xl sm:p-6" dir={conversationStep === 'language' || language === 'ar' ? 'rtl' : 'ltr'} aria-live="polite">
        <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold tracking-[.2em] text-[#b9e978]"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#b9e978]/10"><span aria-hidden="true">✦</span></span> DEEP-SIGNAL · AI</div>
        <AnimatePresence mode="wait"><motion.p key={conversationStep + language} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="min-h-[3.5rem] text-lg font-semibold leading-8 text-white">{typedText}<motion.span aria-hidden="true" animate={reduceMotion ? undefined : { opacity: [1, 0, 1] }} transition={{ duration: .8, repeat: Infinity }} className="ms-1 inline-block h-5 w-0.5 bg-[#b9e978] align-middle"/></motion.p></AnimatePresence>
        {conversationStep === 'language' ? <div className="mt-5 grid gap-2 sm:grid-cols-3">{([['ar','العربية 🇲🇦'],['fr','Français 🇫🇷'],['en','English 🇺🇸']] as const).map(([value,label])=><motion.button whileHover={{ y: -2 }} whileTap={{ scale: .98 }} key={value} type="button" onClick={()=>onLanguageSelect?.(value)} className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-sm font-medium text-white transition hover:border-[#b9e978]/50 hover:bg-[#b9e978]/[.08]">{label}</motion.button>)}</div> : <div className="mt-5 grid gap-3 sm:grid-cols-2"><motion.button whileTap={{ scale: .98 }} type="button" onClick={onNoTime} className="rounded-xl border border-white/15 px-4 py-3.5 text-sm text-white/75 hover:border-white/30">{language==='ar'?'ليس لدي وقت':language==='fr'?'Pas maintenant':'Not right now'}</motion.button><motion.button whileTap={{ scale: .98 }} type="button" onClick={onYesTime} className="rounded-xl bg-[#b9e978] px-4 py-3.5 text-sm font-bold text-[#10170b]">{language==='ar'?'نعم لدي بعض الوقت لأتسجل':language==='fr'?'Oui, je peux prendre un instant':'Yes, I have time to sign up'}</motion.button></div>}
      </motion.section>}
    </div>
  );
}
