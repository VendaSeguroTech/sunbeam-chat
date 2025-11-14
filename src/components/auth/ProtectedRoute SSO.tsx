import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

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
    return <LoadingSpinner message="Verificando autenticação..." />;
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
