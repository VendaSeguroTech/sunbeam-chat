import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/supabase/client';
import { RealtimeChannel, Session } from '@supabase/supabase-js';

// Shape of a single presence entry
export interface Presence {
  user_id: string;
  email: string;
}

// Shape of the context value
interface PresenceContextType {
  onlineUsers: Presence[];
  error: string | null;
}

// Create the context
const PresenceContext = createContext<PresenceContextType>({ onlineUsers: [], error: null });

// Custom hook to use the context
export const usePresenceContext = () => useContext(PresenceContext);

// The provider component
export const PresenceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [onlineUsers, setOnlineUsers] = useState<Presence[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // 1. Get the user session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Manage the realtime channel based on the session
  useEffect(() => {
    const channelName = 'online-users';
    let channel: RealtimeChannel | null = null;
    let retryAttempted = false;

    if (session?.user) {
      channel = supabase.channel(channelName, {
        config: {
          presence: { key: session.user.id },
        },
      });

      channel.on('presence', { event: 'sync' }, () => {
        try {
          const presenceState = channel?.presenceState<Presence>();
          if (presenceState) {
            const users = Object.values(presenceState)
              .map((presence) => presence[0])
              .filter((p): p is Presence => !!p);
            setOnlineUsers(users);
          }
        } catch (err) {
          console.error('Error processing presence sync:', err);
          setError('Failed to sync online users.');
        }
      });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Announce presence as soon as subscribed
          await channel?.track({
            user_id: session.user.id,
            email: session.user.email,
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (!retryAttempted) {
            retryAttempted = true;
            const errorMessage = 'Realtime não está disponível no servidor Supabase.';
            console.warn(errorMessage, 'A funcionalidade de presença foi desabilitada.');
            setError(errorMessage);
            // Limpa o canal para evitar múltiplas tentativas
            if (channel) {
              supabase.removeChannel(channel);
            }
          }
        }
      });
    }

    // Cleanup function
    return () => {
      if (channel) {
        channel.untrack();
        supabase.removeChannel(channel);
      }
    };
  }, [session]); // Re-run when session changes

  return (
    <PresenceContext.Provider value={{ onlineUsers, error }}>
      {children}
    </PresenceContext.Provider>
  );
};