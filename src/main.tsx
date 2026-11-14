import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { readSupabaseConfig } from './lib/supabaseConfig';
import './index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container #root is missing from index.html');
}

const root = createRoot(container);
const supabaseConfig = readSupabaseConfig();

if (!supabaseConfig.ready) {
  root.render(
    <main dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#090c10', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <section role="alert" style={{ maxWidth: 520, border: '1px solid rgba(255,255,255,.12)', borderRadius: 20, background: 'rgba(255,255,255,.04)', padding: 28, textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 12px', fontSize: 20 }}>إعدادات التطبيق ناقصة</h1>
        <p style={{ margin: '0 0 16px', color: '#c9c9d4', fontSize: 14, lineHeight: 1.9 }}>
          ما قدرش التطبيق يتصل بـ Supabase. زِد المتغيرات التالية:
        </p>
        <ul style={{ margin: '0 0 16px', padding: 0, color: '#fca5a5', fontFamily: 'monospace', fontSize: 13, listStyle: 'none' }}>
          {supabaseConfig.missing.map((key) => <li key={key}>{key}</li>)}
        </ul>
        <p style={{ margin: 0, color: '#a1a1aa', fontSize: 13, lineHeight: 1.9 }}>
          محلياً: انسخ <code>.env.example</code> إلى <code>.env</code> وعمّر القيم من إعدادات مشروعك في Supabase، ثم أعد تشغيل التطبيق.
          على Vercel: أضف القيم في Environment Variables ثم أعد النشر. استعمل مفتاح anon/publishable فقط.
        </p>
      </section>
    </main>
  );
} else {
  void import('./App.tsx')
    .then(({ default: App }) => {
      root.render(
        <StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </StrictMode>
      );
    })
    .catch((error: unknown) => {
      console.error('Application startup failed:', error);
      root.render(
        <main dir="rtl" role="alert" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#090c10', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
          <section style={{ maxWidth: 520, border: '1px solid rgba(255,255,255,.12)', borderRadius: 20, background: 'rgba(255,255,255,.04)', padding: 28, textAlign: 'center' }}>
            تعذر تشغيل التطبيق. أعد تحميل الصفحة، وإذا استمر المشكل راجع أخطاء وحدة التحكم.
          </section>
        </main>
      );
    });
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Offline support could not be registered:', error);
    });
  });
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      await Promise.all(registrations.map((registration) => registration.unregister()));
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.filter((name) => name.startsWith('youssef-')).map((name) => caches.delete(name)));
    });
  });
}
