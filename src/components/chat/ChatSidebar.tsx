import React from "react";
import { Plus, MessageSquare, Trash2, MoreHorizontal, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConversationHistory, ConversationHistory } from "@/hooks/useConversationHistory";
import { useN8nChatHistory } from "@/hooks/useN8nChatHistory";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import sunbeamLogo from "@/assets/logo2.png";

interface ChatSidebarProps {
  isOpen: boolean;
  onConversationSelect?: (conversation: ConversationHistory | null) => void;
  onSessionSelect?: (sessionId: string | null) => void; // Nova prop adicionada
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  isOpen, 
  onConversationSelect,
  onSessionSelect 
}) => {
  const { toast } = useToast();
  
  // Hook para conversas antigas (sistema antigo)
  const {
    conversations,
    currentConversation,
    isLoading: isLoadingConversations,
    deleteConversation,
    startNewConversation,
    setCurrentConversation
  } = useConversationHistory();

  // Hook para sessões do n8n
  const {
    sessions,
    isLoading: isLoadingSessions,
    deleteSession,
    refetch: refetchSessions
  } = useN8nChatHistory();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      console.error('Erro no logout:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer logout. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleNewConversation = () => {
    startNewConversation();
    onConversationSelect?.(null);
    onSessionSelect?.(null);
  };

  const handleConversationClick = (conversation: ConversationHistory) => {
    setCurrentConversation(conversation);
    onConversationSelect?.(conversation);
  };

  const handleSessionClick = (sessionId: string) => {
    onSessionSelect?.(sessionId);
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConversation(conversationId);
    // Se a conversa deletada for a atual, limpar seleção
    if (currentConversation?.id === conversationId) {
      onConversationSelect?.(null);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteSession(sessionId);
    // Refazer fetch para atualizar lista de sessões
    await refetchSessions();
    // Limpar seleção se a sessão deletada estiver selecionada
    onSessionSelect?.(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Hoje';
    if (diffDays === 2) return 'Ontem';
    if (diffDays <= 7) return `${diffDays} dias atrás`;
    
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      year: '2-digit'
    });
  };

  const isLoading = isLoadingConversations || isLoadingSessions;
  const hasAnyHistory = conversations.length > 0 || sessions.length > 0;

  return (
    <div 
      className={`
        ${isOpen ? 'w-72' : 'w-16'} 
        transition-all duration-300 ease-in-out
        flex flex-col h-screen bg-chat-sidebar border-r border-border
      `}
    >
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <>
              <span className="font-semibold text-lg text-foreground animate-fade-in ml-10">
                V.IA
              </span>
              <img 
                src={sunbeamLogo} 
                alt="VIA Logo" 
                className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
              />
            </>
          ) : (
            <img 
              src={sunbeamLogo} 
              alt="VIA Logo" 
              className="w-8 h-8 rounded-lg object-contain flex-shrink-0 mt-10"
            />
          )}
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button 
          onClick={handleNewConversation}
          variant="default" 
          className={`${
            isOpen ? 'w-full justify-start gap-2' : 'w-10 h-10 p-0 mx-auto'
          } bg-primary hover:bg-primary-hover text-primary-foreground shadow-glow transition-all duration-200`}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {isOpen && (
            <span className="animate-fade-in">Novo Chat</span>
          )}
        </Button>
      </div>

      {/* Chat History */}
      <div className="flex-1 px-4 overflow-y-auto custom-scrollbar">
        {isOpen ? (
          <>
            <div className="text-sm text-muted-foreground mb-4 animate-fade-in">
              Histórico de conversas
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : !hasAnyHistory ? (
              <div className="text-sm text-muted-foreground italic animate-fade-in">
                Nenhum histórico ainda
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {/* Sessões do n8n (mais recentes) */}
                {sessions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground font-medium">
                      Conversas Recentes (beta - testes)
                    </div>
                    {sessions.map((session) => (
                      <div
                        key={session.session_id}
                        onClick={() => handleSessionClick(session.session_id)}
                        className="group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors hover:bg-muted"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <h3 className="text-xs font-medium truncate">
                              {session.title}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground opacity-70">
                            {formatDate(session.updated_at)} • {session.message_count} mensagens
                          </p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => handleDeleteSession(session.session_id, e)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}

                {/* Conversas antigas (sistema antigo) */}
                {conversations.length > 0 && (
                  <div className="space-y-2">
                    {sessions.length > 0 && (
                      <div className="text-xs text-muted-foreground font-medium mt-4">
                        Conversas Antigas
                      </div>
                    )}
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => handleConversationClick(conversation)}
                        className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                          currentConversation?.id === conversation.id 
                            ? 'bg-primary/10 border border-primary/20' 
                            : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <h3 className="text-xs font-medium truncate">
                              {conversation.title}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground opacity-70">
                            {formatDate(conversation.updated_at)}
                          </p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => handleDeleteConversation(conversation.id, e)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex justify-center">
            <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
              <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        {isOpen ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="justify-start gap-2 text-muted-foreground hover:text-foreground text-xs p-2 h-auto"
              >
                <LogOut className="w-3 h-3" />
                Sair
              </Button>
              <ThemeToggle />
            </div>
            <div className="text-xs text-muted-foreground text-center animate-fade-in">
              VIA v1.0
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <ThemeToggle />
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-6 h-6 p-0 mx-auto flex items-center justify-center"
            >
              <LogOut className="w-3 h-3 text-muted-foreground" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;