import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Login from "@/components/auth/Login";
import ChatLayout from "@/components/chat/ChatLayout";
import AdminPage from '@/pages/Admin';
import AdminRoute from '@/components/auth/AdminRoute';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { usePresence } from '@/hooks/usePresence';
import { supabase } from "./supabase/client";
import MaintenancePage from "@/pages/maintenance";
import RouteGuard from "@/components/auth/RouteGuard";

// A simple component to handle route protection
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const [session, setSession] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);

  // Atualizar last_seen a cada 30 segundos quando o usuário está logado
  usePresence(30000);

  React.useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error) {
        setSession(data.session);
      }
      setLoading(false);
    };
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return null; // Or a loading spinner
  }

  return session ? children : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <PresenceProvider>
      <Router>
        <Routes>
          {/* The maintenance page is a standalone route, accessible to all */}
          <Route path="/maintenance" element={<MaintenancePage />} />

          {/* All other routes are children of the RouteGuard */}
          <Route element={<RouteGuard />}>
            <Route path="/login" element={<Login />} />
            <Route
              path="/chat"
              element={<ProtectedRoute><ChatLayout /></ProtectedRoute>}
            />
            <Route element={<ProtectedRoute><AdminRoute /></ProtectedRoute>}>
                <Route path="/admin" element={<AdminPage />} />
            </Route>
            <Route path="/" element={<Navigate to="/chat" />} />
          </Route>
        </Routes>
      </Router>
    </PresenceProvider>
  );
};

export default App;