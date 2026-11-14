import { createClient } from '@supabase/supabase-js';
import { readSupabaseConfig } from './supabaseConfig';

/**
 * Supabase client.
 *
 * Only the publishable/anon key belongs here. The service-role key must never
 * be used in the browser: it bypasses Row Level Security.
 */
const config = readSupabaseConfig();
const AUTH_PERSISTENCE_KEY = 'ds-auth-persistence';

function persistenceMode() {
  return window.sessionStorage.getItem(AUTH_PERSISTENCE_KEY) ?? 'local';
}

const authStorage = {
  getItem(key: string) {
    const sessionValue = window.sessionStorage.getItem(key);
    const localValue = window.localStorage.getItem(key);
    return persistenceMode() === 'session'
      ? sessionValue ?? localValue
      : localValue ?? sessionValue;
  },
  setItem(key: string, value: string) {
    if (persistenceMode() === 'session') {
      window.sessionStorage.setItem(key, value);
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, value);
    window.sessionStorage.removeItem(key);
  },
  removeItem(key: string) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export function setAuthPersistence(rememberMe: boolean) {
  window.sessionStorage.setItem(AUTH_PERSISTENCE_KEY, rememberMe ? 'local' : 'session');
}

if (!config.ready) {
  throw new Error(`Missing environment variables: ${config.missing.join(', ')}`);
}

export const supabase = createClient(config.url, config.anonKey, {
  auth: {
    persistSession: true,
    storage: authStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
