import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

/**
 * Componente de rota protegida usando autenticação via cookie SSO
 *
 * Verifica autenticação via GET /api/me (cookie vs_session é enviado automaticamente)
 */
const ProtectedRouteSSO: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-chat-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-novo-chat border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirecionar para o Hub para autenticação via SSO
    console.log('[ProtectedRouteSSO] Usuário não autenticado, redirecionando para Hub...');
    window.location.href = 'https://hub.vendaseguro.com.br';
    return null;
  }

  return children;
};

export default ProtectedRouteSSO;
