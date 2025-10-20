import React, { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatSidebar from "./ChatSidebar";
import ChatInterface from "./ChatInterface";
import { ConversationHistory } from "@/hooks/useConversationHistory";
import ModelSelector from "./ModelSelector"; // Import the new component

const ChatLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [selectedConversation, setSelectedConversation] = useState<ConversationHistory | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState<number>(0); // Key para forçar re-render do chat
  const [selectedModel, setSelectedModel] = useState<string>("global"); // Novo estado para o modelo selecionado

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
          radial-gradient(72% 150% at 50% 100%, #ffffff, rgba(255, 255, 255, 0)),
          linear-gradient(rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0) 9.5%, #ffffff 94%),
          linear-gradient(rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.35)),
          linear-gradient(rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.15)),
          linear-gradient(rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.1)),
          linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, #ffffff 100%),
          linear-gradient(to right, #4A90E2 0%, #F5A623 100%)
        `,
        backgroundColor: '#ffffff'
      }}
    >
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

      {/* Chat principal com container branco */}
      <div className="flex-1 min-w-0 flex flex-col h-full p-4 md:p-6">
        <div className="flex-1 flex flex-col bg-white/95 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-sm">
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
      </div>
    </div>
  );
};

export default ChatLayout;