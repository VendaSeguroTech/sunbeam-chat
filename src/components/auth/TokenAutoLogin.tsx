import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/supabase/client';
import { useToast } from '@/hooks/use-toast';

// URL da API de validação SSO (use variável de ambiente em produção)
const SSO_API_URL = import.meta.env.VITE_SSO_API_URL || 'http://localhost:3001';

/**
 * Componente que detecta token SSO na URL e faz auto-login
 * Baseado no sistema ISW SSO do Hub VendaSeguro
 */
const TokenAutoLogin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const processToken = async () => {
      // Evitar processamento duplicado
      if (isProcessing) return;

      // Verificar se há token na URL
      const token = searchParams.get('token');
      if (!token) return;

      // Verificar se já está logado
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Usuário já está logado, ignorando token SSO');
        return;
      }

      setIsProcessing(true);
      console.log('Token SSO detectado, iniciando validação...');

      try {
        // Chamar API Node.js para validar token
        console.log('Chamando API de validação SSO:', SSO_API_URL);
        const response = await fetch(SSO_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          console.error('Erro ao validar token:', data.error);
          toast({
            title: data.error === 'Invalid token format' ? 'Token inválido' : 'Erro de autenticação',
            description: data.error === 'Invalid token format'
              ? 'Seu link de acesso expirou ou é inválido.'
              : 'Não foi possível validar seu acesso. Tente novamente.',
            variant: 'destructive',
          });
          navigate('/login');
          return;
        }

        console.log('Token validado com sucesso:', data.user);

        // Usar o action_link do magic link para autenticar
        if (data.session_url) {
          // Extrair tokens da URL do magic link
          const url = new URL(data.session_url);
          const accessToken = url.searchParams.get('access_token');
          const refreshToken = url.searchParams.get('refresh_token');

          if (accessToken && refreshToken) {
            // Definir sessão manualmente
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('Erro ao criar sessão:', sessionError);
              toast({
                title: 'Erro de sessão',
                description: 'Não foi possível iniciar sua sessão.',
                variant: 'destructive',
              });
              navigate('/login');
              return;
            }

            console.log('Sessão criada com sucesso via SSO');

            toast({
              title: 'Bem-vindo!',
              description: 'Login realizado com sucesso via Hub VendaSeguro.',
            });

            // Redirecionar para o chat
            navigate('/chat');
          } else {
            throw new Error('Tokens não encontrados na URL de sessão');
          }
        }
      } catch (error) {
        console.error('Erro inesperado ao processar token:', error);
        toast({
          title: 'Erro',
          description: 'Ocorreu um erro ao processar seu acesso.',
          variant: 'destructive',
        });
        navigate('/login');
      } finally {
        setIsProcessing(false);
      }
    };

    processToken();
  }, [searchParams, navigate, toast, isProcessing]);

  // Mostrar loading enquanto processa
  if (isProcessing) {
    return (
      <div className="flex items-center justify-center h-screen bg-chat-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-novo-chat border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-foreground">Autenticando via Hub VendaSeguro...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default TokenAutoLogin;
