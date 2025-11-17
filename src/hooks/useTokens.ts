import { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';
import { useUserRole } from './useUserRole';

interface UseTokensReturn {
  tokens: number;
  isLoading: boolean;
  hasUnlimitedTokens: boolean;
  canSendMessage: boolean;
  decrementToken: () => Promise<boolean>;
  refreshTokens: () => Promise<void>;
  timeUntilReset: number | null; // Segundos até o próximo reset
  nextResetTime: Date | null; // Data/hora do próximo reset
}

export const useTokens = (): UseTokensReturn => {
  const [tokens, setTokens] = useState<number>(0);
  const [unlimitedOverride, setUnlimitedOverride] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastResetTime, setLastResetTime] = useState<Date | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState<number | null>(null);
  const { userRole } = useUserRole();

  // Admins ou usuários com override têm tokens ilimitados
  const hasUnlimitedTokens = userRole === 'admin' || unlimitedOverride;
  const canSendMessage = hasUnlimitedTokens || tokens > 0;

  // Calcular próximo horário de reset (6 horas após last_token_reset)
  const calculateNextResetTime = (lastReset: Date): Date => {
    const nextReset = new Date(lastReset);
    nextReset.setHours(nextReset.getHours() + 6);
    return nextReset;
  };

  // Verificar se precisa fazer reset de tokens (passou 6 horas)
  const shouldResetTokens = (lastReset: Date): boolean => {
    const now = new Date();
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
    return hoursSinceReset >= 6;
  };

  const fetchTokens = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('tokens, unlimited_tokens, last_token_reset, initial_tokens')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar tokens:', error);
        setIsLoading(false);
        return;
      }

      const lastReset = data?.last_token_reset ? new Date(data.last_token_reset) : new Date();
      const initialTokens = data?.initial_tokens ?? 20;

      // Verificar se precisa fazer reset automático
      if (!data?.unlimited_tokens && shouldResetTokens(lastReset)) {
        // Fazer reset: restaurar tokens para o valor inicial
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            tokens: initialTokens,
            last_token_reset: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Erro ao fazer reset de tokens:', updateError);
        } else {
          setTokens(initialTokens);
          setLastResetTime(new Date());
          console.log('Tokens resetados automaticamente para', initialTokens);
        }
      } else {
        setTokens(data?.tokens ?? 0);
        setLastResetTime(lastReset);
      }

      setUnlimitedOverride(data?.unlimited_tokens ?? false);
    } catch (error) {
      console.error('Erro ao buscar tokens:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const decrementToken = async (): Promise<boolean> => {
    // Admins não gastam tokens
    if (hasUnlimitedTokens) {
      return true;
    }

    if (tokens <= 0) {
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const newTokenCount = tokens - 1;

      const { error } = await supabase
        .from('profiles')
        .update({ tokens: newTokenCount })
        .eq('id', user.id);

      if (error) {
        console.error('Erro ao decrementar token:', error);
        return false;
      }

      setTokens(newTokenCount);
      return true;
    } catch (error) {
      console.error('Erro ao decrementar token:', error);
      return false;
    }
  };

  const refreshTokens = async () => {
    await fetchTokens();
  };

  // Atualizar contador de tempo até o reset a cada segundo
  useEffect(() => {
    if (!lastResetTime || hasUnlimitedTokens) {
      setTimeUntilReset(null);
      return;
    }

    const updateTimer = () => {
      const nextReset = calculateNextResetTime(lastResetTime);
      const now = new Date();
      const secondsRemaining = Math.max(0, Math.floor((nextReset.getTime() - now.getTime()) / 1000));

      setTimeUntilReset(secondsRemaining);

      // Se chegou a hora do reset, buscar tokens novamente
      if (secondsRemaining === 0) {
        fetchTokens();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [lastResetTime, hasUnlimitedTokens]);

  useEffect(() => {
    fetchTokens();
  }, [userRole]);

  const nextResetTime = lastResetTime ? calculateNextResetTime(lastResetTime) : null;

  return {
    tokens,
    isLoading,
    hasUnlimitedTokens,
    canSendMessage,
    decrementToken,
    refreshTokens,
    timeUntilReset,
    nextResetTime,
  };
};
