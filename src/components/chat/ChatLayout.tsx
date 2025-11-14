import React, { useState, useEffect, useRef } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatSidebar from "./ChatSidebar";
import ChatInterface from "./ChatInterface";
import { ConversationHistory } from "@/hooks/useConversationHistory";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { supabase } from "@/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ModelSelector from "./ModelSelector"; // Import the new component
import RacingBorder from "./RacingBorder";
import TermsPopup from "./TermsPopup";

const ChatLayout: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    // Inicializar baseado no tamanho da janela para evitar flash
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [selectedConversation, setSelectedConversation] = useState<ConversationHistory | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState<number>(0); // Key para forçar re-render do chat
  const [selectedModel, setSelectedModel] = useState<string>("basic"); // Novo estado para o modelo selecionado
  const [showBorderRace, setShowBorderRace] = useState<boolean>(false); // Estado para animação de primeira visita
  const [showTermsPopup, setShowTermsPopup] = useState<boolean>(false); // Estado para popup de termos
  const [userId, setUserId] = useState<string | null>(null);

  // Logout automático após 3 horas de inatividade
  const handleIdleLogout = async () => {
    try {
      await supabase.auth.signOut();

      toast({
        title: "Sessão expirada",
        description: "Você foi desconectado por inatividade.",
        variant: "destructive",
      });

      // Redirecionar para o hub
      window.location.href = "https://hub.vendaseguro.com.br/";
    } catch (error) {
      console.error("Erro ao fazer logout por inatividade:", error);
    }
  };

  // Hook de inatividade - 3 horas (10800000 ms)
  useIdleTimer({
    timeout: 3 * 60 * 60 * 1000, // 3 horas
    onIdle: handleIdleLogout,
  });

  // Verificar se usuário aceitou os termos e carregar dados do perfil
  useEffect(() => {
    const checkTermsAcceptance = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);

          // Buscar dados do perfil
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('terms_accepted')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Erro ao buscar perfil:', error);
            return;
          }

          // Se não aceitou os termos, mostrar popup
          if (!profile?.terms_accepted) {
            setShowTermsPopup(true);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar aceitação de termos:', error);
      }
    };

    checkTermsAcceptance();
  }, []);

  // Detectar primeira visita e ativar animação de borda
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisitedChat');

    if (!hasVisited) {
      setShowBorderRace(true);
      localStorage.setItem('hasVisitedChat', 'true');

      // Remover a classe após a animação terminar (5s)
      const timer = setTimeout(() => {
        setShowBorderRace(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, []);

  // Fechar sidebar automaticamente quando mudar para mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const toggleSidebar = (): void => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleConversationSelect = (conversation: ConversationHistory | null) => {
    setSelectedConversation(conversation);
    setSelectedSessionId(null); // Limpar sessão do n8n quando selecionar conversa antiga

    // Se for uma nova conversa (null), incrementar a key para forçar re-render
    if (conversation === null) {
      setChatKey(prev => prev + 1);
    }
  };

  const handleSessionSelect = (sessionId: string | null) => {
    setSelectedSessionId(sessionId);
    setSelectedConversation(null); // Limpar conversa antiga quando selecionar sessão do n8n

    // Se for uma nova conversa (null), incrementar a key para forçar re-render
    if (sessionId === null) {
      setChatKey(prev => prev + 1);
    }
  };

  const handleNewChatStarted = () => {
    // Callback quando uma nova conversa é realmente criada (após primeira mensagem)
    console.log('Nova conversa foi salva no banco de dados');
  };

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
  };

  const handleAcceptTerms = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Erro ao atualizar aceitação de termos:', error);
        toast({
          title: "Erro",
          description: "Não foi possível registrar a aceitação dos termos. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      setShowTermsPopup(false);
      toast({
        title: "Termos aceitos",
        description: "Obrigado por aceitar nossos termos de uso!",
      });
    } catch (error) {
      console.error('Erro ao aceitar termos:', error);
    }
  };

  return (
    <div
      className="relative flex h-[100svh] w-full overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(
          135deg,
          #003A85 0%,
          #0053C7 18%,
          #4DA9FF 35%,
          #F4E7D4 55%,
          #F9C38A 72%,
          #FF8A23 88%,
          #FF6A00 100%
        )`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Aurora: círculos de luz animados */}
      <div
        className="aurora-effect"
        style={{
          content: '""',
          position: 'absolute',
          inset: '-30%',
          pointerEvents: 'none',
          zIndex: 1,
          backgroundImage: `
            radial-gradient(circle at 15% 25%, rgba(255,255,255,0.45), transparent 60%),
            radial-gradient(circle at 85% 20%, rgba(77,169,255,0.45), transparent 65%),
            radial-gradient(circle at 25% 85%, rgba(255,138,35,0.45), transparent 65%),
            radial-gradient(circle at 80% 80%, rgba(0,83,199,0.50), transparent 60%)
          `,
          backgroundRepeat: 'no-repeat',
          backgroundSize: '55% 55%, 65% 65%, 60% 60%, 70% 70%',
          mixBlendMode: 'soft-light',
          opacity: 0.95,
        }}
      />
      {/* Sidebar: vira drawer no mobile */}
      <div
        className={`
          md:relative md:translate-x-0 md:z-0
          fixed inset-y-0 left-0
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ zIndex: 9999 }}
      >
        <ChatSidebar
          isOpen={sidebarOpen}
          onConversationSelect={handleConversationSelect}
          onSessionSelect={handleSessionSelect}
          toggleSidebar={toggleSidebar}
        />
      </div>

      {/* Backdrop no mobile quando aberta */}
      {sidebarOpen && isMobile && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/40 md:hidden"
          style={{ zIndex: 9998 }}
          aria-hidden="true"
        />
      )}

      {/* Botão flutuante para abrir o menu no mobile quando estiver fechado */}
      {!sidebarOpen && isMobile && (
        <Button
          onClick={toggleSidebar}
          variant="default"
          size="icon"
          className="
            md:hidden fixed top-8 left-7 z-50
            h-10 w-10 rounded-full shadow-lg
            bg-novo-chat hover:bg-novo-chat/90 text-primary-foreground
          "
          aria-label="Abrir menu"
          aria-controls="app-sidebar"
          aria-expanded={sidebarOpen}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Chat principal com container branco */}
      <div className="flex-1 min-w-0 flex flex-col h-full p-4 md:p-6 relative">
        {/* Container com gradiente - APENAS header e messages */}
        <div
          className={`flex-1 flex flex-col bg-white/95 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-sm ${showBorderRace ? 'racing-border-snake' : ''}`}
          style={{
            maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
          }}
        >
          {/* Traços adicionais da borda animada */}
          <RacingBorder isActive={showBorderRace} />

          {/* Header com ModelSelector - desktop: esquerda, mobile: direita */}
          <div className="flex items-center justify-end md:justify-start p-4 md:p-6 border-b border-gray-100">
            <ModelSelector onValueChange={handleModelChange} value={selectedModel} />
          </div>
          <ChatInterface
            key={chatKey}
            selectedConversation={selectedConversation}
            selectedSessionId={selectedSessionId}
            onNewChatStarted={handleNewChatStarted}
            selectedModel={selectedModel}
          />
        </div>

        {/* Input renderizado FORA do container mascarado - sempre visível */}
        <div
          className="absolute bottom-6 left-4 right-4 pointer-events-auto"
          style={{
            zIndex: 100
          }}
        >
          {/* Este div será preenchido pelo portal do ChatInterface */}
          <div id="chat-input-portal-target" />
        </div>
      </div>

      {/* Popup de Termos de Uso */}
      <TermsPopup isOpen={showTermsPopup} onAccept={handleAcceptTerms} />

    </div>
  );
};

export default ChatLayout;