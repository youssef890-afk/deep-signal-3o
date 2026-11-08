import { Component, type ErrorInfo, type ReactNode } from 'react';
import { directionForLanguage, getStoredLanguage, translate, type TranslationKey } from '@/lib/i18n';

/**
 * Top-level error boundary.
 *
 * Without it, a render-time exception blanks the whole app and the user only
 * sees a white screen. This keeps the failure local, reports it, and offers a
 * reload. It intentionally shows no stack trace, no database detail and no
 * provider error to the user.
 */
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: TranslationKey;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: 'errorTitle' };

  static getDerivedStateFromError(error: unknown): State {
    void error;
    return { hasError: true, message: 'errorTitle' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Server-side detail only; nothing sensitive is rendered.
    console.error('Unhandled UI error:', error.message, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const language = getStoredLanguage();
    const direction = directionForLanguage(language);

    return (
      <main
        dir={direction}
        className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg)] px-4 text-[var(--text)]"
      >
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h1 className="text-xl font-bold">{translate(language, this.state.message)}</h1>
          <p className="mt-3 text-sm text-white/60">
            {translate(language, 'errorDescription')}
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
            >
              {translate(language, 'reloadPage')}
            </button>
            <a
              href="/feed"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/5"
            >
              {translate(language, 'returnHome')}
            </a>
          </div>
        </section>
      </main>
    );
  }
}