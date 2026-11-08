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
import AuthEntryPage, { OnboardingCompletionPage } from '@/pages/AuthEntryPage';
import AuthRecoveryPage from '@/pages/AuthRecoveryPage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import LegalPage from '@/pages/LegalPage';
import Youssef555Page from '@/pages/Youssef555Page';
import { Loader2 } from 'lucide-react';
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
const JokalPage = lazy(() => import('@/pages/JokalPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

function RouteFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center" role="status" aria-label="جارٍ التحميل">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
    </div>
  );
}

function ProtectedLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
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
    <div className="relative min-h-[100dvh] bg-[var(--bg-base)] text-white" dir={direction} lang={direction === 'rtl' ? 'ar' : 'en'}>
      <PageBackground />
      <div dir="ltr" className="mx-auto min-h-[100dvh] max-w-[1600px] lg:grid lg:grid-cols-[72px_minmax(0,1fr)]">
        <div className="hidden lg:block" dir="rtl">
          <Sidebar />
        </div>
        <div dir={direction} className="relative z-10 min-h-[100dvh] min-w-0">
          <Navbar direction={direction} onToggleDirection={() => setDirection((current) => current === 'rtl' ? 'ltr' : 'rtl')} />
          <main className="min-h-[calc(100dvh-72px)] pb-[92px] lg:pb-8">
            <AnimatePresence mode="wait">
              <div key={location.pathname}>
                <Suspense fallback={<RouteFallback />}>{children}</Suspense>
              </div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  );
}

function AuthGate() {
  const { session, loading } = useAuth();
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

  if (location.pathname === '/auth/complete') {
    return <OnboardingCompletionPage />;
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

  return (
    <MessagesProvider>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/feed" element={<ProtectedLayout><FeedPage /></ProtectedLayout>} />
        <Route path="/search" element={<ProtectedLayout><SearchPage /></ProtectedLayout>} />
        <Route path="/discover" element={<ProtectedLayout><DiscoverPage /></ProtectedLayout>} />
        <Route path="/rooms" element={<ProtectedLayout><RoomsPage /></ProtectedLayout>} />
        <Route path="/rooms/:roomId" element={<ProtectedLayout><RoomDetailPage /></ProtectedLayout>} />
        <Route path="/reels" element={<ProtectedLayout><ReelsPage /></ProtectedLayout>} />
        <Route path="/games" element={<ProtectedLayout><GamesPage /></ProtectedLayout>} />
        <Route path="/jokal" element={<ProtectedLayout><JokalPage /></ProtectedLayout>} />
        <Route path="/games/voice-card-clash" element={<ProtectedLayout><VoiceCardClashPage /></ProtectedLayout>} />
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
