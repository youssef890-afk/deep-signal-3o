import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getStoredLanguage, translate } from '@/lib/i18n';

interface MessagesContextValue {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextValue>({
  unreadCount: 0,
  refreshUnread: async () => {},
});

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [incomingMessage, setIncomingMessage] = useState<{ id: string; senderId: string } | null>(null);

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setIncomingMessage(null);
      return;
    }
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .is('read_at', null);
    if (error) {
      console.error('Unread message count could not be refreshed:', error);
      return;
    }
    setUnreadCount(count ?? 0);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setIncomingMessage(null);
      return;
    }

    void refreshUnread();

    // Filter on the server so a client is not woken by every message written in
    // the system. The channel name is stable so a re-render does not resubscribe.
    const channel = supabase
      .channel(`unread:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          void refreshUnread();
          if (payload.eventType === 'INSERT') {
            const message = payload.new as { id?: string; sender_id?: string };
            if (!message.id || !message.sender_id || message.sender_id === user.id) return;
            const notificationsEnabled = areMessageNotificationsEnabled();
            if (notificationsEnabled && window.location.pathname !== `/chat/${message.sender_id}`) {
              setIncomingMessage({ id: message.id, senderId: message.sender_id });
            }
            if (
              document.visibilityState === 'hidden'
              && typeof Notification !== 'undefined'
              && Notification.permission === 'granted'
              && notificationsEnabled
            ) {
              try {
                const notification = new Notification('Deep-Signal', {
                  body: translate(getStoredLanguage(), 'newMessageNotification'),
                  tag: `message-${message.sender_id}`,
                });
                notification.onclick = () => {
                  window.focus();
                  navigate(`/chat/${message.sender_id}`);
                  notification.close();
                };
              } catch (error) {
                console.error('System notification could not be displayed:', error);
              }
            }
          }
        }
      )
      .subscribe();

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshUnread();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      void supabase.removeChannel(channel);
    };
  }, [navigate, user, refreshUnread]);

  useEffect(() => {
    if (!incomingMessage) return;
    const timer = window.setTimeout(() => setIncomingMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [incomingMessage]);

  return (
    <MessagesContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
      {incomingMessage && (
        <button
          type="button"
          onClick={() => {
            navigate(`/chat/${incomingMessage.senderId}`);
            setIncomingMessage(null);
          }}
          className="fixed inset-x-3 bottom-[calc(82px+env(safe-area-inset-bottom))] z-[70] mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-[var(--accent)]/25 bg-[var(--surface)] p-3 text-start text-sm text-[var(--text)] shadow-2xl lg:inset-x-auto lg:end-5 lg:bottom-5"
          aria-live="polite"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">●</span>
          <span className="min-w-0 flex-1">{translate(getStoredLanguage(), 'newMessageNotification')}</span>
        </button>
      )}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  return useContext(MessagesContext);
}

function areMessageNotificationsEnabled(): boolean {
  try {
    const saved = localStorage.getItem('ds-settings-v1');
    if (!saved) return true;
    const settings = JSON.parse(saved) as { messages?: unknown };
    return settings.messages !== false;
  } catch (error) {
    console.error('Saved notification preferences could not be read:', error);
    return true;
  }
}
