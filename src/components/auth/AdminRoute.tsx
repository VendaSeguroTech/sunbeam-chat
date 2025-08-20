import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

const AdminRoute: React.FC = () => {
  const { isAdmin, loading } = useUserRole();

  if (loading) {
    // You can add a loading spinner here if you want
    return <div>Verificando permissões...</div>;
  }

  return isAdmin ? <Outlet /> : <Navigate to="/chat" replace />;
};

export default AdminRoute;
