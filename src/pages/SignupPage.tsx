import {
  useEffect,
  useState,
} from 'react';
import {
  Link,
  useNavigate,
} from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  User,
  Bot,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DSLogo } from '@/components/icons/BrandIcons';
import { getStoredLanguage } from '@/lib/i18n';

const robotImage = 'https://png.pngtree.com/png-clipart/20250207/original/pngtree-ai-powered-robot-interacting-with-a-tablet-device-png-image_19770445.png';

const signupCopy = {
  ar: { title: 'إنشاء حساب في Deep-Signal', subtitle: 'أنشئ حسابك وابدأ المشاركة.', username: 'اسم المستخدم', email: 'البريد الإلكتروني', password: 'كلمة المرور', passwordHint: '8 أحرف على الأقل', submit: 'إنشاء الحساب', haveAccount: 'لديك حساب بالفعل؟', login: 'تسجيل الدخول', verify: 'تحقق من بريدك الإلكتروني', verifyInfo: 'أرسلنا رمز تأكيد الحساب. أدخله لتفعيل حسابك والدخول إلى التطبيق.', spam: 'إذا لم تجد الرسالة، تحقق من Spam / Junk.', otp: 'رمز التأكيد', confirm: 'تأكيد البريد الإلكتروني', resendWait: 'يمكنك طلب رمز جديد بعد', resend: 'إعادة إرسال رمز التأكيد', noMail: 'لم تجد الرسالة؟', back: 'العودة إلى إنشاء الحساب', usernameError: 'يجب أن يتكون اسم المستخدم من 3 إلى 30 حرفاً: a-z و0-9 و _.', passwordError: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.', sent: 'أرسلنا رمز تأكيد الحساب إلى بريدك الإلكتروني.', resent: 'أرسلنا رمز تأكيد جديداً إلى بريدك الإلكتروني.', guide: 'أنا هنا لمساعدتك. اختر اسم مستخدم، ثم أدخل بريدك الإلكتروني وأنشئ كلمة مرور آمنة.', codeGuide: 'وصلنا إلى خطوة التأكيد. أدخل الرمز الذي أرسلناه إلى بريدك الإلكتروني.' },
  fr: { title: 'Créer un compte Deep-Signal', subtitle: 'Créez votre compte et commencez à partager.', username: "Nom d'utilisateur", email: 'Adresse e-mail', password: 'Mot de passe', passwordHint: '8 caractères minimum', submit: 'Créer mon compte', haveAccount: 'Vous avez déjà un compte ?', login: 'Se connecter', verify: 'Vérifiez votre adresse e-mail', verifyInfo: 'Nous vous avons envoyé un code de confirmation. Saisissez-le pour activer votre compte.', spam: 'Si vous ne trouvez pas le message, vérifiez les courriers indésirables.', otp: 'Code de confirmation', confirm: "Confirmer l'adresse e-mail", resendWait: 'Vous pourrez demander un nouveau code dans', resend: 'Renvoyer le code', noMail: 'Vous ne trouvez pas le message ?', back: 'Retour à la création du compte', usernameError: "Le nom doit contenir 3 à 30 caractères : a-z, 0-9 et _.", passwordError: 'Le mot de passe doit contenir au moins 8 caractères.', sent: 'Nous avons envoyé un code de confirmation à votre adresse e-mail.', resent: 'Un nouveau code de confirmation a été envoyé.', guide: 'Je suis là pour vous aider. Choisissez un nom, saisissez votre e-mail et créez un mot de passe sécurisé.', codeGuide: 'Passons à la confirmation. Saisissez le code envoyé à votre adresse e-mail.' },
  en: { title: 'Create a Deep-Signal account', subtitle: 'Create your account and start sharing.', username: 'Username', email: 'Email address', password: 'Password', passwordHint: 'At least 8 characters', submit: 'Create account', haveAccount: 'Already have an account?', login: 'Sign in', verify: 'Check your email', verifyInfo: 'We sent you a verification code. Enter it to activate your account.', spam: "If you can't find the message, check Spam / Junk.", otp: 'Verification code', confirm: 'Verify email address', resendWait: 'You can request a new code in', resend: 'Resend verification code', noMail: "Can't find the message?", back: 'Back to account creation', usernameError: 'Username must be 3–30 characters using a-z, 0-9, and _.', passwordError: 'Password must be at least 8 characters.', sent: 'We sent a verification code to your email address.', resent: 'A new verification code was sent to your email.', guide: 'I’m here to help. Choose a username, enter your email, and create a secure password.', codeGuide: 'You’re at the verification step. Enter the code we sent to your email.' },
} as const;

export default function SignupPage() {
  const {
    signUp,
    verifyEmailOtp,
    resendVerificationCode,
  } = useAuth();
  const navigate = useNavigate();
  const language = getStoredLanguage();
  const copy = signupCopy[language];
  const direction = language === 'ar' ? 'rtl' : 'ltr';

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [verificationMode, setVerificationMode] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = window.setInterval(() => {
      setCountdown((current) =>
        current > 0 ? current - 1 : 0
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown]);

  const handleSignup = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError(null);
    setSuccessMessage(null);

    const cleanUsername = username
      .trim()
      .toLowerCase();

    const cleanEmail = email
      .trim()
      .toLowerCase();

    if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
      setError(
        copy.usernameError
      );
      return;
    }

    if (password.length < 8) {
      setError(
        copy.passwordError
      );
      return;
    }

    setLoading(true);

    const result = await signUp(
      cleanEmail,
      password,
      cleanUsername
    );

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setEmail(cleanEmail);
    setOtp('');
    setVerificationMode(true);
    setCountdown(60);
    setSuccessMessage(copy.sent);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || verifying) return;

    setError(null);
    setVerifying(true);

    const result = await verifyEmailOtp(email, otp);

    setVerifying(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    navigate('/');
  };

  const handleResend = async () => {
    if (resending || countdown > 0) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setResending(true);

    const result =
      await resendVerificationCode(email);

    setResending(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setCountdown(60);
    setSuccessMessage(
      copy.resent
    );
  };

  if (verificationMode) {
    return (
      <div
        className="relative min-h-screen overflow-hidden bg-[#0a0208] text-white flex items-center justify-center px-4"
        dir={direction}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute left-1/2 top-[-10%] -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-pink-600/15 blur-[80px] animate-pulse" />
          <div className="absolute bottom-[-20%] left-[10%] w-[400px] h-[400px] rounded-full bg-orange-500/10 blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-[420px]">
          <div className="rounded-[28px] border border-pink-400/30 bg-[#140a19] shadow-[0_0_50px_rgba(255,40,120,0.18),0_25px_50px_rgba(0,0,0,0.8)] p-6 sm:p-8 text-center">
            <div className="flex justify-center mb-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ff2a78] via-pink-500 to-[#ff8a3d] flex items-center justify-center shadow-[0_0_30px_rgba(255,42,120,0.35)]">
                <DSLogo size={72} />
              </div>
            </div>

            <h1 className="text-[22px] sm:text-2xl font-bold">
              {copy.verify}
            </h1>

            <p className="mt-4 text-sm leading-7 text-white/60">
              {copy.verifyInfo}
              <br />
              {copy.spam}
            </p>

            <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#b9e978]/15 bg-[#b9e978]/[0.05] p-3 text-right text-xs leading-6 text-white/70">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-[#b9e978]/20 bg-[#0d1421]"><Bot className="absolute h-5 w-5 text-[#b9e978]" /><img src={robotImage} alt="" className="relative h-full w-full object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; }} /></span>
              <span>{copy.codeGuide}</span>
            </div>

            <div className="mt-5 rounded-2xl border border-pink-400/20 bg-[#1a0a15] px-4 py-3">
              <div className="flex items-center justify-center gap-2">
                <Mail className="w-4 h-4 text-pink-400 shrink-0" />

                <span
                  className="text-sm font-semibold break-all"
                  dir="ltr"
                >
                  {email}
                </span>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="mt-5 space-y-3">
              <label htmlFor="signup-otp" className="block text-sm text-white/70">
                {copy.otp}
              </label>
              <input
                id="signup-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                dir="ltr"
                className="w-full rounded-xl border border-white/10 bg-[#0d050b] px-4 py-3 text-center text-xl tracking-[0.3em] text-white placeholder:text-white/25 focus:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              />
              <button
                type="submit"
                disabled={verifying || otp.length !== 6}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff2a78] to-[#ff8a3d] px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
                {copy.confirm}
              </button>
            </form>

            <div className="mt-5">
              {countdown > 0 ? (
                <p className="text-xs text-white/40">
                  {copy.resendWait}{' '}
                  <span className="text-pink-400 font-bold">
                    {countdown}s
                  </span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="inline-flex items-center gap-2 text-sm text-pink-400 hover:text-pink-300 disabled:opacity-50"
                >
                  {resending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {copy.resend}
                </button>
              )}
            </div>

            <p className="mt-6 text-xs text-white/35 leading-5">
              {copy.noMail}
              <br />
              {copy.spam}
            </p>

            <button
              type="button"
              onClick={() => {
                setVerificationMode(false);
                setError(null);
                setSuccessMessage(null);
              }}
              className="mt-5 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              {copy.back}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#050008] text-white"
      dir={direction}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[10%] w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[10%] w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md animate-slide-up relative z-10">
        <div className="rounded-3xl p-8 shadow-2xl bg-[#140a19] border border-pink-400/20">
          <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#101b3d] via-violet-950 to-cyan-950 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/20">
              <DSLogo size={56} />
            </div>

            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#ff2a78] to-[#ff8a3d] bg-clip-text text-transparent">
              {copy.title}
            </h1>

            <p className="text-neutral-400 text-sm mt-2">
              {copy.subtitle}
            </p>

            <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#b9e978]/15 bg-[#b9e978]/[0.05] p-3 text-start text-xs leading-6 text-white/70">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-[#b9e978]/20 bg-[#0d1421]"><Bot className="absolute h-5 w-5 text-[#b9e978]" /><img src={robotImage} alt="" className="relative h-full w-full object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; }} /></span>
              <span>{copy.guide}</span>
            </div>
          </div>

          <form
            onSubmit={handleSignup}
            className="space-y-5"
          >
            <div>
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2 block">
                {copy.username}
              </label>

              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />

                <input
                  type="text"
                  required
                  maxLength={30}
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, '')
                        .slice(0, 30)
                    )
                  }
                  placeholder="your_username"
                  autoComplete="username"
                  className="w-full bg-[#0d050b] border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2 block">
                {copy.email}
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full bg-[#0d050b] border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2 block">
                {copy.password}
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder={copy.passwordHint}
                  autoComplete="new-password"
                  className="w-full bg-[#0d050b] border border-white/10 rounded-xl pl-12 pr-12 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#ff2a78] to-[#ff8a3d] text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                copy.submit
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-neutral-400">
            {copy.haveAccount}{' '}

            <Link
              to="/login"
              className="text-pink-400 hover:text-pink-300 font-medium transition-colors"
            >
              {copy.login}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
