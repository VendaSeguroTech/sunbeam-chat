import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const AdminRoute: React.FC = () => {
  const { isAdmin, loading } = useUserRole();

  if (loading) {
    return <LoadingSpinner message="Verificando permissões..." />;
  }

  return isAdmin ? <Outlet /> : <Navigate to="/chat" replace />;
};

export default AdminRoute;
