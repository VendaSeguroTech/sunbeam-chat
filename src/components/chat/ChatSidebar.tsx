import React, { useState, useEffect } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  MoreHorizontal,
  ArrowLeft,
  LogOut,
  Shield,
  Settings,
  Pencil,
} from "lucide-react";
import expertaLogo from "@/assets/experta-logo.png";
import flechaEsqIcon from "@/assets/icones-hub-flechaesq.png";
import turnoffIcon from "@/assets/turnoff.png";
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

import UserSettingsForm from "@/components/user/UserSettingsForm";



interface ChatSidebarProps {
  onConversationSelect?: (conversation: ConversationHistory | null) => void;
  onSessionSelect?: (sessionId: string | null) => void;
  isOpen?: boolean;
  toggleSidebar?: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  onConversationSelect,
  onSessionSelect,
  isOpen,
  toggleSidebar,
}) => {
  const { toast } = useToast();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Dialog de Renomear
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  // Hook para detectar mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });

      // Redirecionar para a tela de login
      navigate("/login");
    } catch (error) {
      console.error("Erro no logout:", error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer logout. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleRedirectToHub = () => {
    window.location.href = "https://hub.vendaseguro.com.br/";
  };

  const handleNewConversation = () => {
    loadConversations();
    refetchSessions();
    startNewConversation();
    onConversationSelect?.(null);
    onSessionSelect?.(null);

    // Fechar sidebar no mobile
    if (isMobile && toggleSidebar) {
      toggleSidebar();
    }
  };

  const handleConversationClick = (conversation: ConversationHistory) => {
    setCurrentConversation(conversation);
    onConversationSelect?.(conversation);

    // Fechar sidebar no mobile
    if (isMobile && toggleSidebar) {
      toggleSidebar();
    }
  };

  const handleSessionClick = (sessionId: string) => {
    onSessionSelect?.(sessionId);

    // Fechar sidebar no mobile
    if (isMobile && toggleSidebar) {
      toggleSidebar();
    }
  };

  // Aceita evento opcional p/ funcionar com onSelect do Dropdown
  const handleDeleteConversation = async (
    conversationId: string,
    e?: Event
  ) => {
    e?.preventDefault?.();
    await deleteConversation(conversationId);
    if (currentConversation?.id === conversationId) {
      onConversationSelect?.(null);
    }
  };

  // Aceita evento opcional p/ funcionar com onSelect do Dropdown
  const handleDeleteSession = async (sessionId: string, e?: Event) => {
    e?.preventDefault?.();
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
          md:w-72 w-[80vw]
          transition-all duration-300 ease-in-out
          flex flex-col h-[100svh]
          bg-white md:bg-transparent
          md:rounded-none rounded-r-2xl
          shadow-xl md:shadow-none
        `}
        style={{ zIndex: 9999 }}
      >
        {/* Header */}
        <div className="px-3 md:px-4 h-[60px] md:h-[69px] flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <img
              src={expertaLogo}
              alt="Experta"
              className="h-8 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 md:h-8 md:w-8 p-0 hover:bg-transparent"
                >
                  <img
                    src={flechaEsqIcon}
                    alt="Voltar para Login"
                    className="h-7 w-7 object-contain"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Voltar para Login</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleRedirectToHub}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 md:h-8 md:w-8 p-0 hover:bg-transparent"
                >
                  <img
                    src={turnoffIcon}
                    alt="Ir para Hub"
                    className="h-7 w-7 object-contain"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ir para Hub VendaSeguro</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="px-3 py-3 md:p-4">
          <Button
            onClick={handleNewConversation}
            variant="default"
            className="w-full justify-start gap-2 px-3 h-9 bg-novo-chat hover:bg-novo-chat/90 text-primary-foreground shadow-glow transition-all duration-200 shadow-sm rounded-full"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="animate-fade-in text-sm font-light">Novo Chat</span>
          </Button>
        </div>



        {/* Chat History */}
        <div className="flex-1 px-3 md:px-4 overflow-y-auto custom-scrollbar">
          <>
            <div className="text-sm text-gray-600 mb-4 animate-fade-in">
              Histórico de conversas
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : !hasAnyHistory ? (
              <div className="text-sm text-gray-400 italic animate-fade-in">
                Nenhum histórico ainda
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {sessions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 font-normal">
                      Conversas Recentes
                    </div>
                    {sessions.map((session) => (
                      <div
                        key={session.session_id}
                        onClick={() => handleSessionClick(session.session_id)}
                        className="group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-3 h-3 text-gray-500 flex-shrink-0" />
                            <h3 className="text-xs font-medium truncate text-zinc-600">
                              {session.title}
                            </h3>
                          </div>
                          <p className="text-xs text-gray-500 opacity-70">
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
                          <DropdownMenuContent align="end" className="shadow-lg z-[10000]">
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
                      <div className="text-xs text-gray-500 font-medium mt-4">
                        Conversas Antigas
                      </div>
                    )}
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() =>
                          handleConversationClick(conversation)
                        }
                        className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 ${
                          currentConversation?.id === conversation.id
                            ? "bg-gray-100 border border-gray-300"
                            : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-3 h-3 text-gray-500 flex-shrink-0" />
                            <h3 className="text-xs font-medium truncate text-gray-900">
                              {conversation.title}
                            </h3>
                          </div>
                          <p className="text-xs text-gray-500 opacity-70">
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
                          <DropdownMenuContent align="end" className="shadow-lg z-[10000]">
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
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-3 py-3 md:p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Experta v1.0.7 (beta)
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setIsSettingsOpen(true)}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-transparent hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors rounded-full"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configurações</p>
                </TooltipContent>
              </Tooltip>
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => navigate("/admin")}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 bg-transparent hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors rounded-full"
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Painel Admin</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
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