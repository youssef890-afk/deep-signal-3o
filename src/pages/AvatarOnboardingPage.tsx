import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, ImagePlus, Loader2, Sparkles, WandSparkles,
} from 'lucide-react';
import AuthRobot from '@/components/AuthRobot';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  AVATAR_EMOJIS,
  AVATAR_OPTIONS,
  canGenerateAvatar,
  DEFAULT_AVATAR_OPTIONS,
  validateAvatarReference,
  type AvatarOptions,
} from '@/lib/avatarClient';
import { getStoredLanguage } from '@/lib/i18n';

type Step = 'welcome' | 'photo' | 'customize' | 'result';
type AvatarResponse = {
  avatarPath?: string;
  avatarUrl?: string;
  reason?: string;
  availableAt?: string | null;
  error?: string;
};

function ChoiceButton({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm transition ${
        selected
          ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text)]'
          : 'border-[var(--text)]/10 bg-[var(--surface-2)] text-[var(--text)]/70 hover:border-[var(--accent)]/50'
      }`}
    >
      {children}
    </button>
  );
}

function generationMessage(response: AvatarResponse) {
  if (response.reason === 'payment_required') {
    return 'استهلكت المحاولتين المجانيتين. التوليد المدفوع غير متاح حالياً.';
  }
  if (response.reason === 'cooldown') {
    return response.availableAt
      ? `يمكنك إنشاء أفاتار آخر بعد ${new Date(response.availableAt).toLocaleDateString('ar')}.`
      : 'يمكنك إنشاء أفاتار آخر بعد مرور سبعة أيام على أول توليد.';
  }
  if (response.reason === 'generation_unavailable') {
    return 'لم تعد المحاولة متاحة الآن. تحقق من رصيد التوليد وحاول مجدداً.';
  }
  return 'تعذر إنشاء الأفاتار الآن. حاول مرة أخرى.';
}

async function getFunctionResponse(error: unknown): Promise<AvatarResponse> {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = error.context;
    if (context instanceof Response) {
      try {
        return await context.clone().json() as AvatarResponse;
      } catch {
        return { error: 'تعذر إنشاء الأفاتار الآن. حاول مرة أخرى.' };
      }
    }
  }
  return { error: 'تعذر الاتصال بخدمة إنشاء الأفاتار. تحقق من اتصالك وحاول مجدداً.' };
}

export default function AvatarOnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const language = getStoredLanguage();
  const isOnboarding = location.pathname === '/onboarding' || !profile?.onboarding_completed;
  const [step, setStep] = useState<Step>('welcome');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState('');
  const [consent, setConsent] = useState(false);
  const [faceCheckBusy, setFaceCheckBusy] = useState(false);
  const [options, setOptions] = useState<AvatarOptions>(DEFAULT_AVATAR_OPTIONS);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [generatedAvatar, setGeneratedAvatar] = useState<{ path: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [robotStatus, setRobotStatus] = useState<'idle' | 'thinking' | 'error' | 'success'>('idle');

  useEffect(() => {
    return () => {
      if (referencePreview) URL.revokeObjectURL(referencePreview);
    };
  }, [referencePreview]);

  useEffect(() => {
    if (!user || !profile || profile.onboarding_completed || !profile.pending_avatar_url) return;
    try {
      const marker = '/storage/v1/object/public/avatars/';
      const publicUrl = new URL(profile.pending_avatar_url);
      const markerIndex = publicUrl.pathname.indexOf(marker);
      if (markerIndex < 0) return;
      const path = decodeURIComponent(publicUrl.pathname.slice(markerIndex + marker.length));
      if (!path.startsWith(`${user.id}/generated-`)) return;
      setGeneratedAvatar({ path, url: profile.pending_avatar_url });
      setStep('result');
      setRobotStatus('success');
    } catch (error) {
      console.error('Could not restore the pending generated avatar:', error);
    }
  }, [profile, user]);

  const availability = canGenerateAvatar(
    profile?.avatar_generations_used ?? 0,
    profile?.last_avatar_generated_at ?? null
  );
  const selectedSummary = useMemo(
    () => AVATAR_OPTIONS.map((group) => {
      const value = options[group.key] as string;
      const choice = group.choices.find((item) => item.value === value);
      return { label: group.label, value: choice?.label ?? value };
    }),
    [options]
  );

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFaceCheckBusy(true);
    setError('');
    setRobotStatus('thinking');
    setReferenceFile(null);
    setReferencePreview('');
    setConsent(false);
    try {
      const validation = await validateAvatarReference(file);
      if (!validation.valid) {
        setRobotStatus('error');
        setError(validation.message);
        return;
      }
      setReferenceFile(file);
      setReferencePreview(URL.createObjectURL(file));
      setRobotStatus('success');
    } finally {
      setFaceCheckBusy(false);
    }
  };

  const removeReference = () => {
    setReferencePreview('');
    setReferenceFile(null);
    setConsent(false);
  };

  const completeOnboarding = async (payload: { emoji?: string; avatarPath?: string }) => {
    setBusy(true);
    setError('');
    setRobotStatus('thinking');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<AvatarResponse>('generate-avatar', {
        body: { action: 'complete', ...payload },
      });
      if (invokeError || data?.error) {
        const response = invokeError ? await getFunctionResponse(invokeError) : data ?? {};
        setError(generationMessage(response));
        setRobotStatus('error');
        return;
      }
      await refreshProfile();
      navigate(isOnboarding ? '/feed' : '/profile', { replace: true });
    } catch (completionError) {
      console.error('Avatar onboarding could not be completed:', completionError);
      setError('تعذر حفظ الأفاتار الآن. تحقق من اتصالك وحاول مجدداً.');
      setRobotStatus('error');
    } finally {
      setBusy(false);
    }
  };

  const generateAvatar = async () => {
    if (!user || busy) return;
    if (selectedEmoji) {
      await completeOnboarding({ emoji: selectedEmoji });
      return;
    }
    if (!availability.allowed) {
      setError(availability.reason === 'payment_required'
        ? 'استهلكت المحاولتين المجانيتين. التوليد المدفوع غير متاح حالياً.'
        : availability.availableAt
          ? `يمكنك إنشاء أفاتار آخر بعد ${new Date(availability.availableAt).toLocaleDateString('ar')}.`
          : 'يمكنك إنشاء أفاتار آخر بعد مرور سبعة أيام على أول توليد.');
      return;
    }
    if (referenceFile && !consent) {
      setError('وافق على استخدام الصورة لإنشاء الأفاتار قبل المتابعة.');
      return;
    }

    setBusy(true);
    setError('');
    setRobotStatus('thinking');
    let referencePath: string | undefined;
    try {
      if (referenceFile && user) {
        const extension = referenceFile.type === 'image/png'
          ? 'png'
          : referenceFile.type === 'image/webp' ? 'webp' : 'jpg';
        referencePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from('avatar-temp')
          .upload(referencePath, referenceFile, {
            cacheControl: '0',
            contentType: referenceFile.type,
            upsert: false,
          });
        if (uploadError) throw uploadError;
      }

      const { data, error: invokeError } = await supabase.functions.invoke<AvatarResponse>('generate-avatar', {
        body: { action: 'generate', options, ...(referencePath ? { referencePath } : {}) },
      });
      if (invokeError || data?.error || !data?.avatarPath || !data.avatarUrl) {
        const response = invokeError ? await getFunctionResponse(invokeError) : data ?? {};
        throw new Error(generationMessage(response));
      }
      await refreshProfile();
      setGeneratedAvatar({ path: data.avatarPath, url: data.avatarUrl });
      setStep('result');
      setRobotStatus('success');
    } catch (generationError) {
      console.error('Avatar generation failed:', generationError);
      if (referencePath) {
        const { error: cleanupError } = await supabase.storage.from('avatar-temp').remove([referencePath]);
        if (cleanupError) console.error('Temporary avatar photo cleanup failed:', cleanupError);
      }
      setError(generationError instanceof Error
        && /[\u0600-\u06FF]/.test(generationError.message)
        ? generationError.message
        : 'تعذر إنشاء الأفاتار الآن. حاول مرة أخرى.');
      setRobotStatus('error');
    } finally {
      setBusy(false);
    }
  };

  const selectOption = (key: keyof AvatarOptions, value: AvatarOptions[keyof AvatarOptions]) => {
    setOptions((current) => ({ ...current, [key]: value }));
    setSelectedEmoji(null);
    setError('');
  };

  const robotMessage = step === 'welcome'
    ? 'مرحباً! أنا Signal. لنكمل ملفك الشخصي بصورة؛ يمكنك رفع صورتك أو تصميم أفاتار احترافي.'
    : step === 'photo'
      ? 'اختر صورة واضحة يظهر فيها وجهك كاملاً. سأتحقق منها على جهازك قبل رفعها.'
      : step === 'result'
        ? 'هذا هو الأفاتار الذي أنشأته لك. ألقِ نظرة عليه، ثم أكّد استخدامه.'
        : referenceFile && !selectedEmoji
          ? 'سأحوّل هذه الصورة إلى أفاتار متحرك. اختر تفاصيله قبل أن أبدأ.'
          : selectedEmoji
            ? 'إيموجي جميل! اضغط تأكيد لاستخدامه كصورتك الشخصية.'
            : busy
              ? 'أعمل على تصميم أفاتارك الآن. انتظر قليلاً.'
              : 'لنصمم أفاتارك معاً! اختر التفاصيل التي تعبر عنك.';

  return (
    <main dir="rtl" lang="ar" className="min-h-[100dvh] bg-[var(--bg)] px-4 py-6 text-[var(--text)] sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          {!isOnboarding && (
            <button type="button" onClick={() => navigate('/profile')} className="inline-flex items-center gap-2 rounded-xl border border-[var(--text)]/10 px-3 py-2 text-sm text-[var(--text)]/70 hover:text-[var(--text)]">
              <ArrowLeft className="h-4 w-4" />
              الملف الشخصي
            </button>
          )}
          <div className="me-auto text-sm text-[var(--text)]/55">
            {profile?.avatar_generations_used ?? 0} / 2 محاولات مجانية
          </div>
        </header>

        <section className="rounded-[2rem] border border-[var(--text)]/10 bg-[var(--surface-1)]/90 p-4 shadow-2xl sm:p-8">
          <AuthRobot language={language} message={robotMessage} status={robotStatus} />
          <h1 className="mt-5 text-center text-2xl font-bold">
            {isOnboarding ? 'لنصنع صورتك الشخصية' : 'استوديو الأفاتار'}
          </h1>

          {step === 'welcome' && (
            <div className="mx-auto mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => { setStep('photo'); setError(''); setRobotStatus('idle'); }}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] hover:brightness-110"
              >
                <ImagePlus className="h-5 w-5" />
                ارفع صورتك
              </button>
              <button
                type="button"
                onClick={() => { setStep('customize'); setError(''); setRobotStatus('idle'); }}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[var(--text)]/15 bg-[var(--surface-2)] px-4 py-3 font-semibold hover:border-[var(--accent)]/60"
              >
                <WandSparkles className="h-5 w-5" />
                لا أريد رفع صورة، أنشئ أفاتار احترافي
              </button>
              {!isOnboarding && (
                <button type="button" onClick={() => navigate('/profile')} className="text-sm text-[var(--text)]/55 sm:col-span-2">
                  العودة دون تغيير الصورة
                </button>
              )}
            </div>
          )}

          {step === 'photo' && (
            <div className="mx-auto mt-6 max-w-xl">
              <div className="rounded-2xl border border-[var(--text)]/10 bg-[var(--surface-2)]/70 p-4">
                <p className="text-sm leading-7 text-[var(--text)]/70">
                  استخدم صورة واضحة للوجه، بإضاءة جيدة ومن دون قص. لن تُرفع الصورة إلا بعد موافقتك، وستُحذف بعد إنشاء الأفاتار.
                </p>
                <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--text)]/20 px-4 py-6 text-sm hover:border-[var(--accent)]/60">
                  {faceCheckBusy ? <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" /> : <ImagePlus className="h-6 w-6 text-[var(--accent)]" />}
                  <span>{referenceFile ? 'اختر صورة أخرى' : 'اختر صورة من جهازك'}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={faceCheckBusy} onChange={(event) => void handlePhotoChange(event)} className="sr-only" />
                </label>
                {referencePreview && (
                  <div className="mt-4 flex items-center gap-4">
                    <img src={referencePreview} alt="معاينة الصورة" className="h-20 w-20 rounded-2xl object-cover" />
                    <button type="button" onClick={removeReference} className="text-sm text-[var(--text)]/65 underline underline-offset-4">إزالة الصورة</button>
                  </div>
                )}
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-black/10 p-3 text-sm leading-6">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[var(--accent)]"
                  />
                  <span>أوافق على إرسال صورتي إلى مزود التوليد المحدد فقط لإنشاء الأفاتار، وحذف النسخة المؤقتة بعد ذلك.</span>
                </label>
              </div>
              {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!referenceFile || !consent || faceCheckBusy}
                  onClick={() => { setStep('customize'); setError(''); setRobotStatus('idle'); }}
                  className="rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  متابعة لتخصيص الأفاتار
                </button>
                <button type="button" onClick={() => { removeReference(); setStep('customize'); setError(''); }} className="rounded-xl border border-[var(--text)]/10 px-5 py-3 text-sm text-[var(--text)]/65">
                  المتابعة دون صورة
                </button>
              </div>
            </div>
          )}

          {step === 'customize' && (
            <div className="mt-6">
              {referenceFile && (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--text)]/10 bg-[var(--surface-2)]/70 p-3">
                  <img src={referencePreview} alt="الصورة المرجعية" className="h-12 w-12 rounded-xl object-cover" />
                  <div className="text-sm">
                    <p className="font-medium">صورة مرجعية جاهزة</p>
                    <button type="button" onClick={removeReference} className="mt-1 text-xs text-[var(--text)]/55 underline">إزالة الصورة</button>
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {AVATAR_OPTIONS.map((group) => (
                  <fieldset key={group.key} className="min-w-0 rounded-2xl border border-[var(--text)]/10 bg-[var(--surface-2)]/60 p-4">
                    <legend className="px-2 text-sm font-semibold">{group.label}</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.choices.map((choice) => (
                        <ChoiceButton
                          key={choice.value}
                          selected={options[group.key] === choice.value}
                          onClick={() => selectOption(group.key, choice.value)}
                        >
                          {choice.label}
                        </ChoiceButton>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>

              <section className="mt-4 rounded-2xl border border-[var(--text)]/10 bg-[var(--surface-2)]/60 p-4">
                <h2 className="text-sm font-semibold">أو اختر إيموجي كصورتك الشخصية</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {AVATAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={`اختيار ${emoji}`}
                      aria-pressed={selectedEmoji === emoji}
                      onClick={() => { setSelectedEmoji(emoji); setError(''); }}
                      className={`grid h-12 w-12 place-items-center rounded-xl border text-2xl ${
                        selectedEmoji === emoji ? 'border-[var(--accent)] bg-[var(--accent)]/15' : 'border-[var(--text)]/10 bg-[var(--surface-1)]'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </section>

              <section className="mt-4 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-4">
                <h2 className="text-sm font-semibold">ملخص اختياراتك</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedSummary.map(({ label, value }) => (
                    <span key={label} className="rounded-full bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--text)]/70">
                      {label}: {value}
                    </span>
                  ))}
                </div>
              </section>

              {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy || (!selectedEmoji && (!availability.allowed || (referenceFile !== null && !consent)))}
                  onClick={() => void generateAvatar()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedEmoji ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  {busy ? 'جارٍ الإنشاء...' : selectedEmoji ? 'استخدام هذا الإيموجي' : 'أنشئ الأفاتار'}
                </button>
                <button type="button" disabled={busy} onClick={() => { setStep(referenceFile ? 'photo' : 'welcome'); setSelectedEmoji(null); setError(''); }} className="rounded-xl border border-[var(--text)]/10 px-5 py-3 text-sm text-[var(--text)]/65 disabled:opacity-50">
                  رجوع
                </button>
              </div>
              {!availability.allowed && !selectedEmoji && (
                <p className="mt-3 text-xs text-[var(--text)]/55">
                  {availability.reason === 'payment_required'
                    ? 'استهلكت المحاولتين المجانيتين. التوليد المدفوع غير متاح حالياً.'
                    : availability.availableAt
                      ? `المحاولة الثانية متاحة في ${new Date(availability.availableAt).toLocaleDateString('ar')}.`
                      : 'المحاولة الثانية متاحة بعد سبعة أيام من التوليد الأول.'}
                </p>
              )}
            </div>
          )}

          {step === 'result' && generatedAvatar && (
            <div className="mt-6 text-center">
              <div className="avatar-result mx-auto grid h-56 w-56 place-items-center overflow-hidden rounded-full border border-[var(--accent)]/40 bg-[var(--surface-2)] shadow-[0_0_55px_var(--accent-glow)]">
                <img src={generatedAvatar.url} alt="الأفاتار الجديد" className="h-full w-full object-cover" />
              </div>
              <p className="mt-4 text-sm text-[var(--text)]/65">إذا لم يعجبك، يمكنك تعديل الاختيارات وإنشاء نسخة أخرى وفق رصيدك المتاح.</p>
              {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void completeOnboarding({ avatarPath: generatedAvatar.path })}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[var(--accent-foreground)] disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  تأكيد الأفاتار
                </button>
                <button type="button" disabled={busy || !availability.allowed} onClick={() => { setStep('customize'); setGeneratedAvatar(null); setError(''); }} className="rounded-xl border border-[var(--text)]/10 px-5 py-3 text-sm text-[var(--text)]/65 disabled:opacity-50">
                  تعديل وإنشاء نسخة أخرى
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
