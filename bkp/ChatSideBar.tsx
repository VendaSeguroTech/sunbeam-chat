import React, { useState, useEffect } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  MoreHorizontal,
  LogOut,
  Shield,
  Settings,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  useConversationHistory,
  ConversationHistory,
} from "@/hooks/useConversationHistory";
import { useN8nChatHistory } from "@/hooks/useN8nChatHistory";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import sunbeamLogo from "@/assets/logo2.png";
import UserSettingsForm from "@/components/user/UserSettingsForm";

import { PanelLeft } from "lucide-react";

interface ChatSidebarProps {
  isOpen: boolean;
  onConversationSelect?: (conversation: ConversationHistory | null) => void;
  onSessionSelect?: (sessionId: string | null) => void;
  toggleSidebar: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onConversationSelect,
  onSessionSelect,
  toggleSidebar,
}) => {
  const { toast } = useToast();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHoveringLogo, setIsHoveringLogo] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // Dialog de Renomear
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isRotating) {
      const timer = setTimeout(() => setIsRotating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isRotating]);

  const {
    conversations,
    currentConversation,
    isLoading: isLoadingConversations,
    deleteConversation,
    startNewConversation,
    setCurrentConversation,
    loadConversations,
  } = useConversationHistory();

  const {
    sessions,
    isLoading: isLoadingSessions,
    deleteSession,
    renameSession: renameSessionHook,
    refetch: refetchSessions,
  } = useN8nChatHistory();

  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  const handleToggleSidebar = () => {
    toggleSidebar();
    setIsRotating(true);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      console.error("Erro no logout:", error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer logout. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleNewConversation = () => {
    loadConversations();
    refetchSessions();
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

  // Aceita evento opcional p/ funcionar com onSelect do Dropdown
  const handleDeleteConversation = async (
    conversationId: string,
    e?: React.SyntheticEvent
  ) => {
    e?.stopPropagation?.();
    await deleteConversation(conversationId);
    if (currentConversation?.id === conversationId) {
      onConversationSelect?.(null);
    }
  };

  // Aceita evento opcional p/ funcionar com onSelect do Dropdown
  const handleDeleteSession = async (sessionId: string, e?: React.SyntheticEvent) => {
    e?.stopPropagation?.();
    await deleteSession(sessionId);
  };

  const handleRenameClick = (sessionId: string, currentTitle: string) => {
    setRenameSessionId(sessionId);
    setNewTitle(currentTitle);
    // abre o modal de forma controlada
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!newTitle.trim() || !renameSessionId) return;

    try {
      setIsSaving(true);
      await renameSessionHook(renameSessionId, newTitle.trim());
      // fecha DEPOIS do await para UX consistente
      setRenameDialogOpen(false);
      setRenameSessionId("");
      setNewTitle("");
    } catch (error) {
      console.error("Erro ao renomear:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setRenameDialogOpen(open);
    if (!open) {
      // Limpar estado ao fechar para evitar problemas de estado
      setRenameSessionId("");
      setNewTitle("");
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const diffTime = startOfToday.getTime() - startOfDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays <= 7) return `${diffDays} dias atrás`;

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  const isLoading = isLoadingConversations || isLoadingSessions;
  const hasAnyHistory = conversations.length > 0 || sessions.length > 0;

  // ====== ATÉ AQUI (antes do return) ======


  return (
    <TooltipProvider>
      <div
        id="app-sidebar"
        className={`
          ${isOpen ? "md:w-72 w-[80vw]" : "md:w-16 w-[64px]"}
          transition-all duration-300 ease-in-out
          flex flex-col h-[100svh] bg-chat-sidebar border-r border-border shadow-md
          md:rounded-none rounded-r-2xl
        `}
      >
        {/* Header */}
        <div className="border-b border-border px-3 md:px-4 h-[60px] md:h-[69px] flex items-center">
          <div
            className={`flex items-center ${
              isOpen ? "justify-between w-full" : "justify-center"
            }`}
          >
            {isOpen ? (
              <>
                <div className="flex items-center gap-2">
                  <img
                    src={sunbeamLogo}
                    alt="Experta"
                    className={`w-8 h-8 rounded-lg object-contain flex-shrink-0 ${
                      isRotating ? "logo-rotate" : ""
                    }`}
                  />
                  <span className="font-display font-semibold text-lg text-foreground animate-fade-in">
                    Experta
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {isOpen && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleToggleSidebar}
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 md:h-8 md:w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <PanelLeft className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Minimizar</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {isAdmin && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => navigate("/admin")}
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 md:h-8 md:w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Painel Admin</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setIsSettingsOpen(true)}
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 md:h-8 md:w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Configurações</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </>
            ) : (
              <div
                className="relative flex items-center justify-center w-full h-full mt-0 md:mt-0 sm:mt-6"
                onMouseEnter={() => setIsHoveringLogo(true)}
                onMouseLeave={() => setIsHoveringLogo(false)}
              >
                {!isHoveringLogo ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <img
                        src={sunbeamLogo}
                        alt="Experta"
                        className={`w-8 h-8 rounded-lg object-contain flex-shrink-0 ${
                          isRotating ? "logo-rotate" : ""
                        }`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-display">Experta</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    onClick={handleToggleSidebar}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 md:h-8 md:w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* New Chat Button */}
        <div className="px-3 py-3 md:p-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleNewConversation}
                variant="default"
                className={`${
                  isOpen ? "w-full justify-start gap-2" : "w-10 h-10 p-0 mx-auto"
                } bg-primary hover:bg-primary-hover text-primary-foreground shadow-glow transition-all duration-200 shadow-sm`}
              >
                <Plus className="w-4 h-4 flex-shrink-0" />
                {isOpen && <span className="animate-fade-in">Novo Chat</span>}
              </Button>
            </TooltipTrigger>
            {!isOpen && (
              <TooltipContent>
                <p>Novo Chat</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Chat History */}
        <div className="flex-1 px-3 md:px-4 overflow-y-auto custom-scrollbar">
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
                              {formatDate(session.updated_at)} •{" "}
                              {session.message_count} mensagens
                            </p>
                          </div>

                          <DropdownMenu modal={false}>
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
                            <DropdownMenuContent align="end" className="shadow-lg">
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault(); // impede o dropdown de fechar antes
                                  handleRenameClick(session.session_id, session.title);
                                }}
                              >
                                <Pencil className="w-3 h-3 mr-2" />
                                Renomear
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => handleDeleteSession(session.session_id, e)}
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
                          onClick={() =>
                            handleConversationClick(conversation)
                          }
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

                          <DropdownMenu modal={false}>
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
                            <DropdownMenuContent align="end" className="shadow-lg">
                              <DropdownMenuItem
                                onSelect={(e) =>
                                  handleDeleteConversation(conversation.id, e)
                                }
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
            <div className="flex justify-center py-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Histórico</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-3 py-3 md:p-4">
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
                Experta v1.0.7 (beta)
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex flex-col items-center">
              <ThemeToggle />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="w-6 h-6 p-0 mx-auto flex items-center justify-center"
                  >
                    <LogOut className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sair</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações da Conta</DialogTitle>
            <DialogDescription>
              Gerencie suas informações de perfil.
            </DialogDescription>
          </DialogHeader>
          <UserSettingsForm onSave={() => setIsSettingsOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Rename Conversation Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent
            onOpenAutoFocus={(e) => e.preventDefault()} // (opcional) evita autofocus disputando com o dropdown
          >
          <DialogHeader>
            <DialogTitle>Renomear Conversa</DialogTitle>
            <DialogDescription>
              Digite um novo título para esta conversa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Novo título da conversa"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRenameSubmit();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRenameDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleRenameSubmit}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default ChatSidebar;