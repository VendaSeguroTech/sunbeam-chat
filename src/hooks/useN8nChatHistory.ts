import { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { N8nChatMessage, ChatSession, MessageContent } from '@/types/chat';

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

  const extractMessageContent = (message: string | MessageContent | null): { title: string; lastMessage: string } => {
    let title = 'Nova Conversa';
    let lastMessage = '';

    if (typeof message === 'string') {
      title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      lastMessage = message;
    } else if (message && typeof message === 'object') {
      console.log('🔍 Estrutura da mensagem:', message);
      
      const content = message.content || message.message || message.text;
      
      if (content && typeof content === 'string') {
        title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
        lastMessage = content;
      } else {
        console.log('⚠️ Formato de mensagem não reconhecido:', message);
        title = 'Mensagem sem conteúdo';
        lastMessage = 'Conteúdo não disponível';
      }
    } else if (message === null) {
      title = 'Mensagem vazia';
      lastMessage = '';
    }

    return { title, lastMessage };
  };

  const fetchUserSessions = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ Usuário não autenticado');
        setIsLoading(false);
        return;
      }

      console.log('🔍 Buscando sessões para usuário:', user.id);

      // 🔐 Buscar APENAS dados do usuário logado, ordenados por ID para manter ordem cronológica
      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: true }); // Ordem cronológica para processar corretamente

      console.log('👤 Dados do usuário atual:', data);

      if (error) {
        console.error('❌ Erro na query:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('📭 Nenhuma sessão encontrada para o usuário');
        setSessions([]);
        setIsLoading(false);
        return;
      }

      // 🎯 CORREÇÃO: Agrupar mensagens por session_id corretamente
      const sessionMap = new Map<string, SessionGroup>();
      
      // Primeiro, agrupar todas as mensagens por session_id
      data.forEach((record) => {
        const sessionId = record.session_id;
        const recordDate = record.created_at || new Date().toISOString();
        
        // Converter para o tipo específico
        const typedRecord: SupabaseRecord = {
          id: record.id,
          session_id: record.session_id,
          message: record.message as string | MessageContent | null,
          user_id: record.user_id,
          created_at: recordDate
        };
        
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            session_id: sessionId,
            messages: [typedRecord],
            created_at: recordDate,
            updated_at: recordDate
          });
        } else {
          const session = sessionMap.get(sessionId)!;
          session.messages.push(typedRecord);
          // Atualizar com a data mais recente
          if (new Date(recordDate) > new Date(session.updated_at)) {
            session.updated_at = recordDate;
          }
        }
      });

      // Agora processar cada sessão para criar o resumo
      const sessionsArray: ChatSession[] = [];
      
      sessionMap.forEach((sessionData: SessionGroup) => {
        const messages = sessionData.messages;
        console.log(`📝 Processando sessão ${sessionData.session_id} com ${messages.length} mensagens`);
        
        // Pegar a PRIMEIRA mensagem como título (geralmente a pergunta do usuário)
        const firstMessage = messages[0];
        const { title } = extractMessageContent(firstMessage.message);
        
        // Pegar a ÚLTIMA mensagem como preview
        const lastMessage = messages[messages.length - 1];
        const { lastMessage: lastMessageContent } = extractMessageContent(lastMessage.message);
        
        sessionsArray.push({
          session_id: sessionData.session_id,
          title,
          last_message: lastMessageContent,
          created_at: sessionData.created_at,
          updated_at: sessionData.updated_at,
          message_count: messages.length
        });
      });

      // Ordenar sessões por data de atualização (mais recente primeiro)
      sessionsArray.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      
      console.log('✅ Sessões processadas:', sessionsArray);
      setSessions(sessionsArray);
      
    } catch (error) {
      console.error('❌ Erro ao buscar sessões:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de conversas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSessionMessages = async (sessionId: string): Promise<N8nChatMessage[]> => {
    try {
      console.log('🔍 Buscando mensagens para sessão:', sessionId);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ Usuário não autenticado');
        return [];
      }
      
      // Buscar mensagens da sessão específica do usuário logado
      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('id', { ascending: true }); // Ordem cronológica

      if (error) {
        console.error('❌ Erro ao buscar mensagens:', error);
        throw error;
      }
      
      console.log('📨 Mensagens encontradas:', data);
      
      const formattedData: N8nChatMessage[] = (data || []).map(record => ({
        id: record.id,
        session_id: record.session_id,
        message: record.message as string | MessageContent | null,
        user_id: record.user_id,
        created_at: record.created_at || new Date().toISOString(),
        model: record.model // Incluir o modelo usado
      }));
      
      return formattedData;
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens da sessão:', error);
      return [];
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ Usuário não autenticado');
        return;
      }

      // Deletar TODAS as mensagens da sessão do usuário logado
      const { error } = await supabase
        .from('n8n_chat_histories')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;

      setSessions(prev => prev.filter(session => session.session_id !== sessionId));
      
      toast({
        title: "Sucesso",
        description: "Conversa deletada com sucesso.",
      });
    } catch (error) {
      console.error('❌ Erro ao deletar sessão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar a conversa.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    console.log('🚀 Iniciando busca de sessões...');
    fetchUserSessions();
  }, []);

  return {
    sessions,
    isLoading,
    fetchUserSessions,
    fetchSessionMessages,
    deleteSession,
    refetch: fetchUserSessions
  };
};