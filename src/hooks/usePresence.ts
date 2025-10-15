// src/hooks/usePresence.ts
import { useEffect, useRef } from 'react';
import { supabase } from '@/supabase/client';

export function usePresence(intervalMs = 30_000) {
  const stoppedRef = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('⚠️ usePresence: Nenhum usuário autenticado');
        return;
      }

      console.log('🔄 Atualizando last_seen para:', user.email);

      // Primeiro garante que o perfil existe
      await supabase.from('profiles').upsert(
        { id: user.id, email: user.email },
        { onConflict: 'id' }
      );

      // Atualiza o last_seen
      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({ last_seen: timestamp })
        .eq('id', user.id);

      if (error) {
        console.error('❌ Erro ao atualizar last_seen:', error);
      } else {
        console.log('✅ last_seen atualizado com sucesso:', timestamp);
      }
    };

    // Executa imediatamente ao montar
    tick();

    // Continua executando no intervalo
    timer = setInterval(() => !stoppedRef.current && tick(), intervalMs);

    return () => {
      stoppedRef.current = true;
      if (timer) clearInterval(timer);
    };
  }, [intervalMs]);
}

