import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { MessagesProvider } from '@/context/MessagesContext';
import { ThemeProvider } from '@/context/ThemeContext';
import MobileNav from '@/components/MobileNav';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import PageBackground from '@/components/PageBackground';
import QuickNavigationMenu from '@/components/QuickNavigationMenu';
import { useHostHeartbeat, useStaleRoomSweeper } from '@/hooks/useRoomPresence';
import { useSupabaseConnection } from '@/hooks/useSupabaseConnection';
import { OnlinePresenceProvider } from '@/hooks/useOnlinePresence';
import AuthEntryPage from '@/pages/AuthEntryPage';
import AuthRecoveryPage from '@/pages/AuthRecoveryPage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import LegalPage from '@/pages/LegalPage';
import Youssef555Page from '@/pages/Youssef555Page';
import { Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { DSLogo } from '@/components/icons/BrandIcons';
import { directionForLanguage, getStoredLanguage, LANGUAGE_CHANGE_EVENT, type Language } from '@/lib/i18n';

/*
 * Route-level code splitting.
 *
 * Previously every page was imported eagerly, so a visitor downloaded and parsed
 * the feed, the composer, the profile, the chat, the games and the rooms before
 * seeing anything. The auth screens stay eager because they are the first paint
 * for an anonymous visitor; everything behind the login is loaded on demand.
 */
const FeedPage = lazy(() => import('@/pages/FeedPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const DiscoverPage = lazy(() => import('@/pages/DiscoverPage'));
const RoomsPage = lazy(() => import('@/pages/RoomsPage'));
const ReelsPage = lazy(() => import('@/pages/ReelsPage'));
const RoomDetailPage = lazy(() => import('@/pages/RoomDetailPage'));
const GamesPage = lazy(() => import('@/pages/GamesPage'));
const VoiceCardClashPage = lazy(() => import('@/pages/VoiceCardClashPage'));
const EchoesOfAshPage = lazy(() => import('@/pages/EchoesOfAshPage'));
const EchoOfAshesPage = lazy(() => import('@/pages/EchoOfAshesPage'));
const ZombieGamePage = lazy(() => import('@/pages/ZombieGamePage'));
const JokalPage = lazy(() => import('@/pages/JokalPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const AvatarOnboardingPage = lazy(() => import('@/pages/AvatarOnboardingPage'));
const AvatarStudioPage = lazy(() => import('@/pages/AvatarStudioPage'));

function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6" role="status" aria-label="جارٍ التحميل" aria-busy="true">
      <div className="skeleton h-40 rounded-3xl" />
      <div className="skeleton h-5 w-2/5 rounded-full" />
      <div className="skeleton h-24 rounded-2xl" />
      <div className="skeleton h-24 rounded-2xl" />
    </div>
  );
}

function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const { status: connectionStatus, retry: retryConnection } = useSupabaseConnection();
  useHostHeartbeat(!!user);
  useStaleRoomSweeper(!!user);
  const [direction, setDirection] = useState<'rtl' | 'ltr'>(() =>
    localStorage.getItem('ds-language')
      ? directionForLanguage(getStoredLanguage())
      : localStorage.getItem('ds-direction') === 'ltr' ? 'ltr' : 'rtl'
  );

  useEffect(() => {
    localStorage.setItem('ds-direction', direction);
  }, [direction]);

  useEffect(() => {
    const onLanguageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ language: Language; direction: 'rtl' | 'ltr' }>).detail;
      setDirection(detail.direction);
    };
    window.addEventListener(LANGUAGE_CHANGE_EVENT, onLanguageChange);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, onLanguageChange);
  }, []);

  return (
    <OnlinePresenceProvider userId={user?.id ?? null} loadRecentProfiles={location.pathname === '/feed'}>
      <div className="relative min-h-[100dvh] bg-[var(--bg-base)] text-white" dir={direction} lang={direction === 'rtl' ? 'ar' : 'en'}>
        <PageBackground />
        <div dir="ltr" className="mx-auto min-h-[100dvh] max-w-[1600px] lg:grid lg:grid-cols-[72px_minmax(0,1fr)]">
          <div className="hidden lg:block" dir="rtl">
            <Sidebar />
          </div>
          <div dir={direction} className="relative z-10 min-h-[100dvh] min-w-0">
            <Navbar direction={direction} onToggleDirection={() => setDirection((current) => current === 'rtl' ? 'ltr' : 'rtl')} />
            {connectionStatus !== 'connected' && (
              <div className="mx-auto max-w-[1500px] px-3 pt-3 sm:px-6">
                <div
                  role={connectionStatus === 'checking' ? 'status' : 'alert'}
                  aria-live="polite"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white shadow-lg backdrop-blur-xl"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {connectionStatus === 'checking'
                      ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--accent)]" />
                      : <WifiOff className="h-4 w-4 shrink-0 text-amber-300" />}
                    <span>
                      {connectionStatus === 'checking'
                        ? 'جارٍ التحقق من الاتصال...'
                        : connectionStatus === 'offline'
                          ? 'لا يوجد اتصال بالإنترنت. تحقق من الشبكة ثم أعد المحاولة.'
                          : 'تعذر الاتصال بخدمات Deep Signal. تحقق من الاتصال وإعدادات Supabase ثم أعد المحاولة.'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void retryConnection()}
                    disabled={connectionStatus === 'checking'}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`} />
                    إعادة المحاولة
                  </button>
                </div>
              </div>
            )}
            <main className="min-h-[calc(100dvh-72px)] pb-[calc(80px_+_env(safe-area-inset-bottom))] lg:pb-8">
              <AnimatePresence mode="wait">
                <div key={location.pathname}>
                  <Suspense fallback={<RouteFallback />}>{children}</Suspense>
                </div>
              </AnimatePresence>
            </main>
          </div>
        </div>
        <div className="lg:hidden">
          <MobileNav direction={direction} onToggleDirection={() => setDirection((current) => current === 'rtl' ? 'ltr' : 'rtl')} />
        </div>
        <QuickNavigationMenu />
      </div>
    </OnlinePresenceProvider>
  );
}

function AuthGate() {
  const { session, loading, profile, profileLoading, profileLoadError, refreshProfile } = useAuth();
  const location = useLocation();

  if (location.pathname === '/terms') {
    return <LegalPage kind="terms" />;
  }

  if (location.pathname === '/privacy') {
    return <LegalPage kind="privacy" />;
  }

  if (location.pathname === '/youssef555') {
    return <Youssef555Page />;
  }

  if (loading) {
    return (
      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--bg)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[var(--accent)]/25 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[var(--accent)]/20 blur-[120px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 gradient-primary rounded-3xl blur-2xl opacity-60" />
            <div className="relative w-16 h-16 rounded-3xl gradient-primary flex items-center justify-center">
              <DSLogo size={56} />
            </div>
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
        </div>
      </div>
    );
  }

  // Recovery mode: force reset password page
  if (sessionStorage.getItem('password_recovery') === '1') {
    return (
      <Routes>
        <Route path="/reset-password" element={<AuthRecoveryPage />} />
        <Route path="*" element={<Navigate to="/reset-password" replace />} />
      </Routes>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/login" element={<AuthEntryPage />} />
        <Route path="/signup" element={<AuthEntryPage initialScreen="signupAccount" />} />
        <Route path="/forgot-password" element={<AuthEntryPage initialScreen="forgotEmail" />} />
        <Route path="/reset-password" element={<AuthRecoveryPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (profileLoading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[var(--bg)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (profileLoadError || !profile) {
    return (
      <main dir="rtl" className="grid min-h-[100dvh] place-items-center bg-[var(--bg)] px-4 text-[var(--text)]">
        <section className="max-w-md rounded-3xl border border-[var(--text)]/10 bg-[var(--surface-1)] p-6 text-center">
          <h1 className="text-xl font-bold">تعذر تحميل ملفك الشخصي</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text)]/65">تحقق من اتصالك ثم أعد المحاولة للمتابعة بأمان.</p>
          <button type="button" onClick={() => void refreshProfile()} className="mt-5 rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[var(--accent-foreground)]">
            إعادة المحاولة
          </button>
        </section>
      </main>
    );
  }

  if (!profile.onboarding_completed) {
    if (location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />;
    return <Suspense fallback={<RouteFallback />}><AvatarOnboardingPage /></Suspense>;
  }

  if (location.pathname === '/onboarding') return <Navigate to="/feed" replace />;

  return (
    <MessagesProvider>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/avatar" element={<ProtectedLayout><AvatarOnboardingPage /></ProtectedLayout>} />
        <Route path="/avatar-studio" element={<ProtectedLayout><AvatarStudioPage /></ProtectedLayout>} />
        <Route path="/feed" element={<ProtectedLayout><FeedPage /></ProtectedLayout>} />
        <Route path="/search" element={<ProtectedLayout><SearchPage /></ProtectedLayout>} />
        <Route path="/discover" element={<ProtectedLayout><DiscoverPage /></ProtectedLayout>} />
        <Route path="/rooms" element={<ProtectedLayout><RoomsPage /></ProtectedLayout>} />
        <Route path="/rooms/:roomId" element={<ProtectedLayout><RoomDetailPage /></ProtectedLayout>} />
        <Route path="/reels" element={<ProtectedLayout><ReelsPage /></ProtectedLayout>} />
        <Route path="/games" element={<ProtectedLayout><GamesPage /></ProtectedLayout>} />
        <Route path="/jokal" element={<ProtectedLayout><JokalPage /></ProtectedLayout>} />
        <Route path="/games/voice-card-clash" element={<ProtectedLayout><VoiceCardClashPage /></ProtectedLayout>} />
        <Route path="/games/echoes-of-ash" element={<ProtectedLayout><EchoesOfAshPage /></ProtectedLayout>} />
        <Route path="/games/echo-of-ashes" element={<Suspense fallback={<RouteFallback />}><EchoOfAshesPage /></Suspense>} />
        <Route path="/games/zombie" element={<ProtectedLayout><ZombieGamePage /></ProtectedLayout>} />
        <Route path="/chat" element={<ProtectedLayout><ChatPage /></ProtectedLayout>} />
        <Route path="/chat/:userId" element={<ProtectedLayout><ChatPage /></ProtectedLayout>} />
        <Route path="/profile" element={<ProtectedLayout><ProfilePage /></ProtectedLayout>} />
        <Route path="/profile/:userId" element={<ProtectedLayout><ProfilePage /></ProtectedLayout>} />
        <Route path="/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Routes>
    </MessagesProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <BrowserRouter>
        <AuthGate />
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
