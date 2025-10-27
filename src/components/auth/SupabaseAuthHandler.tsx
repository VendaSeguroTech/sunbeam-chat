import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/supabase/client';

/**
 * Componente que processa tokens Supabase do hash da URL
 *
 * Quando o backend SSO redireciona para /chat com tokens no hash:
 * /chat#access_token=XXX&refresh_token=YYY&type=recovery
 *
 * Este componente:
 * 1. Detecta os tokens no hash
 * 2. Seta a sessão no Supabase client usando setSession()
 * 3. Limpa o hash da URL
 * 4. Mantém o usuário na página atual
 */
const SupabaseAuthHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthTokens = async () => {
      // Verificar se há hash na URL
      const hash = location.hash;

      if (!hash) {
        console.log('[SupabaseAuthHandler] Nenhum hash detectado');
        return;
      }

      console.log('[SupabaseAuthHandler] Hash detectado:', hash.substring(0, 50) + '...');

      // Remover o # inicial e parsear os parâmetros
      const hashParams = new URLSearchParams(hash.substring(1));

      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const recoveryToken = hashParams.get('recovery_token');
      const type = hashParams.get('type');

      console.log('[SupabaseAuthHandler] Parâmetros extraídos:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasRecoveryToken: !!recoveryToken,
        type,
      });

      try {
        // Caso 1: Recovery Token (precisa chamar verifyOtp)
        if (recoveryToken) {
          console.log('[SupabaseAuthHandler] Processando recovery token via verifyOtp...');

          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: recoveryToken,
            type: 'recovery',
          });

          if (error) {
            console.error('[SupabaseAuthHandler] ❌ Erro ao verificar recovery token:', error.message);
            return;
          }

          console.log('[SupabaseAuthHandler] ✅ Sessão criada via recovery token!');
          console.log('[SupabaseAuthHandler] Usuário logado:', data.user?.email);

          // Limpar o hash da URL
          window.history.replaceState(null, '', location.pathname + location.search);
          console.log('[SupabaseAuthHandler] ✅ Hash limpo, usuário autenticado!');
          return;
        }

        // Caso 2: Access Token + Refresh Token direto
        if (!accessToken) {
          console.log('[SupabaseAuthHandler] Nenhum token válido encontrado');
          return;
        }

        console.log('[SupabaseAuthHandler] Setando sessão Supabase com access_token...');

        // Setar a sessão no Supabase client
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '', // Refresh token é opcional
        });

        if (error) {
          console.error('[SupabaseAuthHandler] ❌ Erro ao setar sessão:', error.message);
          return;
        }

        console.log('[SupabaseAuthHandler] ✅ Sessão Supabase criada com sucesso!');
        console.log('[SupabaseAuthHandler] Usuário logado:', data.user?.email);

        // Limpar o hash da URL (manter o usuário na mesma rota)
        console.log('[SupabaseAuthHandler] Limpando hash da URL...');

        // Usar replaceState para limpar hash sem recarregar
        window.history.replaceState(null, '', location.pathname + location.search);

        console.log('[SupabaseAuthHandler] ✅ Hash limpo, usuário autenticado!');

      } catch (error) {
        console.error('[SupabaseAuthHandler] ❌ Erro inesperado:', error);
      }
    };

    handleAuthTokens();
  }, [location.hash, location.pathname, location.search, navigate]);

  // Este componente não renderiza nada
  return null;
};

export default SupabaseAuthHandler;
