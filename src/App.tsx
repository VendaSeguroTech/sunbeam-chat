import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { supabase } from "@/supabase/client"; 
import Login from "@/components/auth/Login";
import { Session } from '@supabase/supabase-js'; 
import ChatLayout from "@/components/chat/ChatLayout"; 

const App: React.FC = () => {
  
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Checa sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/chat"
          element={session ? <ChatLayout /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to="/chat" />} /> {/* Redireciona raiz para chat */}
      </Routes>
    </Router>
  );
};

export default App;

// ... rest of code remains same