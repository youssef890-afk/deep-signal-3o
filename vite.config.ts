import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const domain = loadEnv(mode, process.cwd(), 'DEEP_SIGNAL_').DEEP_SIGNAL_VERCEL_DOMAIN?.trim();
  const target = domain
    ? domain.startsWith('http://') || domain.startsWith('https://') ? domain : `https://${domain}`
    : undefined;

  if (!target) {
    console.warn('Set DEEP_SIGNAL_VERCEL_DOMAIN to proxy /api requests during local development.');
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: target ? {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        },
      },
    } : undefined,
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            motion: ['framer-motion'],
          },
        },
      },
    },
  };
});
