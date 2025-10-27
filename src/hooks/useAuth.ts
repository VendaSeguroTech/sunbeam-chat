import { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';

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
 * Hook para autenticação híbrida (SSO + Supabase)
 *
 * Prioridade de verificação:
 * 1. Verificar sessão Supabase (supabase.auth.getSession())
 * 2. Se não houver, verificar cookie SSO via GET /api/me
 *
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
      console.log('[AUTH] Iniciando verificação de autenticação...');

      try {
        // 1. PRIMEIRO: Verificar se há sessão Supabase
        console.log('[AUTH] Verificando sessão Supabase...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!sessionError && session) {
          console.log('[AUTH] ✅ Sessão Supabase encontrada:', session.user.email);
          setState({
            user: {
              id: session.user.id,
              email: session.user.email || '',
              nickname: session.user.email || '',
            },
            loading: false,
            error: null,
          });
          return; // Sessão Supabase é suficiente
        }

        console.log('[AUTH] ⚠️  Nenhuma sessão Supabase, verificando cookie SSO...');

        // 2. FALLBACK: Verificar cookie SSO via /api/me
        const url = `${API_BASE_URL}/api/me`;
        console.log('[AUTH] Verificando autenticação SSO em:', url);

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
          console.log('[AUTH] ✅ Usuário autenticado via SSO:', data.user.email);
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
