import React, { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatSidebar from "./ChatSidebar";
import ChatInterface from "./ChatInterface";
import { ConversationHistory } from "@/hooks/useConversationHistory";
import ModelSelector from "./ModelSelector"; // Import the new component

const ChatLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [selectedConversation, setSelectedConversation] = useState<ConversationHistory | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState<number>(0); // Key para forçar re-render do chat
  const [selectedModel, setSelectedModel] = useState<string>("basic"); // Novo estado para o modelo selecionado

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
    <div className="relative flex h-[100svh] w-full bg-chat-background overflow-hidden">
      {/* Sidebar: vira drawer no mobile */}
      <div
        className={`
          md:relative md:translate-x-0 md:z-0
          fixed inset-y-0 left-0 z-40
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <ChatSidebar
          isOpen={sidebarOpen}
          onConversationSelect={handleConversationSelect}
          onSessionSelect={handleSessionSelect}
          toggleSidebar={toggleSidebar}
        />
      </div>

      {/* Backdrop no mobile quando aberta */}
      {sidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/40 md:hidden z-30"
          aria-hidden="true"
        />
      )}

      {/* Botão flutuante para abrir o menu no mobile quando estiver fechado */}
      {!sidebarOpen && (
        <Button
          onClick={toggleSidebar}
          variant="default"
          size="icon"
          className="
            md:hidden fixed top-4 left-4 z-50
            h-10 w-10 rounded-full shadow-lg
            bg-primary text-primary-foreground
          "
          aria-label="Abrir menu"
          aria-controls="app-sidebar"
          aria-expanded={sidebarOpen}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}


      {/* Chat principal */}
      <div className="flex-1 min-w-0 relative"> {/* Added relative here for positioning */}
        <div className="absolute top-4 left-4 z-10"> {/* Positioned ModelSelector */}
          <ModelSelector onValueChange={handleModelChange} defaultValue={selectedModel} />
        </div>
        <ChatInterface
          key={chatKey}
          selectedConversation={selectedConversation}
          selectedSessionId={selectedSessionId}
          onNewChatStarted={handleNewChatStarted}
          selectedModel={selectedModel} // Pass the selected model to ChatInterface
        />
      </div>
    </div>
  );
};

export default ChatLayout;