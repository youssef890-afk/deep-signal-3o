import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface PresenceProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  avatar_type: 'uploaded' | 'generated' | 'emoji' | null;
  avatar_emoji: string | null;
}

interface OnlinePresenceValue {
  onlineIds: string[];
  onlineProfiles: PresenceProfile[];
  recentProfiles: PresenceProfile[];
  onlineProfilesLoading: boolean;
  onlineProfilesError: boolean;
  recentProfilesLoading: boolean;
  recentProfilesError: boolean;
}

interface OnlinePresenceProviderProps {
  userId: string | null;
  loadRecentProfiles?: boolean;
  children: ReactNode;
}

const profileCache = new Map<string, PresenceProfile>();
const OnlinePresenceContext = createContext<OnlinePresenceValue>({
  onlineIds: [],
  onlineProfiles: [],
  recentProfiles: [],
  onlineProfilesLoading: false,
  onlineProfilesError: false,
  recentProfilesLoading: false,
  recentProfilesError: false,
});

export function OnlinePresenceProvider({ userId, loadRecentProfiles = false, children }: OnlinePresenceProviderProps) {
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [onlineProfiles, setOnlineProfiles] = useState<PresenceProfile[]>([]);
  const [recentProfiles, setRecentProfiles] = useState<PresenceProfile[]>([]);
  const [onlineProfilesLoading, setOnlineProfilesLoading] = useState(false);
  const [onlineProfilesError, setOnlineProfilesError] = useState(false);
  const [recentProfilesLoading, setRecentProfilesLoading] = useState(false);
  const [recentProfilesError, setRecentProfilesError] = useState(false);

  useEffect(() => {
    setOnlineIds([]);
    if (!userId) {
      return;
    }

    let active = true;
    const channel: RealtimeChannel = supabase.channel('online-users', {
      config: { private: true, presence: { key: userId } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      if (!active) return;
      const state = channel.presenceState<{ user_id?: string }>();
      const ids = [...new Set(
        Object.entries(state).flatMap(([key, presences]) =>
          presences.map((presence) => presence.user_id || key)
        )
      )].sort();
      setOnlineIds((current) => (
        current.length === ids.length && current.every((id, index) => id === ids[index])
          ? current
          : ids
      ));
    });

    channel.subscribe((status, error) => {
      if (!active) return;
      if (status === 'SUBSCRIBED') {
        void channel.track({ user_id: userId, online_at: new Date().toISOString() }).then((trackStatus) => {
          if (trackStatus !== 'ok') console.error('Online presence tracking failed:', trackStatus);
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('Online presence channel failed:', error ?? status);
      }
    });

    return () => {
      active = false;
      void (async () => {
        const untrackStatus = await channel.untrack();
        if (untrackStatus !== 'ok') console.error('Online presence untrack failed:', untrackStatus);
        const removeStatus = await supabase.removeChannel(channel);
        if (removeStatus !== 'ok') console.error('Online presence channel cleanup failed:', removeStatus);
      })();
    };
  }, [userId]);

  useEffect(() => {
    let active = true;
    const cached = onlineIds.flatMap((id) => {
      const profile = profileCache.get(id);
      return profile ? [profile] : [];
    });
    const missingIds = onlineIds.filter((id) => !profileCache.has(id));
    setOnlineProfiles(cached);
    setOnlineProfilesLoading(missingIds.length > 0);
    setOnlineProfilesError(false);

    if (missingIds.length === 0) return () => { active = false; };

    const loadOnlineProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, avatar_type, avatar_emoji')
        .in('id', missingIds);

      if (error) {
        console.error('Could not load online profiles:', error);
        if (active) {
          setOnlineProfilesError(true);
          setOnlineProfilesLoading(false);
        }
        return;
      }

      for (const profile of (data ?? []) as PresenceProfile[]) {
        profileCache.set(profile.id, profile);
      }
      if (active) {
        setOnlineProfiles(onlineIds.flatMap((id) => {
          const profile = profileCache.get(id);
          return profile ? [profile] : [];
        }));
        setOnlineProfilesLoading(false);
      }
    };

    void loadOnlineProfiles();
    return () => { active = false; };
  }, [onlineIds]);

  useEffect(() => {
    if (!userId || !loadRecentProfiles) {
      setRecentProfiles([]);
      setRecentProfilesLoading(false);
      return;
    }

    let active = true;
    setRecentProfilesLoading(true);
    setRecentProfilesError(false);

    const fetchRecentProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, avatar_type, avatar_emoji')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Could not load recent profiles:', error);
        if (active) {
          setRecentProfilesError(true);
          setRecentProfilesLoading(false);
        }
        return;
      }

      const profiles = (data ?? []) as PresenceProfile[];
      for (const profile of profiles) profileCache.set(profile.id, profile);
      if (active) {
        setRecentProfiles(profiles);
        setRecentProfilesLoading(false);
      }
    };

    void fetchRecentProfiles();
    return () => { active = false; };
  }, [loadRecentProfiles, userId]);

  return createElement(
    OnlinePresenceContext.Provider,
    {
      value: {
        onlineIds,
        onlineProfiles,
        recentProfiles,
        onlineProfilesLoading,
        onlineProfilesError,
        recentProfilesLoading,
        recentProfilesError,
      },
    },
    children,
  );
}

export function useOnlineUsers(): { onlineIds: string[] } {
  const { onlineIds } = useContext(OnlinePresenceContext);
  return { onlineIds };
}

export function useOnlinePresenceProfiles() {
  const {
    onlineProfiles,
    recentProfiles,
    onlineProfilesLoading,
    onlineProfilesError,
    recentProfilesLoading,
    recentProfilesError,
  } = useContext(OnlinePresenceContext);
  return {
    onlineProfiles,
    recentProfiles,
    onlineProfilesLoading,
    onlineProfilesError,
    recentProfilesLoading,
    recentProfilesError,
  };
}
