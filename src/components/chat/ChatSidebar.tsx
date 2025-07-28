import React from "react";
import { Plus, MessageSquare, Trash2, MoreHorizontal, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConversationHistory, ConversationHistory } from "@/hooks/useConversationHistory";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import sunbeamLogo from "@/assets/logo2.png";

interface ChatSidebarProps {
  isOpen: boolean;
  onConversationSelect?: (conversation: ConversationHistory | null) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onConversationSelect }) => {
  const { toast } = useToast();
  const {
    conversations,
    currentConversation,
    isLoading,
    deleteConversation,
    startNewConversation,
    setCurrentConversation
  } = useConversationHistory();

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
  };

  const handleConversationClick = (conversation: ConversationHistory) => {
    setCurrentConversation(conversation);
    onConversationSelect?.(conversation);
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConversation(conversationId);
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
      <div className="flex-1 px-4 overflow-y-auto">
        {isOpen ? (
          <>
            <div className="text-sm text-muted-foreground mb-4 animate-fade-in">
              Histórico de conversas
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-sm text-muted-foreground italic animate-fade-in">
                {/* Nenhum histórico ainda */}
                (em breve)
              </div>
            ) : (
              <div className="space-y-2 animate-fade-in">
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
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground text-xs"
            >
              <LogOut className="w-3 h-3" />
              Sair
            </Button>
            <div className="text-xs text-muted-foreground text-center animate-fade-in">
              VIA v1.0
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-6 h-6 p-0 mx-auto flex items-center justify-center"
            >
              <LogOut className="w-3 h-3 text-muted-foreground" />
            </Button>
            <div className="flex justify-center">
              <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;