import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getStoredLanguage } from '@/lib/i18n';
import { translateAuth } from '@/i18n/auth';

type Props = {
  kind: 'terms' | 'privacy';
};

const legalCopy = {
  terms: {
    title: 'الشروط والأحكام',
    placeholder: 'هذه صفحة مؤقتة للشروط والأحكام. سيُضاف النص الرسمي قبل إطلاق الخدمة.',
  },
  privacy: {
    title: 'سياسة الخصوصية',
    placeholder: 'هذه صفحة مؤقتة لسياسة الخصوصية. سيُضاف النص الرسمي قبل إطلاق الخدمة.',
  },
};

export default function LegalPage({ kind }: Props) {
  const language = getStoredLanguage();
  const copy = legalCopy[kind];

  return (
    <main dir="rtl" lang="ar" className="relative flex min-h-[100dvh] items-center justify-center overflow-x-clip bg-[var(--bg)] px-4 py-8 text-[var(--text)]">
      <div aria-hidden="true" className="welcome-ambient pointer-events-none absolute inset-0" />
      <section className="welcome-glass-card relative z-10 w-full max-w-2xl rounded-[28px] border border-[var(--text)]/10 p-6 shadow-2xl backdrop-blur-xl sm:p-9">
        <Link
          to="/login"
          className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--text)]/15 px-4 text-sm font-medium text-[var(--text)]/80 transition hover:border-[var(--accent)]/55 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
          {translateAuth(language, 'backToLogin')}
        </Link>
        <h1 className="text-2xl font-bold sm:text-3xl">{copy.title}</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--text)]/75 sm:text-base">
          {copy.placeholder}
        </p>
      </section>
    </main>
  );
}
