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
      {/* Sidebar */}
      <ChatSidebar 
        isOpen={sidebarOpen} 
        onConversationSelect={handleConversationSelect}
        onSessionSelect={handleSessionSelect}
        toggleSidebar={toggleSidebar}
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