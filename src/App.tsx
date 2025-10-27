import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useSearchParams } from "react-router-dom";
import Login from "@/components/auth/Login";
import SSORedirect from "@/components/auth/SSORedirect";
import ChatLayout from "@/components/chat/ChatLayout";
import AdminPage from '@/pages/Admin';
import AdminRoute from '@/components/auth/AdminRoute';
import { PresenceProvider } from '@/contexts/PresenceContext';
import MaintenancePage from "@/pages/maintenance";
import RouteGuard from "@/components/auth/RouteGuard";
import ProtectedRouteSSO from "@/components/auth/ProtectedRoute SSO";
import { useAuth } from "./hooks/useAuth";

// Componente para decidir a rota inicial
const Root: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sso = searchParams.get('sso');
  const token = searchParams.get('token');

  // Se os parâmetros de SSO estiverem presentes, redireciona para a rota de SSO
  if (sso && token) {
    // Mantém os parâmetros na URL para o SSORedirect poder processá-los
    return <Navigate to={`/sso/redirect${window.location.search}`} replace />;
  }

  // Caso contrário, vai para a rota de chat padrão
  return <Navigate to="/chat" replace />;
};

// Componente de proteção de rota que usa o hook de autenticação SSO
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Verificando autenticação...</div>; // Ou um spinner
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <PresenceProvider>
      <Router>
        <Routes>
          {/* Rota de SSO dedicada */}
          <Route path="/sso/redirect" element={<SSORedirect />} />

          {/* The maintenance page is a standalone route, accessible to all */}
          <Route path="/maintenance" element={<MaintenancePage />} />

          {/* All other routes are children of the RouteGuard */}
          <Route element={<RouteGuard />}>
            <Route path="/login" element={<Login />} />
            <Route
              path="/chat"
              element={<ProtectedRouteSSO><ChatLayout /></ProtectedRouteSSO>}
            />
            <Route element={<ProtectedRoute><AdminRoute /></ProtectedRoute>}>
                <Route path="/admin" element={<AdminPage />} />
            </Route>
            {/* A rota raiz agora usa o componente Root para decidir o destino */}
            <Route path="/" element={<Root />} />
          </Route>
        </Routes>
      </Router>
    </PresenceProvider>
  );
};

export default App;