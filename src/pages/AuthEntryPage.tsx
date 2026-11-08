import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, AudioLines, Bot, Check, Eye, EyeOff, KeyRound, Loader2, Mail, UserRound, UsersRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AuthCodeInput from '@/components/AuthCodeInput';
import AuthRobot from '@/components/AuthRobot';
import LoginLanguagePicker from '@/components/LoginLanguagePicker';
import { directionForLanguage, getStoredLanguage, setStoredLanguage, type Language } from '@/lib/i18n';
import { formatAuthMessage, translateAuth } from '@/i18n/auth';
import { supabase } from '@/lib/supabase';

type Screen =
  | 'welcome' | 'consent' | 'pause' | 'fork'
  | 'signupAccount' | 'signupIdentity' | 'signupBirth' | 'signupCode'
  | 'login' | 'forgotEmail' | 'recoveryCode';
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';
type ErrorField = 'email' | 'password' | 'username' | 'birthDate' | 'code' | null;
type Props = { initialScreen?: Screen };

const signupScreens: Screen[] = ['signupAccount', 'signupIdentity', 'signupBirth', 'signupCode'];
const signupStepLabels = ['accountStep', 'identityStep', 'birthStep', 'verifyStep'] as const;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getErrorMessage(error: unknown, language: Language, fallback: 'loginError' | 'unexpectedError' = 'unexpectedError') {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('rate limit') || message.includes('too many')) return translateAuth(language, 'rateLimit');
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) return translateAuth(language, 'networkError');
  return translateAuth(language, fallback);
}

function getCodeError(error: unknown, language: Language) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('rate limit') || message.includes('too many')) return translateAuth(language, 'rateLimit');
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) return translateAuth(language, 'networkError');
  return translateAuth(language, 'codeWrong');
}

function PasswordStrength({ password, language }: { password: string; language: Language }) {
  const strength = password.length < 8 ? 0 : password.length >= 12 && /[A-Z]/.test(password) && /\d/.test(password) ? 2 : 1;
  const labels = ['weak', 'medium', 'strong'] as const;
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex items-center justify-between text-xs text-[var(--text)]/55">
        <span>{translateAuth(language, 'passwordStrength')}</span>
        <span>{translateAuth(language, labels[strength])}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[var(--text)]/10">
        <div className="h-full rounded-full bg-[var(--accent)] transition-[width]" style={{ width: `${strength === 0 ? 20 : strength === 1 ? 60 : 100}%` }} />
      </div>
    </div>
  );
}

export default function AuthEntryPage({ initialScreen = 'welcome' }: Props) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { signIn, signUp, verifyEmailOtp, resendVerificationCode, sendRecoveryOtp, verifyRecoveryOtp, resendRecoveryOtp } = useAuth();
  const [language, setLanguage] = useState<Language>(getStoredLanguage);
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<ErrorField>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [resendSeconds, setResendSeconds] = useState(0);
  const robotRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const otpVerificationInFlight = useRef(false);
  const t = (key: Parameters<typeof translateAuth>[1]) => translateAuth(language, key);
  const rtl = directionForLanguage(language) === 'rtl';

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  useEffect(() => {
    const candidate = username.trim().toLowerCase();
    const currentRequest = ++requestId.current;
    if (!/^[a-z0-9_]{3,30}$/.test(candidate)) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { data, error: queryError } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', candidate)
            .maybeSingle();
          if (currentRequest !== requestId.current) return;
          setUsernameStatus(queryError ? 'error' : data ? 'taken' : 'available');
        } catch {
          if (currentRequest === requestId.current) setUsernameStatus('error');
        }
      })();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [username]);

  const chooseLanguage = (next: Language) => {
    setLanguage(next);
    setStoredLanguage(next);
    setFieldError('');
    setNotice('');
  };

  const changeScreen = (next: Screen) => {
    setScreen(next);
    setFieldError('');
    setErrorField(null);
    setNotice('');
    setBusy(false);
    if (next === 'signupCode' || next === 'recoveryCode') setCode('');
  };

  const screenMessage = (): string => {
    if (error) return error;
    switch (screen) {
      case 'welcome': return t('robotWelcome');
      case 'consent': return t('robotConsent');
      case 'pause': return t('robotPause');
      case 'fork': return t('forkTitle');
      case 'signupAccount': return t('signupAccount');
      case 'signupIdentity': return t('signupIdentity');
      case 'signupBirth': return t('signupBirth');
      case 'signupCode': return t('signupVerify');
      case 'login': return t('loginSay');
      case 'forgotEmail': return t('forgotSay');
      case 'recoveryCode': return t('codeSay');
    }
  };

  const signupStep = signupScreens.indexOf(screen);
  const fieldClass = 'w-full rounded-xl border border-[var(--text)]/15 bg-[var(--surface-2)] px-4 py-3 text-[var(--text)] outline-none placeholder:text-[var(--text)]/40 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20';
  const labelClass = 'mb-2 block text-sm font-medium text-[var(--text)]/75';
  const setFieldError = (message: string, field: ErrorField = null) => {
    setError(message);
    setErrorField(field);
  };
  const inlineError = (field: Exclude<ErrorField, null>) => error && errorField === field
    ? <p role="alert" className="mt-1 text-xs text-[var(--accent)]">{error}</p>
    : null;

  const renderField = (
    label: string,
    props: InputHTMLAttributes<HTMLInputElement>,
    icon?: 'mail' | 'user' | 'key',
  ) => (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <span className="relative block">
        {icon && (
          <span aria-hidden="true" className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--text)]/40 ${rtl ? 'right-3' : 'left-3'}`}>
            {icon === 'mail' ? <Mail className="h-4 w-4" /> : icon === 'user' ? <UserRound className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
          </span>
        )}
        <input {...props} className={`${fieldClass} ${icon ? rtl ? 'pe-10' : 'ps-10' : ''}`} />
      </span>
    </label>
  );

  const renderPassword = (label: string, value: string, onChange: (value: string) => void, autoComplete: string) => (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <span className="relative block">
        <KeyRound aria-hidden="true" className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text)]/40 ${rtl ? 'right-3' : 'left-3'}`} />
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          minLength={8}
          required
          aria-label={label}
          placeholder={t('passwordPlaceholder')}
          className={`${fieldClass} ${rtl ? 'pe-10 ps-12' : 'ps-10 pe-12'}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((shown) => !shown)}
          aria-label={t(showPassword ? 'hidePassword' : 'showPassword')}
          className={`absolute top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--text)]/55 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${rtl ? 'left-3' : 'right-3'}`}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );

  const startSignUp = async () => {
    const dateParts = birthDate.split('-').map(Number);
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    if (dateParts.length !== 3 || date.getFullYear() !== dateParts[0] || date.getMonth() !== dateParts[1] - 1 || date.getDate() !== dateParts[2] || date > new Date()) {
      setFieldError(t('birthInvalid'), 'birthDate');
      return;
    }
    if (password.length < 8) {
      changeScreen('signupAccount');
      setFieldError(t('passwordTooShort'), 'password');
      return;
    }

    setBusy(true);
    setFieldError('');
    const result = await signUp(email, password, username.trim().toLowerCase(), {
      birth_date: birthDate,
      full_name: displayName.trim() || undefined,
    });
    setBusy(false);
    if (result.error) {
      setFieldError(getErrorMessage(result.error, language));
      return;
    }
    setPassword('');
    setResendSeconds(60);
    changeScreen('signupCode');
    setNotice(t('codeSent'));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldError('');
    setNotice('');

    if (screen === 'signupAccount') {
      const cleanEmail = email.trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        setFieldError(t('emailInvalid'), 'email');
        return;
      }
      if (password.length < 8) {
        setFieldError(t('passwordTooShort'), 'password');
        return;
      }
      setEmail(cleanEmail);
      changeScreen('signupIdentity');
      return;
    }

    if (screen === 'signupIdentity') {
      const cleanUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
        setFieldError(t('usernameRules'), 'username');
        return;
      }
      if (usernameStatus === 'taken') {
        setFieldError(t('usernameUnavailable'), 'username');
        return;
      }
      setUsername(cleanUsername);
      changeScreen('signupBirth');
      return;
    }

    if (screen === 'signupBirth') {
      await startSignUp();
      return;
    }

    if (screen === 'signupCode') {
      if (!/^\d{6}$/.test(code)) {
        setFieldError(t('codeLength'), 'code');
        return;
      }
      if (otpVerificationInFlight.current) return;
      otpVerificationInFlight.current = true;
      setBusy(true);
      let result: Awaited<ReturnType<typeof verifyEmailOtp>>;
      try {
        result = await verifyEmailOtp(email, code);
      } finally {
        otpVerificationInFlight.current = false;
        setBusy(false);
      }
      if (result.error) {
        setFieldError(getCodeError(result.error, language), 'code');
        return;
      }
      navigate('/auth/complete', { replace: true });
      return;
    }

    if (screen === 'login') {
      const cleanEmail = email.trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        setFieldError(t('emailInvalid'), 'email');
        return;
      }
      setBusy(true);
      const result = await signIn(cleanEmail, password);
      setBusy(false);
      if (result.error) {
        setFieldError(t('loginError'));
        return;
      }
      navigate('/feed', { replace: true });
      return;
    }

    if (screen === 'forgotEmail') {
      const cleanEmail = email.trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        setFieldError(t('emailInvalid'), 'email');
        return;
      }
      setEmail(cleanEmail);
      setBusy(true);
      const result = await sendRecoveryOtp(cleanEmail);
      setBusy(false);
      if (result.error) {
        setFieldError(getErrorMessage(result.error, language));
        return;
      }
      setResendSeconds(60);
      changeScreen('recoveryCode');
      setNotice(t('forgotSent'));
      return;
    }

    if (screen === 'recoveryCode') {
      if (!/^\d{6}$/.test(code)) {
        setFieldError(t('codeLength'), 'code');
        return;
      }
      if (otpVerificationInFlight.current) return;
      otpVerificationInFlight.current = true;
      setBusy(true);
      let result: Awaited<ReturnType<typeof verifyRecoveryOtp>>;
      try {
        result = await verifyRecoveryOtp(email, code);
      } finally {
        otpVerificationInFlight.current = false;
        setBusy(false);
      }
      if (result.error) {
        setFieldError(getCodeError(result.error, language), 'code');
        return;
      }
      navigate('/reset-password', { replace: true });
    }
  };

  const resendCode = async () => {
    if (busy || resendSeconds > 0) return;
    setBusy(true);
    setFieldError('');
    const result = screen === 'signupCode'
      ? await resendVerificationCode(email)
      : await resendRecoveryOtp(email);
    setBusy(false);
    if (result.error) {
      setFieldError(getErrorMessage(result.error, language));
      return;
    }
    setResendSeconds(60);
    setNotice(screen === 'recoveryCode' ? t('forgotSent') : t('codeSent'));
  };

  const backStep = () => {
    const previous: Partial<Record<Screen, Screen>> = {
      consent: 'welcome',
      pause: 'consent',
      fork: 'consent',
      signupAccount: 'fork',
      signupIdentity: 'signupAccount',
      signupBirth: 'signupIdentity',
      signupCode: 'signupBirth',
      login: 'fork',
      forgotEmail: 'login',
      recoveryCode: 'forgotEmail',
    };
    const target = previous[screen];
    if (target) changeScreen(target);
  };

  const showProgress = signupStep >= 0;
  const robotStatus = busy ? 'thinking' : error ? 'error' : notice ? 'success' : 'idle';

  return (
    <main dir={rtl ? 'rtl' : 'ltr'} lang={language} className="relative flex min-h-[100dvh] items-center justify-center overflow-x-clip bg-[var(--bg)] px-4 py-3 text-[var(--text)] sm:py-8">
      <div aria-hidden="true" className="welcome-ambient pointer-events-none absolute inset-0" />
      <div className={`relative z-10 mx-auto w-full ${screen === 'welcome' ? 'max-w-xl' : showProgress ? 'max-w-5xl lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-6' : 'max-w-lg'}`}>
        {showProgress && (
          <aside className="sticky top-6 hidden self-start rounded-2xl border border-[var(--text)]/10 bg-[var(--surface-2)]/70 p-4 lg:block">
            <p className="mb-3 text-xs text-[var(--text)]/60">{formatAuthMessage(language, 'step', { n: signupStep + 1, total: signupScreens.length })}</p>
            <ol className="space-y-2">
              {signupStepLabels.map((label, index) => (
                <li
                  key={label}
                  aria-current={index === signupStep ? 'step' : undefined}
                  className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${index === signupStep ? 'border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--text)]' : 'text-[var(--text)]/50'}`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs ${index <= signupStep ? 'border-[var(--accent)] text-[var(--text)]' : 'border-[var(--text)]/20'}`}>
                    {index < signupStep ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  {t(label)}
                </li>
              ))}
            </ol>
          </aside>
        )}
        <section className={`welcome-glass-card rounded-[28px] border border-[var(--text)]/10 px-4 py-3 shadow-2xl backdrop-blur-xl sm:px-7 sm:py-6 ${showProgress ? 'lg:min-w-0' : ''}`}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="font-serif text-sm font-bold tracking-wide">{t('appName')}</p>
            <LoginLanguagePicker
              language={language}
              onSelect={chooseLanguage}
              compactAnchorRef={bubbleRef}
              robotRef={robotRef}
            />
          </div>
          <div ref={bubbleRef}>
            <div ref={robotRef}>
            <AuthRobot language={language} message={screenMessage()} status={robotStatus} compact={screen !== 'welcome'} />
            </div>
          </div>

          {screen === 'welcome' && (
            <div className="mt-1 text-center">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text)] sm:text-2xl">{t('welcomeTitle')}</h1>
              <ul className="mx-auto mt-3 grid max-w-md gap-2 text-start sm:grid-cols-3 sm:gap-3">
                <li className="flex items-center gap-2 rounded-xl border border-[var(--text)]/10 bg-[var(--text)]/[.035] px-3 py-2.5 text-xs leading-5 text-[var(--text)]/85 sm:flex-col sm:items-start sm:text-sm">
                  <AudioLines aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>{t('benefitVoiceRooms')}</span>
                </li>
                <li className="flex items-center gap-2 rounded-xl border border-[var(--text)]/10 bg-[var(--text)]/[.035] px-3 py-2.5 text-xs leading-5 text-[var(--text)]/85 sm:flex-col sm:items-start sm:text-sm">
                  <UsersRound aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>{t('benefitCommunities')}</span>
                </li>
                <li className="flex items-center gap-2 rounded-xl border border-[var(--text)]/10 bg-[var(--text)]/[.035] px-3 py-2.5 text-xs leading-5 text-[var(--text)]/85 sm:flex-col sm:items-start sm:text-sm">
                  <Bot aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>{t('benefitDarijaAssistant')}</span>
                </li>
              </ul>
            </div>
          )}

          {showProgress && (
            <div className="my-3 lg:hidden" aria-label={formatAuthMessage(language, 'step', { n: signupStep + 1, total: signupScreens.length })}>
              <p className="mb-2 text-xs text-[var(--text)]/60">{formatAuthMessage(language, 'step', { n: signupStep + 1, total: signupScreens.length })}</p>
              <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                {signupScreens.map((item, index) => (
                  <span key={item} className={`h-1 rounded-full ${index <= signupStep ? 'bg-[var(--accent)]' : 'bg-[var(--text)]/15'}`} />
                ))}
              </div>
            </div>
          )}

          <motion.div
            key={screen}
            initial={reduceMotion ? false : { opacity: 0, x: rtl ? 12 : -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            className="mt-4"
          >
              {screen === 'welcome' && (
                <div className="space-y-2">
                  <button type="button" onClick={() => changeScreen('consent')} className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]">
                    {t('start')}
                  </button>
                  <button type="button" onClick={() => changeScreen('login')} className="min-h-10 rounded-lg px-3 text-sm font-medium text-[var(--text)]/75 underline decoration-[var(--text)]/35 underline-offset-4 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                    {t('hasAccount')}
                  </button>
                </div>
              )}
              {screen === 'consent' && (
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => changeScreen('pause')} className="rounded-xl border border-[var(--text)]/15 px-4 py-3 text-sm hover:border-[var(--accent)]/50">{t('noTime')}</button>
                  <button type="button" onClick={() => changeScreen('fork')} className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)]">{t('yesTime')}</button>
                </div>
              )}
              {screen === 'pause' && (
                <button type="button" onClick={() => changeScreen('consent')} className="w-full rounded-xl border border-[var(--text)]/15 px-4 py-3 text-sm">{t('back')}</button>
              )}
              {screen === 'fork' && (
                <div className="grid gap-3">
                  <button type="button" onClick={() => changeScreen('signupAccount')} className="rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)]">{t('firstVisit')}</button>
                  <button type="button" onClick={() => changeScreen('login')} className="rounded-xl border border-[var(--text)]/15 px-4 py-3 font-semibold hover:border-[var(--accent)]/50">{t('welcomeBack')}</button>
                </div>
              )}
              {screen === 'signupAccount' && (
                <form onSubmit={submit} className="space-y-3">
                  {renderField(t('email'), { type: 'email', value: email, onChange: (event) => setEmail(event.target.value), placeholder: t('emailPlaceholder'), autoComplete: 'email', dir: 'ltr', required: true }, 'mail')}
                  {inlineError('email')}
                  {renderPassword(t('password'), password, setPassword, 'new-password')}
                  {inlineError('password')}
                  <PasswordStrength password={password} language={language} />
                  <button type="submit" className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)]">{t('next')}</button>
                </form>
              )}
              {screen === 'signupIdentity' && (
                <form onSubmit={submit} className="space-y-3">
                  {renderField(t('username'), { value: username, onChange: (event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30)), placeholder: t('usernamePlaceholder'), autoComplete: 'username', maxLength: 30, dir: 'ltr', required: true }, 'user')}
                  {inlineError('username')}
                  <p className="text-xs leading-5 text-[var(--text)]/55">{t('usernameRules')}</p>
                  {usernameStatus === 'checking' && <p role="status" className="text-xs text-[var(--text)]/55">{t('usernameChecking')}</p>}
                  {usernameStatus === 'available' && <p role="status" className="text-xs text-[var(--text)]/65">{t('usernameAvailable')}</p>}
                  {usernameStatus === 'taken' && <p role="alert" className="text-xs text-[var(--accent)]">{t('usernameUnavailable')}</p>}
                  {usernameStatus === 'error' && <p role="status" className="text-xs text-[var(--text)]/55">{t('usernameCheckError')}</p>}
                  {renderField(t('displayName'), { value: displayName, onChange: (event) => setDisplayName(event.target.value), placeholder: t('displayNamePlaceholder'), autoComplete: 'name', maxLength: 80, required: false }, 'user')}
                  <button type="submit" className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)]">{t('next')}</button>
                </form>
              )}
              {screen === 'signupBirth' && (
                <form onSubmit={submit} className="space-y-4">
                  <label className="block">
                    <span className={labelClass}>{t('birthDate')}</span>
                    <input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} max={new Date().toISOString().slice(0, 10)} required className={fieldClass} />
                  </label>
                  {inlineError('birthDate')}
                  <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] disabled:opacity-60">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('next')}
                  </button>
                </form>
              )}
              {(screen === 'signupCode' || screen === 'recoveryCode') && (
                <form onSubmit={submit} className="space-y-4">
                  {notice && <p role="status" className="rounded-xl border border-[var(--text)]/10 bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)]/75">{notice}</p>}
                  <p dir="ltr" className="text-center text-sm text-[var(--text)]/60">{formatAuthMessage(language, 'emailForCode', { email })}</p>
                  <AuthCodeInput value={code} onChange={setCode} label={t('verificationCode')} digitLabel={(position) => formatAuthMessage(language, 'codeDigitsLabel', { n: position })} />
                  {inlineError('code')}
                  {screen === 'recoveryCode' && <p className="text-xs text-[var(--text)]/55">{t('codeSay')}</p>}
                  <button type="submit" disabled={busy || code.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] disabled:opacity-50">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('verifyCode')}
                  </button>
                  {resendSeconds > 0
                    ? <p className="text-center text-xs text-[var(--text)]/55">{formatAuthMessage(language, 'resendIn', { seconds: resendSeconds })}</p>
                    : <button type="button" onClick={() => void resendCode()} className="w-full py-2 text-sm text-[var(--accent)]">{t('resendCode')}</button>}
                  {screen === 'recoveryCode' && <button type="button" onClick={() => changeScreen('forgotEmail')} className="w-full text-sm text-[var(--text)]/65">{t('changeEmail')}</button>}
                </form>
              )}
              {screen === 'login' && (
                <form onSubmit={submit} className="space-y-4">
                  {renderField(t('email'), { type: 'email', value: email, onChange: (event) => setEmail(event.target.value), placeholder: t('emailPlaceholder'), autoComplete: 'email', dir: 'ltr', required: true }, 'mail')}
                  {inlineError('email')}
                  {renderPassword(t('password'), password, setPassword, 'current-password')}
                  <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] disabled:opacity-60">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('signIn')}
                  </button>
                  <div className="flex flex-wrap justify-between gap-3 text-sm">
                    <button type="button" onClick={() => changeScreen('forgotEmail')} className="text-[var(--accent)]">{t('forgotPassword')}</button>
                    <button type="button" onClick={() => changeScreen('signupAccount')} className="text-[var(--text)]/65">{t('noAccount')}</button>
                  </div>
                </form>
              )}
              {screen === 'forgotEmail' && (
                <form onSubmit={submit} className="space-y-4">
                  {renderField(t('email'), { type: 'email', value: email, onChange: (event) => setEmail(event.target.value), placeholder: t('emailPlaceholder'), autoComplete: 'email', dir: 'ltr', required: true }, 'mail')}
                  {inlineError('email')}
                  <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] disabled:opacity-60">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('continue')}
                  </button>
                  <button type="button" onClick={() => changeScreen('login')} className="w-full text-sm text-[var(--text)]/65">{t('backToLogin')}</button>
                </form>
              )}
              {error && errorField === null && <p role="alert" className="mt-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2 text-sm text-[var(--text)]">{error}</p>}
              {busy && <p role="status" className="sr-only">{t('checking')}</p>}
          </motion.div>

          {screen !== 'welcome' && screen !== 'consent' && screen !== 'pause' && screen !== 'fork' && (
            <button type="button" onClick={backStep} className="mt-4 inline-flex items-center gap-2 rounded-lg py-2 text-sm text-[var(--text)]/60 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {t('back')}
            </button>
          )}
          {screen === 'welcome' && (
            <nav className="mt-5 flex items-center justify-center gap-5 border-t border-[var(--text)]/10 pt-3 text-xs text-[var(--text)]/65">
              <Link to="/terms" className="rounded px-1 py-1 underline decoration-[var(--text)]/30 underline-offset-4 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                {t('termsLink')}
              </Link>
              <Link to="/privacy" className="rounded px-1 py-1 underline decoration-[var(--text)]/30 underline-offset-4 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                {t('privacyLink')}
              </Link>
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}

export function OnboardingCompletionPage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const language = getStoredLanguage();
  const t = (key: Parameters<typeof translateAuth>[1]) => translateAuth(language, key);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const direction = directionForLanguage(language);

  const continueToApp = async () => {
    if (!avatar || !user) {
      navigate('/feed', { replace: true });
      return;
    }
    setBusy(true);
    setError('');
    const extension = avatar.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `${user.id}/${user.id}_avatar.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatar, { cacheControl: '3600', upsert: true, contentType: avatar.type });
    if (uploadError) {
      setBusy(false);
      setError(t('avatarUploadError'));
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const { error: profileError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
    if (profileError) {
      setBusy(false);
      setError(t('avatarUploadError'));
      return;
    }
    await refreshProfile();
    navigate('/feed', { replace: true });
  };

  const chooseAvatar = (file?: File) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError(t('photoTooLarge'));
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(t('photoFormat'));
      return;
    }
    setError('');
    setAvatar(file);
  };

  return (
    <main dir={direction} lang={language} className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg)] px-4 py-6 text-[var(--text)]">
      <section className="welcome-glass-card w-full max-w-lg rounded-[28px] border border-[var(--text)]/10 p-5 text-center sm:p-8">
        <AuthRobot language={language} message={t('signupDone')} status="success" compact />
        <h1 className="mt-4 text-xl font-bold">{t('signupDone')}</h1>
        <label className="mt-5 block text-start">
          <span className="mb-2 block text-sm text-[var(--text)]/75">{t('chooseAvatar')}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseAvatar(event.target.files?.[0])} className="block w-full text-sm text-[var(--text)] file:me-3 file:rounded-lg file:border file:border-[var(--text)]/15 file:bg-[var(--surface-2)] file:px-3 file:py-2 file:text-[var(--text)]" />
        </label>
        {avatar && <p className="mt-2 text-xs text-[var(--text)]/55">{avatar.name}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-[var(--accent)]">{error}</p>}
        <div className="mt-5 grid gap-2">
          <button type="button" onClick={() => void continueToApp()} disabled={busy} className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t('finish')}
          </button>
          {avatar && <button type="button" onClick={() => { setAvatar(null); setError(''); }} className="text-sm text-[var(--text)]/60">{t('removePhoto')}</button>}
          <button type="button" onClick={() => navigate('/feed', { replace: true })} className="text-sm text-[var(--text)]/60">{t('skipAvatar')}</button>
        </div>
      </section>
    </main>
  );
}
