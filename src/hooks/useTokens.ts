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
}

export const useTokens = (): UseTokensReturn => {
  const [tokens, setTokens] = useState<number>(0);
  const [unlimitedOverride, setUnlimitedOverride] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { userRole } = useUserRole();

  // Admins ou usuários com override têm tokens ilimitados
  const hasUnlimitedTokens = userRole === 'admin' || unlimitedOverride;
  const canSendMessage = hasUnlimitedTokens || tokens > 0;

  const fetchTokens = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('tokens, unlimited_tokens')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar tokens:', error);
        setIsLoading(false);
        return;
      }

      setTokens(data?.tokens ?? 0);
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

  useEffect(() => {
    fetchTokens();
  }, [userRole]);

  return {
    tokens,
    isLoading,
    hasUnlimitedTokens,
    canSendMessage,
    decrementToken,
    refreshTokens,
  };
};
