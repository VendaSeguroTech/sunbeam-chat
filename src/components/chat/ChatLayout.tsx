import React, { useState, useEffect } from "react";
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
  const [selectedModel, setSelectedModel] = useState<string>("global"); // Novo estado para o modelo selecionado

  // Logout automático após 30 minutos de inatividade
  const handleIdleLogout = async () => {
    try {
      await supabase.auth.signOut();

      toast({
        title: "Sessão expirada",
        description: "Você foi desconectado por inatividade.",
        variant: "destructive",
      });

      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout por inatividade:", error);
    }
  };

  // Hook de inatividade - 30 minutos (1800000 ms)
  useIdleTimer({
    timeout: 30 * 60 * 1000, // 30 minutos
    onIdle: handleIdleLogout,
  });

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

  return (
    <div 
      className="relative flex h-[100svh] w-full overflow-hidden"
      style={{
        backgroundImage: `
          radial-gradient(80% 50% at 20% 0%, rgba(74, 144, 226, 0.4), transparent),
          radial-gradient(60% 40% at 50% 0%, rgba(100, 160, 230, 0.3), transparent),
          radial-gradient(70% 45% at 80% 0%, rgba(245, 166, 35, 0.4), transparent),
          radial-gradient(50% 35% at 90% 5%, rgba(255, 180, 80, 0.35), transparent),
          linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.7) 40%, #ffffff 100%),
          linear-gradient(to right, #E3F2FD 0%, #FFE8D6 100%)
        `,
        backgroundColor: '#ffffff'
      }}
    >
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
            md:hidden fixed top-4 left-4 z-50
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
          className="flex-1 flex flex-col bg-white/95 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-sm"
          style={{
            maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
          }}
        >
          <div className="flex items-center justify-start p-4 md:p-6 border-b border-gray-100">
            <ModelSelector onValueChange={handleModelChange} defaultValue={selectedModel} />
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

    </div>
  );
};

export default ChatLayout;