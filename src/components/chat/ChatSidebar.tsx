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
                  className="h-9 w-9 md:h-8 md:w-8 p-0 hover:bg-transparent group"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="!h-6 !w-6 transition-colors duration-100 ease-in-out"
                    viewBox="0 0 1000 1000"
                  >
                    <path
                      fill="#0a3d73"
                      className="group-hover:fill-[#f98b32] transition-colors duration-200 ease-in-out"
                      d="M-.06 482.48c0 75.4 4.14 116.28 28.54 186.3 11.64 33.4 22.26 52.51 38.53 82.57 3.77 6.97 7.25 11.62 11.15 18.15 16.03 26.84 46.39 63.17 67.78 84.56 20.26 20.27 41.54 37.72 64.93 54.22 29.34 20.7 43.49 28.84 76.15 44.93 46.26 22.79 126.54 46.85 195.34 46.85h2.65c55.14-.01 81.53-.51 137.22-14.43 16.81-4.2 30.74-8.64 46.44-14.11 64.07-22.33 103.38-49.98 153.54-88.65 100.18-77.21 177.73-233.78 177.73-365.23 0-90.19-10.64-155.14-46.2-229.2-54.08-112.65-130.49-185.77-240.9-241.52C660.04 20.26 577.42.06 517.52.06c-75.28 0-116.36 4.16-186.3 28.54-13.94 4.86-30.25 11.3-42.88 17.67-25.78 12.99-53.18 27.48-76.64 44.45C114.14 161.3 44.58 258.8 14.76 376.2 7.09 406.4-.06 446.14-.06 482.48zm449.3-204.27c0-28 22.7-50.71 50.7-50.71s50.71 22.71 50.71 50.71v159.21c0 28-22.71 50.71-50.71 50.71s-50.7-22.71-50.7-50.71V278.21zM497 772.97c-136.93-1.69-247.1-113.21-247.1-250.16 0-72.76 31.74-141.97 86.81-189.46 22.94-19.82 58.64-10.94 70.16 17.1a45.17 45.17 0 0 1 3.29 16.91c0 13.07-5.7 25.5-15.6 34.02-35.2 30.56-55.44 74.94-55.44 121.56 0 88.9 72.09 160.99 160.99 160.99S661.1 611.84 661.1 522.94c0-46.76-20.35-91.26-55.72-121.82-9.76-8.45-15.38-20.74-15.38-33.65 0-5.84 1.16-11.63 3.38-17.02a44.71 44.71 0 0 1 41.33-27.68c10.68 0 21.01 3.83 29.11 10.78a250.3 250.3 0 0 1 86.53 189.24c0 138.16-112.04 250.2-250.2 250.2-1.04 0-2.14-.03-3.14-.03l-.01.01z"
                    />
                  </svg>
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
            variant="outline"
            className="w-full justify-start gap-2 px-3 h-9 bg-transparent border-2 border-[#0a3d73] text-black hover:bg-[#0a3d73] hover:text-white transition-all duration-200 shadow-sm hover:shadow-md rounded-full"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="animate-fade-in text-xs md:text-sm font-light">Novo Chat</span>
          </Button>
        </div>



        {/* Chat History */}
        <div className="flex-1 px-3 md:px-4 overflow-y-auto custom-scrollbar">
          <>
            <div className="text-xs md:text-sm text-gray-600 mb-4 animate-fade-in">
              Histórico de conversas
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : !hasAnyHistory ? (
              <div className="text-xs md:text-sm text-gray-400 italic animate-fade-in">
                Nenhum histórico ainda
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {sessions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[12px] md:text-xs text-gray-500 font-sans hover:text-black font-normal">
                      Conversas Recentes
                    </div>
                    {sessions.map((session, index) => (
                      <div
                        key={session.session_id}
                        onClick={() => handleSessionClick(session.session_id)}
                        className="group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 animate-slide-in-left"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-3 h-3 text-gray-500 flex-shrink-0" />
                            <h3 className="text-[13px] md:text-[13px] font-normal  truncate text-gray-500">
                              {session.title}
                            </h3>
                          </div>
                          <p className="text-[12px] md:text-xs text-gray-400 font-sans opacity-70 font-light">
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
                      <div className="text-[12px] md:text-xs text-gray-500 font-medium mt-4">
                        Conversas Antigas
                      </div>
                    )}
                    {conversations.map((conversation, index) => (
                      <div
                        key={conversation.id}
                        onClick={() =>
                          handleConversationClick(conversation)
                        }
                        className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 animate-slide-in-left ${
                          currentConversation?.id === conversation.id
                            ? "bg-gray-100 border border-gray-300"
                            : ""
                        }`}
                        style={{ animationDelay: `${(sessions.length + index) * 50}ms` }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-3 h-3 text-gray-500 flex-shrink-0" />
                            <h3 className="text-[12px] md:text-xs font-medium truncate text-gray-900">
                              {conversation.title}
                            </h3>
                          </div>
                          <p className="text-[12px] md:text-xs text-gray-500 opacity-70">
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
            <div className="text-xs text-gray-400">
              Experta v0.0.8 (beta)
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