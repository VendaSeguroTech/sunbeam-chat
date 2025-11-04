import { useState, useEffect } from "react";
import { supabase } from "@/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { N8nChatMessage, ChatSession, MessageContent } from "@/types/chat";

// Interface para dados brutos do Supabase
interface SupabaseRecord {
  id: number;
  session_id: string;
  message: string | MessageContent | null;
  user_id: string;
  created_at: string;
}

// Interface para agrupamento de sessões
interface SessionGroup {
  session_id: string;
  messages: SupabaseRecord[];
  created_at: string;
  updated_at: string;
}

export const useN8nChatHistory = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const extractMessageContent = (
    message: string | MessageContent | null
  ): { title: string; lastMessage: string } => {
    let title = "Nova Conversa";
    let lastMessage = "";

    if (typeof message === "string") {
      title = message.substring(0, 50) + (message.length > 50 ? "..." : "");
      lastMessage = message;
    } else if (message && typeof message === "object") {
      const content = message.content || message.message || message.text;

      if (content && typeof content === "string") {
        title =
          content.substring(0, 50) + (content.length > 50 ? "..." : "");
        lastMessage = content;
      } else {
        title = "Mensagem sem conteúdo";
        lastMessage = "Conteúdo não disponível";
      }
    } else if (message === null) {
      title = "Mensagem vazia";
      lastMessage = "";
    }

    return { title, lastMessage };
  };

  const fetchUserSessions = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("n8n_chat_histories")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: true });

      if (error) throw error;

      const { data: titlesData, error: titlesError } = await supabase
        .from("chat_sessions")
        .select("session_id, title")
        .eq("user_id", user.id);

      if (titlesError) throw titlesError;

      const customTitles = new Map<string, string>();
      if (titlesData) {
        for (const item of titlesData) {
          if (item.title) {
            customTitles.set(item.session_id, item.title);
          }
        }
      }

      if (!data || data.length === 0) {
        setSessions([]);
        setIsLoading(false);
        return;
      }

      const sessionMap = new Map<string, SessionGroup>();

      data.forEach((record) => {
        const sessionId = record.session_id;
        const recordDate = record.created_at || new Date().toISOString();

        const typedRecord: SupabaseRecord = {
          id: record.id,
          session_id: record.session_id,
          message: record.message as string | MessageContent | null,
          user_id: record.user_id,
          created_at: recordDate,
        };

        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            session_id: sessionId,
            messages: [typedRecord],
            created_at: recordDate,
            updated_at: recordDate,
          });
        } else {
          const session = sessionMap.get(sessionId)!;
          session.messages.push(typedRecord);
          if (new Date(recordDate) > new Date(session.updated_at)) {
            session.updated_at = recordDate;
          }
        }
      });

      const sessionsArray: ChatSession[] = [];

      sessionMap.forEach((sessionData: SessionGroup) => {
        const messages = sessionData.messages;
        const firstMessage = messages[0];
        const { title: generatedTitle } = extractMessageContent(firstMessage.message);
        const customTitle = customTitles.get(sessionData.session_id);

        const lastMessage = messages[messages.length - 1];
        const { lastMessage: lastMessageContent } = extractMessageContent(
          lastMessage.message
        );

        sessionsArray.push({
          session_id: sessionData.session_id,
          title: customTitle || generatedTitle,
          last_message: lastMessageContent,
          created_at: sessionData.created_at,
          updated_at: sessionData.updated_at,
          message_count: messages.length,
        });
      });

      sessionsArray.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setSessions(sessionsArray);
    } catch (error) {
      console.error("❌ Erro ao buscar sessões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de conversas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSessionMessages = async (
    sessionId: string
  ): Promise<N8nChatMessage[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("n8n_chat_histories")
        .select("*")
        .eq("session_id", sessionId)
        .eq("user_id", user.id)
        .order("id", { ascending: true });

      if (error) throw error;

      const formattedData: N8nChatMessage[] = (data || []).map((record) => ({
        id: record.id,
        session_id: record.session_id,
        message: record.message as string | MessageContent | null,
        user_id: record.user_id,
        created_at: record.created_at || new Date().toISOString(),
        model: record.model,
        file_url: record.file_url || null,
        file_name: record.file_name || null,
        file_type: record.file_type || null,
      }));

      return formattedData;
    } catch (error) {
      console.error("❌ Erro ao buscar mensagens da sessão:", error);
      return [];
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("n8n_chat_histories")
        .delete()
        .eq("session_id", sessionId)
        .eq("user_id", user.id);

      if (error) throw error;

      setSessions((prev) =>
        prev.filter((session) => session.session_id !== sessionId)
      );

      toast({
        title: "Sucesso",
        description: "Conversa deletada com sucesso.",
      });
    } catch (error) {
      console.error("❌ Erro ao deletar sessão:", error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar a conversa.",
        variant: "destructive",
      });
    }
  };

  const renameSession = async (sessionId: string, newTitle: string): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Adicionar timeout para evitar congelamento
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout na requisição")), 10000)
      );

      const renamePromise = supabase.rpc("update_chat_session_title", {
        _session_id: sessionId,
        _new_title: newTitle,
      });

      // Usar Promise.race para implementar timeout
      const { error } = await Promise.race([renamePromise, timeoutPromise]) as any;

      if (error) throw error;

      // Atualiza o estado local imediatamente
      setSessions((prev) =>
        prev.map((session) =>
          session.session_id === sessionId
            ? { ...session, title: newTitle }
            : session
        )
      );

      toast({
        title: "Sucesso",
        description: "Conversa renomeada com sucesso.",
      });
    } catch (error) {
      console.error("❌ Erro ao renomear sessão:", error);

      // Se for timeout, tentar atualização direta na tabela
      if (error instanceof Error && error.message.includes("Timeout")) {
        try {
          // Tentar atualização direta como fallback
          const { error: fallbackError } = await supabase
            .from("chat_sessions")
            .update({ title: newTitle })
            .eq("session_id", sessionId)
            .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

          if (!fallbackError) {
            // Atualiza o estado local mesmo no fallback
            setSessions((prev) =>
              prev.map((session) =>
                session.session_id === sessionId
                  ? { ...session, title: newTitle }
                  : session
              )
            );

            toast({
              title: "Sucesso",
              description: "Conversa renomeada com sucesso (método alternativo).",
            });
            return;
          }
        } catch (fallbackTryError) {
          console.error("❌ Erro no método fallback:", fallbackTryError);
        }
      }

      toast({
        title: "Erro",
        description: "Não foi possível renomear a conversa.",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchUserSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    sessions,
    isLoading,
    fetchUserSessions,
    fetchSessionMessages,
    deleteSession,
    renameSession, // Exportar a nova função
    refetch: fetchUserSessions,
  };
};