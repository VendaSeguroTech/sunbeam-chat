import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  nickname: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para autenticação via cookie SSO
 *
 * Chama GET /api/me para verificar se há sessão ativa
 * O cookie vs_session é enviado automaticamente (HttpOnly)
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // Em produção, usar o mesmo domínio (proxy Nginx)
  // Em desenvolvimento, usar localhost:3002
  const API_BASE_URL = import.meta.env.VITE_SSO_API_URL ||
    (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3002');

  useEffect(() => {
    async function checkAuth() {
      const url = `${API_BASE_URL}/api/me`;
      console.log('[AUTH] Verificando autenticação em:', url);
      console.log('[AUTH] API_BASE_URL:', API_BASE_URL);
      console.log('[AUTH] MODE:', import.meta.env.MODE);

      try {
        console.log('[AUTH] Fazendo fetch...');
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include', // Importante: envia cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('[AUTH] Response status:', response.status);

        const data = await response.json();
        console.log('[AUTH] Response data:', data);

        if (response.ok && data.ok && data.user) {
          console.log('[AUTH] ✅ Usuário autenticado:', data.user.email);
          setState({
            user: data.user,
            loading: false,
            error: null,
          });
        } else {
          console.log('[AUTH] ❌ Não autenticado:', data.error);
          setState({
            user: null,
            loading: false,
            error: data.error || 'not_authenticated',
          });
        }
      } catch (error) {
        console.error('[AUTH] Erro ao verificar autenticação:', error);
        setState({
          user: null,
          loading: false,
          error: 'network_error',
        });
      }
    }

    checkAuth();
  }, [API_BASE_URL]);

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      setState({
        user: null,
        loading: false,
        error: null,
      });

      // Redirecionar para Hub ou login
      window.location.href = 'https://hub.vendaseguro.com.br';
    } catch (error) {
      console.error('[AUTH] Erro ao fazer logout:', error);
    }
  };

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,
    logout,
  };
}
