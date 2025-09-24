import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabase/client";
import { Mail, Lock, LogIn } from "lucide-react";
import sunbeamLogo from "@/assets/logo2.png";
import { useNavigate } from "react-router-dom";
import { useMaintenance } from "@/contexts/MaintenanceContext";

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isMaintenanceMode } = useMaintenance();

  const handleLogin = async () => {
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check user role and maintenance status for intelligent redirect
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        const isAdmin = profile?.role === "admin";

        toast({
          title: "Sucesso",
          description: "Login realizado com sucesso!",
        });

        if (isAdmin && isMaintenanceMode) {
          navigate("/admin");
        } else if (!isAdmin && isMaintenanceMode) {
          navigate("/maintenance");
        } else {
          navigate("/chat");
        }
      }
    } catch (error) {
      console.error("Erro no login:", error);
      toast({
        title: "Erro",
        description: "Credenciais inválidas ou erro de conexão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-chat-background">
      <div className="max-w-md w-full mx-auto p-8 bg-chat-input border border-border rounded-2xl shadow-md">
        {/* Logo */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center p-2 bg-muted shadow-glow dark:bg-transparent dark:shadow-none">
          <img src={sunbeamLogo} alt="VIA" className="w-full h-full object-contain" />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-foreground text-center mb-6">Bem-vindo à VIA 🦊</h1>

        {/* Formulário */}
        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu email"
              className="pl-10 bg-transparent border-border"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              className="pl-10 bg-transparent border-border"
            />
          </div>
          <Button
            onClick={handleLogin}
            disabled={isLoading || !email || !password}
            className="w-full bg-primary hover:bg-primary-hover"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Entrar
              </>
            )}
          </Button>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          Problemas com login? Contate o suporte.
        </p>
      </div>
    </div>
  );
};

export default Login;
