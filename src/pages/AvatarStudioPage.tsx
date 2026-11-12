import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, Download, RotateCcw, RotateCw,
  Save, Shuffle, Sparkles, UserRound, Shirt, Eye, Scissors, Glasses,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const skinTones = [
  { value: '#f5d0b5', label: 'فاتحة' }, { value: '#e8b48d', label: 'قمحية' },
  { value: '#c98761', label: 'سمراء' }, { value: '#965b3f', label: 'بنية' },
  { value: '#603a2d', label: 'داكنة' },
];
const hairColors = [
  { value: '#211915', label: 'أسود' }, { value: '#583626', label: 'بني' },
  { value: '#b88b45', label: 'أشقر' }, { value: '#a84d38', label: 'نحاسي' },
  { value: '#d5d2d0', label: 'فضي' }, { value: '#5369c8', label: 'أزرق' },
  { value: '#a84d91', label: 'وردي' },
];
const eyeColors = [
  { value: '#4b3024', label: 'بني' }, { value: '#608b68', label: 'أخضر' },
  { value: '#668fb6', label: 'أزرق' }, { value: '#a77a3e', label: 'عسلي' },
];
const outfitColors = [
  { value: '#202b46', label: 'كحلي' }, { value: '#17191f', label: 'أسود' },
  { value: '#e6e7eb', label: 'أبيض' }, { value: '#557b68', label: 'أخضر' },
  { value: '#a84f4f', label: 'أحمر' }, { value: '#8063a9', label: 'بنفسجي' },
  { value: '#d39a43', label: 'ذهبي' },
];

type AvatarConfig = {
  skin: string; hair: string; hairStyle: 'short' | 'curly' | 'long' | 'fade' | 'bald';
  eyes: string; face: 'oval' | 'round' | 'square'; expression: 'smile' | 'calm' | 'laugh';
  beard: 'none' | 'stubble' | 'short' | 'full' | 'mustache';
  outfit: 'tee' | 'hoodie' | 'jacket' | 'suit'; outfitColor: string;
  accessory: 'none' | 'glasses' | 'cap' | 'headphones'; background: 'violet' | 'blue' | 'green' | 'sunset';
};

const DEFAULT_CONFIG: AvatarConfig = {
  skin: '#c98761', hair: '#211915', hairStyle: 'short', eyes: '#4b3024',
  face: 'oval', expression: 'smile', beard: 'none', outfit: 'hoodie',
  outfitColor: '#202b46', accessory: 'none', background: 'violet',
};

const groups = [
  { id: 'face', label: 'الوجه', Icon: UserRound, fields: ['skin', 'face', 'eyes', 'expression'] },
  { id: 'hair', label: 'الشعر', Icon: Scissors, fields: ['hairStyle', 'hair'] },
  { id: 'beard', label: 'اللحية', Icon: Sparkles, fields: ['beard'] },
  { id: 'clothes', label: 'الملابس', Icon: Shirt, fields: ['outfit', 'outfitColor'] },
  { id: 'accessories', label: 'الإكسسوارات', Icon: Glasses, fields: ['accessory'] },
  { id: 'scene', label: 'الخلفية', Icon: Eye, fields: ['background'] },
] as const;

function AvatarIllustration({ config, svgRef }: { config: AvatarConfig; svgRef?: RefObject<SVGSVGElement> }) {
  const facePath = config.face === 'round'
    ? 'M180 92 C116 92 104 146 111 207 C117 260 146 290 180 290 C214 290 243 260 249 207 C256 146 244 92 180 92Z'
    : config.face === 'square'
      ? 'M117 111 Q180 76 243 111 L239 224 Q230 281 180 291 Q130 281 121 224Z'
      : 'M180 88 C126 88 111 132 116 195 C120 255 149 290 180 290 C211 290 240 255 244 195 C249 132 234 88 180 88Z';
  const bg = config.background === 'blue' ? ['#152b50', '#314c83']
    : config.background === 'green' ? ['#163b35', '#477b68']
      : config.background === 'sunset' ? ['#613b49', '#d58c5b'] : ['#30254d', '#65528f'];
  return (
    <svg ref={svgRef} viewBox="0 0 360 440" role="img" aria-label="معاينة الشخصية" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <defs>
        <linearGradient id="avatar-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={bg[0]} /><stop offset="100%" stopColor={bg[1]} />
        </linearGradient>
        <linearGradient id="avatar-shirt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={config.outfitColor} /><stop offset="100%" stopColor={config.outfitColor} />
        </linearGradient>
      </defs>
      <rect width="360" height="440" rx="28" fill="url(#avatar-bg)" />
      <circle cx="54" cy="70" r="42" fill="#fff" opacity=".06" />
      <circle cx="310" cy="350" r="76" fill="#fff" opacity=".05" />
      <ellipse cx="180" cy="405" rx="116" ry="15" fill="#090d18" opacity=".25" />
      <path d="M72 440 Q82 330 145 315 L180 328 L215 315 Q278 330 288 440Z" fill="url(#avatar-shirt)" />
      {config.outfit === 'hoodie' && <path d="M139 321 Q180 354 221 321 L241 440 H119Z" fill={config.outfitColor} stroke="#ffffff" strokeOpacity=".12" strokeWidth="3" />}
      {config.outfit === 'jacket' && <path d="M144 319 L180 357 L216 319 L240 440 H120Z" fill={config.outfitColor} stroke="#ffffff" strokeOpacity=".2" strokeWidth="3" />}
      {config.outfit === 'suit' && <><path d="M142 319 L180 356 L218 319 L244 440 H116Z" fill={config.outfitColor} /><path d="M145 320 L180 357 L164 440 H135Z" fill="#e9e7e2" /><path d="M215 320 L180 357 L196 440 H225Z" fill="#e9e7e2" /><path d="M180 358 L170 383 L180 398 L190 383Z" fill="#b44d58" /></>}
      <path d="M154 268 H206 V331 Q180 354 154 331Z" fill={config.skin} />
      <ellipse cx="116" cy="194" rx="14" ry="24" fill={config.skin} />
      <ellipse cx="244" cy="194" rx="14" ry="24" fill={config.skin} />
      {config.hairStyle === 'long' && <path d="M111 145 Q92 196 109 291 L137 310 L137 170Z M249 145 Q268 196 251 291 L223 310 L223 170Z" fill={config.hair} />}
      <path d={facePath} fill={config.skin} />
      {config.hairStyle !== 'bald' && (
        <g fill={config.hair}>
          {config.hairStyle === 'curly' ? <><path d="M112 151 Q96 95 137 84 Q147 57 176 76 Q207 54 225 83 Q264 83 249 154 Q233 119 215 122 Q185 101 157 122 Q130 112 112 151Z" /><circle cx="124" cy="110" r="17"/><circle cx="148" cy="88" r="18"/><circle cx="178" cy="82" r="17"/><circle cx="207" cy="91" r="18"/><circle cx="236" cy="112" r="17"/></>
            : config.hairStyle === 'fade' ? <path d="M113 156 Q104 93 150 84 Q190 67 226 88 Q256 108 247 157 Q226 124 210 123 Q180 106 149 125 Q128 126 113 156Z" />
              : <path d="M111 157 Q103 99 144 84 Q181 64 218 83 Q257 98 249 157 Q224 122 202 123 Q170 103 143 128 Q125 130 111 157Z" />}
        </g>
      )}
      <path d="M139 178 Q153 168 166 177" stroke={config.hair} strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M194 177 Q208 168 221 178" stroke={config.hair} strokeWidth="6" strokeLinecap="round" fill="none" />
      <ellipse cx="153" cy="197" rx="9" ry="6" fill="#fff" /><ellipse cx="207" cy="197" rx="9" ry="6" fill="#fff" />
      <circle cx="154" cy="197" r="4.5" fill={config.eyes} /><circle cx="206" cy="197" r="4.5" fill={config.eyes} />
      <circle cx="155" cy="195" r="1.5" fill="#fff" /><circle cx="207" cy="195" r="1.5" fill="#fff" />
      <path d="M180 204 Q171 230 181 232" stroke="#754b39" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".65" />
      {config.expression === 'calm'
        ? <path d="M161 254 Q180 257 199 254" stroke="#743e3d" strokeWidth="4" strokeLinecap="round" fill="none" />
        : config.expression === 'laugh'
          ? <path d="M157 247 Q180 281 203 247 Q180 265 157 247Z" fill="#743e3d" />
          : <path d="M159 250 Q180 270 201 250" stroke="#743e3d" strokeWidth="4" strokeLinecap="round" fill="none" />}
      {config.beard !== 'none' && config.beard !== 'mustache' && <path d={config.beard === 'full' ? 'M126 226 Q131 278 180 292 Q229 278 234 226 Q221 250 206 244 Q180 259 154 244 Q139 250 126 226Z' : 'M133 235 Q143 270 180 277 Q217 270 227 235 Q211 251 197 246 Q180 255 163 246 Q149 251 133 235Z'} fill={config.hair} opacity={config.beard === 'stubble' ? '.38' : '.92'} />}
      {(config.beard === 'mustache' || config.beard === 'short' || config.beard === 'full') && <path d="M159 235 Q169 224 180 235 Q191 224 201 235 Q193 248 180 243 Q167 248 159 235Z" fill={config.hair} />}
      {config.accessory === 'glasses' && <g fill="none" stroke="#1b1b24" strokeWidth="5"><rect x="132" y="184" width="39" height="28" rx="10" /><rect x="189" y="184" width="39" height="28" rx="10" /><path d="M171 194 H189 M132 194 L119 188 M228 194 L241 188" /></g>}
      {config.accessory === 'headphones' && <g fill="none" stroke="#252637" strokeWidth="12"><path d="M116 194 V165 Q116 93 180 93 Q244 93 244 165 V194" /><rect x="108" y="179" width="18" height="44" rx="8" fill="#4e526c" stroke="none" /><rect x="234" y="179" width="18" height="44" rx="8" fill="#4e526c" stroke="none" /></g>}
      {config.accessory === 'cap' && <g><path d="M112 145 Q116 76 180 78 Q244 76 248 145 Q181 122 112 145Z" fill={config.hair} /><path d="M112 143 Q180 127 260 150 Q202 170 112 143Z" fill="#202331" /></g>}
      {config.outfit === 'hoodie' && <path d="M146 319 Q180 360 214 319" fill="none" stroke="#ffffff" strokeOpacity=".18" strokeWidth="4" />
      }
    </svg>
  );
}

type Field = keyof AvatarConfig;
const fieldLabels: Record<Field, string> = {
  skin: 'لون البشرة', face: 'شكل الوجه', eyes: 'لون العينين', expression: 'التعبير',
  hairStyle: 'تسريحة الشعر', hair: 'لون الشعر', beard: 'اللحية والشارب',
  outfit: 'نوع الملابس', outfitColor: 'لون الملابس', accessory: 'الإكسسوارات', background: 'الخلفية',
};
const choices: Partial<Record<Field, { value: string; label: string; color?: string }[]>> = {
  skin: skinTones.map((x) => ({ value: x.value, label: x.label, color: x.value })),
  hair: hairColors.map((x) => ({ value: x.value, label: x.label, color: x.value })),
  eyes: eyeColors.map((x) => ({ value: x.value, label: x.label, color: x.value })),
  outfitColor: outfitColors.map((x) => ({ value: x.value, label: x.label, color: x.value })),
  face: [{ value: 'oval', label: 'بيضاوي' }, { value: 'round', label: 'دائري' }, { value: 'square', label: 'مربع' }],
  expression: [{ value: 'smile', label: 'مبتسم' }, { value: 'calm', label: 'هادئ' }, { value: 'laugh', label: 'يضحك' }],
  hairStyle: [{ value: 'short', label: 'قصير' }, { value: 'curly', label: 'مجعد' }, { value: 'long', label: 'طويل' }, { value: 'fade', label: 'Fade' }, { value: 'bald', label: 'بدون شعر' }],
  beard: [{ value: 'none', label: 'بدون' }, { value: 'stubble', label: 'خفيفة' }, { value: 'short', label: 'قصيرة' }, { value: 'full', label: 'كثيفة' }, { value: 'mustache', label: 'شارب' }],
  outfit: [{ value: 'tee', label: 'تيشيرت' }, { value: 'hoodie', label: 'هودي' }, { value: 'jacket', label: 'سترة' }, { value: 'suit', label: 'بدلة' }],
  accessory: [{ value: 'none', label: 'بدون' }, { value: 'glasses', label: 'نظارات' }, { value: 'cap', label: 'قبعة' }, { value: 'headphones', label: 'سماعات' }],
  background: [{ value: 'violet', label: 'بنفسجي' }, { value: 'blue', label: 'أزرق' }, { value: 'green', label: 'أخضر' }, { value: 'sunset', label: 'غروب' }],
};

export default function AvatarStudioPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_CONFIG);
  const [history, setHistory] = useState<AvatarConfig[]>([DEFAULT_CONFIG]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activeGroup, setActiveGroup] = useState<string>('face');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = profile?.avatar_config ?? null;
    if (!stored || typeof stored !== 'object') return;
    const next = { ...DEFAULT_CONFIG, ...stored } as AvatarConfig;
    setConfig(next);
    setHistory([next]);
    setHistoryIndex(0);
  }, [profile]);

  const activeFields = useMemo(() => groups.find((group) => group.id === activeGroup)?.fields ?? [], [activeGroup]);

  const change = (field: Field, value: string) => {
    const next = { ...config, [field]: value } as AvatarConfig;
    setConfig(next);
    setHistory((current) => current.slice(0, historyIndex + 1).concat(next).slice(-40));
    setHistoryIndex((current) => Math.min(current + 1, 39));
    setSaved(false);
    setError('');
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setConfig(history[nextIndex]);
    setSaved(false);
  };
  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setConfig(history[nextIndex]);
    setSaved(false);
  };
  const randomize = () => {
    const next = { ...DEFAULT_CONFIG } as AvatarConfig;
    (Object.keys(choices) as Field[]).forEach((field) => {
      const list = choices[field];
      if (!list?.length) return;
      const picked = list[Math.floor(Math.random() * list.length)];
      (next as unknown as Record<string, string>)[field] = picked.value;
    });
    setConfig(next);
    setHistory((current) => current.slice(0, historyIndex + 1).concat(next).slice(-40));
    setHistoryIndex((current) => Math.min(current + 1, 39));
    setSaved(false);
  };

  const getSvgDataUrl = () => {
    if (!svgRef.current) throw new Error('المعاينة غير جاهزة بعد.');
    const serialized = new XMLSerializer().serializeToString(svgRef.current);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialized);
  };

  const saveAvatar = async () => {
    if (!user || saving) return;
    setSaving(true);
    setError('');
    try {
      const avatarUrl = getSvgDataUrl();
      const { error: saveError } = await supabase.from('profiles').update({
        avatar_url: avatarUrl,
        avatar_type: 'generated',
        avatar_config: config,
      }).eq('id', user.id).select('id').single();
      if (saveError) throw saveError;
      await refreshProfile();
      setSaved(true);
    } catch (saveError) {
      console.error('Avatar Studio save failed:', saveError);
      setError('تعذر حفظ الشخصية. تأكد من تطبيق تحديث قاعدة البيانات ثم حاول مجدداً.');
    } finally {
      setSaving(false);
    }
  };

  const exportPng = async () => {
    try {
      const image = new Image();
      const url = getSvgDataUrl();
      const objectUrl = URL.createObjectURL(new Blob([decodeURIComponent(url.split(',')[1])], { type: 'image/svg+xml;charset=utf-8' }));
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1320;
        const context = canvas.getContext('2d');
        if (!context) {
          URL.revokeObjectURL(objectUrl);
          setError('تعذر تجهيز الصورة للتصدير.');
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            setError('تعذر إنشاء ملف PNG.');
            return;
          }
          const downloadUrl = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = downloadUrl;
          anchor.download = 'deep-signal-avatar.png';
          anchor.click();
          URL.revokeObjectURL(downloadUrl);
        }, 'image/png');
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setError('تعذر تصدير الصورة. حاول مرة أخرى.');
      };
      image.src = objectUrl;
    } catch (exportError) {
      console.error('Avatar export failed:', exportError);
      setError('تعذر تصدير الصورة الآن.');
    }
  };

  const reset = () => {
    setConfig(DEFAULT_CONFIG);
    setHistory((current) => current.slice(0, historyIndex + 1).concat(DEFAULT_CONFIG).slice(-40));
    setHistoryIndex((current) => Math.min(current + 1, 39));
    setSaved(false);
  };

  return (
    <main dir="rtl" lang="ar" className="min-h-[calc(100dvh-68px)] px-3 py-5 text-[var(--text)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/profile')} aria-label="العودة للملف الشخصي" className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]"><ArrowLeft className="h-4 w-4" /></button>
            <div><p className="text-xs font-semibold uppercase tracking-[.22em] text-[var(--accent)]">DEEP SIGNAL / CREATOR</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">استوديو الأفاتار</h1><p className="mt-1 text-sm text-[var(--text)]/55">صمّم شخصيتك واحفظها في ملفك الشخصي</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={undo} disabled={historyIndex <= 0} title="تراجع" className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] disabled:opacity-30"><RotateCcw className="h-4 w-4" /></button>
            <button type="button" onClick={redo} disabled={historyIndex >= history.length - 1} title="إعادة" className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] disabled:opacity-30"><RotateCw className="h-4 w-4" /></button>
            <button type="button" onClick={randomize} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm hover:border-[var(--accent)]"><Shuffle className="h-4 w-4" /> عشوائي</button>
            <button type="button" onClick={reset} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm hover:border-[var(--accent)]"><RotateCcw className="h-4 w-4" /> إعادة ضبط</button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
          <section className="order-2 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-5 lg:order-1">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">معاينة الشخصية</h2><p className="mt-1 text-xs text-[var(--text)]/45">التغييرات تظهر مباشرة</p></div><span className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-3 py-1 text-xs text-[var(--accent)]">2D Avatar</span></div>
            <div className="mx-auto aspect-[9/11] w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/10 bg-[#171725] shadow-2xl">
              <AvatarIllustration config={config} svgRef={svgRef} />
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => void exportPng()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold hover:border-[var(--accent)]"><Download className="h-4 w-4" /> تصدير PNG</button>
              <button type="button" onClick={() => void saveAvatar()} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-foreground)] hover:brightness-110 disabled:opacity-60">{saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}{saving ? 'جارٍ الحفظ...' : saved ? 'تم الحفظ' : 'حفظ في حسابي'}</button>
            </div>
            {error && <p role="alert" className="mt-3 text-center text-sm text-red-400">{error}</p>}
            <p className="mt-4 text-center text-xs leading-6 text-[var(--text)]/45">التصميم اليدوي مجاني ولا يستهلك محاولات توليد الصور بالذكاء الاصطناعي.</p>
          </section>

          <section className="order-1 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] lg:order-2">
            <div className="border-b border-[var(--border)] p-4"><h2 className="font-bold">خصّص شخصيتك</h2><p className="mt-1 text-xs text-[var(--text)]/50">اختر الفئة ثم اضغط على الشكل الذي تريده</p></div>
            <div className="grid grid-cols-3 gap-1 border-b border-[var(--border)] p-2 sm:grid-cols-6 lg:grid-cols-3">
              {groups.map((group) => {
                const Icon = group.Icon;
                return <button key={group.id} type="button" onClick={() => setActiveGroup(group.id)} className={'flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs transition ' + (activeGroup === group.id ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-[var(--text)]/55 hover:bg-[var(--text)]/5')}><Icon className="h-5 w-5" />{group.label}</button>;
              })}
            </div>
            <div className="space-y-5 p-4">
              {activeFields.map((field) => {
                const options = choices[field as Field] ?? [];
                return <div key={field}>
                  <h3 className="mb-3 text-sm font-semibold">{fieldLabels[field as Field]}</h3>
                  <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                      const selected = config[field as Field] === option.value;
                      return <button key={option.value} type="button" onClick={() => change(field as Field, option.value)} aria-pressed={selected} className={'inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ' + (selected ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text)]' : 'border-[var(--border)] text-[var(--text)]/65 hover:border-[var(--accent)]/50')}>
                        {option.color && <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: option.color }} />}
                        {option.label}
                        {selected && <Check className="h-3 w-3 text-[var(--accent)]" />}
                      </button>;
                    })}
                  </div>
                </div>;
              })}
              <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-3 text-xs leading-6 text-[var(--text)]/60">
                <strong className="text-[var(--text)]">معلومة:</strong> يمكنك تعديل الشخصية وحفظها مرات متعددة. حفظ التصميم لا يستهلك المحاولتين المجانيتين المخصصتين لتوليد الصور بالذكاء الاصطناعي.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
