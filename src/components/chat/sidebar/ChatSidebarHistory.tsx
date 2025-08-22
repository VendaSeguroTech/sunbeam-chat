import React from "react";
import { MessageSquare, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConversationHistory } from "@/hooks/useConversationHistory";

interface ChatSidebarHistoryProps {
  isOpen: boolean;
  isLoading: boolean;
  hasAnyHistory: boolean;
  sessions: any[]; // TODO: Define a proper type for sessions
  conversations: ConversationHistory[];
  currentConversation: ConversationHistory | null;
  handleSessionClick: (sessionId: string) => void;
  handleDeleteSession: (sessionId: string, e: React.MouseEvent) => Promise<void>;
  handleConversationClick: (conversation: ConversationHistory) => void;
  handleDeleteConversation: (conversationId: string, e: React.MouseEvent) => Promise<void>;
  formatDate: (dateString: string) => string;
}

const ChatSidebarHistory: React.FC<ChatSidebarHistoryProps> = ({
  isOpen,
  isLoading,
  hasAnyHistory,
  sessions,
  conversations,
  currentConversation,
  handleSessionClick,
  handleDeleteSession,
  handleConversationClick,
  handleDeleteConversation,
  formatDate,
}) => {
  return (
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
                  <div className="text-xs text-muted-foreground font-opensans font-medium">
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
                          ? "bg-primary/10 border border-primary/20"
                          : ""
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
  );
};

export default ChatSidebarHistory;
