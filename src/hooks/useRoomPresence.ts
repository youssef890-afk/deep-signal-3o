import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useHostHeartbeat(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const sendHeartbeat = async () => {
      if (!navigator.onLine) return;

      const { error } = await supabase.rpc('host_heartbeat');
      if (error) console.error('Host heartbeat failed:', error);
    };

    void sendHeartbeat();
    const interval = window.setInterval(() => void sendHeartbeat(), 15_000);
    const handleOnline = () => void sendHeartbeat();
    window.addEventListener('online', handleOnline);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled]);
}

export function useStaleRoomSweeper(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const closeStaleRooms = async () => {
      const { error } = await supabase.rpc('close_stale_rooms');
      if (error) console.error('Stale room cleanup failed:', error);
    };

    void closeStaleRooms();
    const interval = window.setInterval(() => void closeStaleRooms(), 20_000);

    return () => window.clearInterval(interval);
  }, [enabled]);
}
