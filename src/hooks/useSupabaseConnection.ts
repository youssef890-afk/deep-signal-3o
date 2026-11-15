import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type SupabaseConnectionStatus = 'checking' | 'connected' | 'offline' | 'error';

export function useSupabaseConnection() {
  const [status, setStatus] = useState<SupabaseConnectionStatus>(() =>
    navigator.onLine ? 'checking' : 'offline'
  );
  const attemptRef = useRef(0);

  const checkConnection = useCallback(async () => {
    const attempt = ++attemptRef.current;
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }

    setStatus('checking');
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) throw error;
      if (attempt === attemptRef.current) setStatus('connected');
    } catch (error) {
      console.error('Supabase connection check failed:', error);
      if (attempt === attemptRef.current) setStatus('error');
    }
  }, []);

  useEffect(() => {
    const handleOffline = () => {
      attemptRef.current += 1;
      setStatus('offline');
    };
    const handleOnline = () => void checkConnection();

    void checkConnection();
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      attemptRef.current += 1;
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [checkConnection]);

  return { status, retry: checkConnection };
}
