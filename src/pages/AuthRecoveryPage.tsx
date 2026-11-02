import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthRobot from '@/components/AuthRobot';
import { getStoredLanguage } from '@/lib/i18n';
import { translateAuth } from '@/i18n/auth';

export default function AuthRecoveryPage() {
  const navigate = useNavigate();
  const language = getStoredLanguage();
  const rtl = language === 'ar';
  const t = (key: Parameters<typeof translateAuth>[1]) => translateAuth(language, key);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      setLoading(false);
      setHasSession(!sessionError && Boolean(data.session));
      if (sessionError || !data.session) setError(translateAuth(language, 'recoveryExpired'));
    }).catch(() => {
      if (!active) return;
      setLoading(false);
      setError(translateAuth(language, 'networkError'));
    });
    return () => { active = false; };
  }, [language]);

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }

    setSaving(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setError(t('recoveryExpired'));
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        const message = updateError.message.toLowerCase();
        setError(message.includes('rate limit') ? t('rateLimit') : t('unexpectedError'));
        return;
      }

      sessionStorage.removeItem('password_recovery');
      setPassword('');
      navigate('/feed', { replace: true });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message.toLowerCase() : '';
      setError(message.includes('fetch') || message.includes('network') ? t('networkError') : t('unexpectedError'));
    } finally {
      setSaving(false);
    }
  };

  const strength = password.length < 8 ? 'weak' : password.length >= 12 && /[A-Z]/.test(password) && /\d/.test(password) ? 'strong' : 'medium';

  return (
    <main dir={rtl ? 'rtl' : 'ltr'} lang={language} className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg)] px-4 py-6 text-[var(--text)]">
      <section className="welcome-glass-card w-full max-w-lg rounded-[28px] border border-[var(--text)]/10 p-5 shadow-2xl sm:p-8">
        <AuthRobot language={language} message={t('newPassSay')} status={error ? 'error' : saving ? 'thinking' : 'idle'} compact />
        <form onSubmit={savePassword} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--text)]/75">{t('newPassword')}</span>
            <span className="relative block">
              <KeyRound aria-hidden="true" className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text)]/40 ${rtl ? 'right-3' : 'left-3'}`} />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('passwordPlaceholder')}
                className={`w-full rounded-xl border border-[var(--text)]/15 bg-[var(--surface-2)] px-4 py-3 text-[var(--text)] outline-none placeholder:text-[var(--text)]/40 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 ${rtl ? 'pe-10 ps-12' : 'ps-10 pe-12'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={t(showPassword ? 'hidePassword' : 'showPassword')}
                className={`absolute top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--text)]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${rtl ? 'left-3' : 'right-3'}`}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-[var(--text)]/55">
              <span>{t('passwordStrength')}</span>
              <span>{t(strength)}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[var(--text)]/10">
              <div className={`h-full rounded-full bg-[var(--accent)] transition-[width] ${strength === 'weak' ? 'w-1/5' : strength === 'medium' ? 'w-3/5' : 'w-full'}`} />
            </div>
          </div>
          {error && <p role="alert" className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2 text-sm">{error}</p>}
          {loading && <p role="status" className="text-sm text-[var(--text)]/60">{t('checking')}</p>}
          <button type="submit" disabled={loading || saving || !hasSession} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('savePassword')}
          </button>
          {error && <button type="button" onClick={() => navigate('/login', { replace: true })} className="w-full text-sm text-[var(--text)]/65">{t('backToLogin')}</button>}
        </form>
      </section>
    </main>
  );
}
