import React, { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatSidebar from "./ChatSidebar";
import ChatInterface from "./ChatInterface";
import { ConversationHistory } from "@/hooks/useConversationHistory";

const ChatLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [selectedConversation, setSelectedConversation] = useState<ConversationHistory | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState<number>(0); // Key para forçar re-render do chat

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

  return (
    <div className="flex h-screen w-full bg-chat-background">
      {/* Header com botão hambúrguer */}
      <div className="fixed top-0 left-0 z-50 p-3">
        <Button
          onClick={toggleSidebar}
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Sidebar */}
      <ChatSidebar 
        isOpen={sidebarOpen} 
        onConversationSelect={handleConversationSelect}
        onSessionSelect={handleSessionSelect}
      />
      
      {/* Chat principal */}
      <div className="flex-1">
        <ChatInterface 
          key={chatKey} // Força re-render quando nova conversa é iniciada
          selectedConversation={selectedConversation}
          selectedSessionId={selectedSessionId}
          onNewChatStarted={handleNewChatStarted}
        />
      </div>
    </div>
  );
};

export default ChatLayout;