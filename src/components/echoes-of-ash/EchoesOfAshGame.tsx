import { useCallback, useEffect, useRef, useState } from 'react';
import { Swords, Crosshair, Heart, Zap, Shield, ChevronRight, RotateCcw } from 'lucide-react';
import { GameEngine, type HUDData } from './engine';
import { chapters, determineEnding, type Choice, type GameStats } from './story';

const SAVE_KEY = 'echoes-of-ash-save-v1';

type GamePhase = 'menu' | 'narration' | 'playing' | 'choice' | 'ending' | 'gameover';

const defaultStats: GameStats = { mercy: 0, rage: 0, evidence: 0, trust: 0 };
const defaultHUD: HUDData = {
  hp: 100, maxHp: 100, stamina: 100, maxStamina: 100,
  ammo: 12, maxAmmo: 12, weapon: 'sword', enemiesRemaining: 0, objective: '',
};

export default function EchoesOfAshGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const narrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<GamePhase>('menu');
  const [chapterIndex, setChapterIndex] = useState(0);
  const [stats, setStats] = useState<GameStats>({ ...defaultStats });
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [hudData, setHudData] = useState<HUDData>(defaultHUD);
  const [narrationStep, setNarrationStep] = useState(0);
  const [dialogueStep, setDialogueStep] = useState(0);
  const [showDialogue, setShowDialogue] = useState(false);
  const [endingText, setEndingText] = useState<string[]>([]);
  const [endingTitle, setEndingTitle] = useState('');
  const [hasSave, setHasSave] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const chapter = chapters[chapterIndex];

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setHasSave(Boolean(localStorage.getItem(SAVE_KEY)));
  }, []);

  const save = useCallback((ci: number, s: GameStats) => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ chapterIndex: ci, stats: s, flags: {} }));
  }, []);

  const clearSave = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    setHasSave(false);
  }, []);

  const resetRunStates = () => {
    setNarrationStep(0);
    setDialogueStep(0);
    setShowDialogue(false);
    setSelectedChoice(null);
    setHudData(defaultHUD);
  };

  const startChapter = useCallback((ci: number, currentStats: GameStats) => {
    setChapterIndex(ci);
    setStats(currentStats);
    setNarrationStep(0);
    setDialogueStep(0);
    setShowDialogue(false);
    setSelectedChoice(null);
    setPhase('narration');
    engineRef.current?.loadArena(chapters[ci].arena, chapters[ci].enemies);
  }, []);

  const initEngine = useCallback((ci: number) => {
    if (!containerRef.current) return;
    engineRef.current?.dispose();
    const engine = new GameEngine(containerRef.current, {
      onEnemyDefeated: () => { /* small HUD update is already sent by engine */ },
      onPlayerDeath: () => setPhase('gameover'),
      updateHUD: (data) => setHudData(data),
      onObjectiveComplete: () => {
        narrationTimerRef.current = setTimeout(() => setPhase('choice'), 900);
      },
    });
    engineRef.current = engine;
    engine.loadArena(chapters[ci].arena, chapters[ci].enemies);
    const ro = new ResizeObserver(() => {
      if (containerRef.current && engineRef.current) {
        engineRef.current.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    });
    ro.observe(containerRef.current);
  }, []);

  const startNewGame = () => {
    clearSave();
    const newStats = { ...defaultStats };
    setStats(newStats);
    setChapterIndex(0);
    resetRunStates();
    setPhase('narration');
    requestAnimationFrame(() => initEngine(0));
  };

  const continueGame = () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setStats(data.stats);
        setChapterIndex(data.chapterIndex);
        resetRunStates();
        setPhase('narration');
        requestAnimationFrame(() => initEngine(data.chapterIndex));
        return;
      }
    } catch { /* fallback */ }
    startNewGame();
  };

  const retryChapter = () => {
    resetRunStates();
    setPhase('narration');
    requestAnimationFrame(() => initEngine(chapterIndex));
  };

  const returnToMenu = () => {
    engineRef.current?.dispose();
    engineRef.current = null;
    setPhase('menu');
    setHasSave(Boolean(localStorage.getItem(SAVE_KEY)));
  };

  const nextNarration = () => {
    const ch = chapters[chapterIndex];
    if (!showDialogue && narrationStep < ch.narration.length - 1) {
      setNarrationStep(prev => prev + 1);
      return;
    }
    if (!showDialogue) {
      setShowDialogue(true);
      setDialogueStep(0);
      return;
    }
    if (dialogueStep < ch.dialogue.length - 1) {
      setDialogueStep(prev => prev + 1);
      return;
    }
    setPhase('playing');
  };

  const handleChoice = (choice: Choice) => {
    if (selectedChoice) return;
    setSelectedChoice(choice.id);
    const newStats = { ...stats };
    for (const [key, val] of Object.entries(choice.effects)) {
      const k = key as keyof GameStats;
      newStats[k] = (newStats[k] || 0) + (val || 0);
    }
    setStats(newStats);

    if (chapterIndex === chapters.length - 1) {
      const end = determineEnding(newStats, choice.id);
      setEndingTitle(end.title);
      setEndingText(end.text);
      clearSave();
      setTimeout(() => setPhase('ending'), 700);
      return;
    }

    const nextCi = chapterIndex + 1;
    save(nextCi, newStats);
    setTimeout(() => {
      startChapter(nextCi, newStats);
      if (engineRef.current) {
        engineRef.current.loadArena(chapters[nextCi].arena, chapters[nextCi].enemies);
      }
    }, 900);
  };

  useEffect(() => {
    if (phase !== 'narration') return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault();
        nextNarration();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      if (narrationTimerRef.current) clearTimeout(narrationTimerRef.current);
    };
  }, []);

  if (phase === 'menu') {
    return (
      <div className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4" dir="rtl">
        <div className="absolute top-16 h-72 w-72 rounded-full bg-amber-600/15 blur-3xl" />
        <div className="absolute bottom-16 h-72 w-72 rounded-full bg-red-900/20 blur-3xl" />
        <div className="relative text-center">
          <p className="text-sm uppercase tracking-widest text-amber-200/50">Deep Signal / World 01</p>
          <h1 className="mt-3 text-5xl font-black text-amber-50 drop-shadow-lg sm:text-7xl">صدى الرماد</h1>
          <p className="mt-4 text-lg text-amber-100/70">لعبة أكشن وتفاعلية 3D في عالم مفتوح</p>
          <p className="mt-2 text-sm leading-7 text-white/50">عائلة في الغابة. مدينة محرمة. حقيقة تستحق النجاة.</p>
        </div>
        <div className="relative mt-10">
          <button
            onClick={startNewGame}
            className="inline-flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-600/25 to-red-600/25 px-8 py-4 text-lg font-bold text-amber-100 transition hover:scale-105 hover:border-amber-400/50"
          >
            <Swords className="h-6 w-6" />
            ابدأ الرحلة
          </button>
          {hasSave && (
            <button
              onClick={continueGame}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-6 py-3 text-sm text-white/70 transition hover:bg-white/[0.08]"
            >
              <RotateCcw className="h-4 w-4" />
              متابعة اللعب
            </button>
          )}
        </div>
        <p className="relative mt-8 text-center text-xs leading-6 text-white/35">
          WASD /الأسهم للحركة | Shift للركض | Space/F الهجوم | E المراوغة | 1/2 أو Q تبديل السلاح<br />
          على الهاتف: أثناء اللعب استخدم الأزرار. يُنصح باستعمال حاسوب لتجربة أسلس.
        </p>
      </div>
    );
  }

  if (phase === 'gameover') {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center px-4 text-center" dir="rtl">
        <h2 className="text-4xl font-black text-red-400">سقط آدم</h2>
        <p className="mt-3 text-lg text-white/50">لكن الحكاية لم تنتهِ. اعد الفصل وحاول من جديد.</p>
        <button onClick={retryChapter} className="mt-8 inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-3 text-red-200 transition hover:bg-red-500/20">
          <RotateCcw className="h-5 w-5" />إعادة المحاولة
        </button>
        <button onClick={returnToMenu} className="mt-3 text-xs text-white/30 hover:text-white/50">العودة للقائمة</button>
      </div>
    );
  }

  if (phase === 'ending') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6" dir="rtl">
        <div className="rounded-2xl border border-amber-500/20 bg-black/70 p-8 backdrop-blur-xl">
          <p className="text-xs font-medium text-amber-400/60">النهاية</p>
          <h2 className="mt-1 text-3xl font-black text-amber-100">{endingTitle}</h2>
          <div className="mt-6 space-y-4">
            {endingText.map((line, i) => <p key={i} className="leading-relaxed text-white/70">{line}</p>)}
          </div>
          <div className="mt-8 grid grid-cols-4 gap-3 rounded-xl bg-black/30 p-4 text-center">
            <div><p className="text-lg font-bold text-emerald-300">{stats.mercy}</p><p className="text-xs text-white/40">رحمة</p></div>
            <div><p className="text-lg font-bold text-red-300">{stats.rage}</p><p className="text-xs text-white/40">غضب</p></div>
            <div><p className="text-lg font-bold text-blue-300">{stats.evidence}</p><p className="text-xs text-white/40">دليل</p></div>
            <div><p className="text-lg font-bold text-purple-300">{stats.trust}</p><p className="text-xs text-white/40">ثقة</p></div>
          </div>
          <button onClick={returnToMenu} className="mt-6 w-full rounded-xl bg-amber-500/15 px-4 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-500/25">العودة للقائمة</button>
        </div>
      </div>
    );
  }

  const currentNarrative = showDialogue ? chapter.dialogue[dialogueStep] : null;

  return (
    <div className="relative h-[calc(100dvh-140px)] min-h-[420px] w-full" dir="ltr">
      <div ref={containerRef} className="absolute inset-0 overflow-hidden rounded-xl border border-white/5 bg-black" />

      {phase === 'playing' && (
        <>
          <div className="absolute left-3 top-3 z-10 rounded-lg bg-black/65 px-3 py-2 text-right backdrop-blur-sm" dir="rtl">
            <p className="text-xs font-bold text-amber-200">{chapter.title}: {chapter.subtitle}</p>
            <p className="mt-0.5 text-[10px] text-white/50">{hudData.objective}</p>
          </div>
          <div className="absolute right-3 top-3 z-10 rounded-lg bg-black/65 px-3 py-2 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Heart className="h-3.5 w-3.5 text-red-400" />
              <div className="h-2.5 w-28 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-red-500" style={{ width: `${(hudData.hp / hudData.maxHp) * 100}%` }} />
              </div>
              <span className="text-xs font-bold text-red-300">{hudData.hp}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-yellow-400" />
              <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-yellow-400" style={{ width: `${(hudData.stamina / hudData.maxStamina) * 100}%` }} />
              </div>
              <span className="text-xs font-bold text-yellow-300">{hudData.stamina}</span>
            </div>
          </div>
          <div className="absolute bottom-6 left-4 z-20 flex items-center gap-2 rounded-xl bg-black/65 px-3 py-2 backdrop-blur-sm">
            {hudData.weapon === 'sword' ? <Swords className="h-5 w-5 text-blue-300" /> : <Crosshair className="h-5 w-5 text-orange-300" />}
            <span className="text-sm font-bold text-white">{hudData.weapon === 'sword' ? 'سيف' : `${hudData.ammo}/${hudData.maxAmmo}`}</span>
          </div>
          {isMobile && (
            <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-3">
              <MobileControls engineRef={engineRef} hudData={hudData} />
            </div>
          )}
          <button onClick={() => setPhase('choice')} className="absolute top-16 right-3 z-10 hidden text-xs text-white/20">تخطي</button>
        </>
      )}

      {phase === 'narration' && (
        <div className="absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-black/95 via-black/60 to-black/20 p-4 pb-12" onClick={nextNarration}>
          <div className="mx-auto max-w-2xl text-center" dir="rtl">
            <p className="text-xs font-medium text-amber-400/60">{chapter.title}: {chapter.subtitle}</p>
            {!showDialogue ? (
              <p key={narrationStep} className="mt-3 animate-fade-in text-lg leading-relaxed text-white/85 sm:text-xl">
                {chapter.narration[narrationStep]}
              </p>
            ) : (
              <div key={dialogueStep} className="animate-fade-in">
                <p className="text-sm font-bold text-amber-300">{currentNarrative?.speaker}</p>
                <p className="mt-2 text-lg leading-relaxed text-white/90 sm:text-xl">«{currentNarrative?.text}»</p>
              </div>
            )}
            <button onClick={(e) => { e.stopPropagation(); nextNarration(); }} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-4 py-2 text-xs text-white/60 transition hover:bg-white/10">
              التالي <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {phase === 'choice' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-md text-center" dir="rtl">
            <p className="text-xs text-amber-400/60">المصير بين يديك</p>
            <h3 className="mt-2 text-xl font-bold text-amber-100">{chapter.choicePrompt}</h3>
            <div className="mt-6 space-y-3">
              {chapter.choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleChoice(choice)}
                  disabled={selectedChoice !== null}
                  className={`w-full rounded-xl border px-5 py-4 text-right text-sm font-medium transition-all ${selectedChoice === choice.id ? 'border-amber-400/50 bg-amber-500/15 text-amber-100' : 'border-white/10 bg-white/[0.04] text-white/80 hover:border-amber-500/30 hover:bg-amber-500/10'}`}
                >
                  {choice.text}
                </button>
              ))}
            </div>
            {selectedChoice && <p className="mt-4 text-xs text-amber-200/60">رحلتك تتغير ...</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileControls({
  engineRef,
  hudData,
}: {
  engineRef: React.MutableRefObject<GameEngine | null>;
  hudData: HUDData;
}) {
  const press = (type: 'attack' | 'dodge') => () => {
    if (engineRef.current) {
      if (type === 'attack') engineRef.current.mobileInput.attack = true;
      else engineRef.current.mobileInput.dodge = true;
    }
  };
  const setMove = (x: number, z: number) => () => {
    if (engineRef.current) {
      engineRef.current.mobileInput.moveX = x;
      engineRef.current.mobileInput.moveZ = z;
    }
  };
  const releaseMove = () => {
    if (engineRef.current) {
      engineRef.current.mobileInput.moveX = 0;
      engineRef.current.mobileInput.moveZ = 0;
    }
  };

  return (
    <div className="flex items-end gap-2" onTouchEnd={releaseMove}>
      <div className="grid grid-cols-3 grid-rows-3 gap-1 rounded-2xl bg-black/40 p-2">
        <span /><button onTouchStart={setMove(0, -1)} className="h-8 w-8 rounded bg-white/10 text-white">↑</button><span />
        <button onTouchStart={setMove(-1, 0)} className="h-8 w-8 rounded bg-white/10 text-white">←</button>
        <span />
        <button onTouchStart={setMove(1, 0)} className="h-8 w-8 rounded bg-white/10 text-white">→</button>
        <span /><button onTouchStart={setMove(0, 1)} className="h-8 w-8 rounded bg-white/10 text-white">↓</button><span />
      </div>
      <div className="flex gap-2">
        <button onClick={() => engineRef.current?.setWeapon(hudData.weapon === 'sword' ? 'pistol' : 'sword')} className="h-12 w-12 rounded-full bg-blue-500/30 text-white text-xs">تبديل</button>
        <button onTouchStart={press('dodge')} className="h-12 w-12 rounded-full bg-amber-500/30 p-2 text-white"><Shield className="h-full w-full" /></button>
        <button onTouchStart={press('attack')} className="h-14 w-14 rounded-full bg-red-500/40 p-3 text-white">{hudData.weapon === 'sword' ? <Swords className="h-full w-full" /> : <Crosshair className="h-full w-full" />}</button>
      </div>
    </div>
  );
}
