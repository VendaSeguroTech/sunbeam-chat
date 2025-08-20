// src/hooks/usePresence.ts
import { useEffect, useRef } from 'react';
import { supabase } from '@/supabase/client';

export function usePresence(intervalMs = 30_000) {
  const stoppedRef = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('profiles').upsert(
        { id: user.id, email: user.email },
        { onConflict: 'id' }
      );

      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    };

    tick();
    timer = setInterval(() => !stoppedRef.current && tick(), intervalMs);

    return () => {
      stoppedRef.current = true;
      if (timer) clearInterval(timer);
    };
  }, [intervalMs]);
}

