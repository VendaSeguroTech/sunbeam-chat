import { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ConversationHistory {
  id: string;
  user_id: string;
  title: string;
  messages: Array<{
    id: string;
    content: string;
    type: 'user' | 'assistant';
    timestamp: Date;
  }>;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
}

export const useConversationHistory = () => {
  const [conversations, setConversations] = useState<ConversationHistory[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ConversationHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Carregar histórico do usuário
  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('conversation_history')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const formattedConversations = data.map(conv => ({
        ...conv,
        messages: typeof conv.messages === 'string' 
          ? JSON.parse(conv.messages) 
          : conv.messages
      }));

      setConversations(formattedConversations);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de conversas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Salvar nova conversa
  const saveConversation = async (messages: Message[], title?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || messages.length === 0) return;

      // Gerar título automático se não fornecido
      const conversationTitle = title || generateTitle(messages[0]?.content || 'Nova conversa');

      const { data, error } = await supabase
        .from('conversation_history')
        .insert({
          user_id: user.id,
          title: conversationTitle,
          messages: JSON.stringify(messages)
        })
        .select()
        .single();

      if (error) throw error;

      const newConversation = {
        ...data,
        messages: typeof data.messages === 'string' 
          ? JSON.parse(data.messages) 
          : data.messages
      };

      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);

      return newConversation;
    } catch (error) {
      console.error('Erro ao salvar conversa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a conversa.",
        variant: "destructive",
      });
    }
  };

  // Atualizar conversa existente
  const updateConversation = async (conversationId: string, messages: Message[]) => {
    try {
      const { error } = await supabase
        .from('conversation_history')
        .update({
          messages: JSON.stringify(messages),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) throw error;

      // Atualizar estado local
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, messages, updated_at: new Date().toISOString() }
            : conv
        )
      );

      if (currentConversation?.id === conversationId) {
        setCurrentConversation(prev => prev ? { ...prev, messages } : null);
      }
    } catch (error) {
      console.error('Erro ao atualizar conversa:', error);
    }
  };

  // Deletar conversa
  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversation_history')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
      }

      toast({
        title: "Sucesso",
        description: "Conversa deletada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao deletar conversa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar a conversa.",
        variant: "destructive",
      });
    }
  };

  // Gerar título automático baseado na primeira mensagem
  const generateTitle = (firstMessage: string): string => {
    const words = firstMessage.trim().split(' ').slice(0, 6);
    return words.join(' ') + (firstMessage.split(' ').length > 6 ? '...' : '');
  };

  // Iniciar nova conversa
  const startNewConversation = () => {
    setCurrentConversation(null);
  };

  useEffect(() => {
    loadConversations();
  }, []);

  return {
    conversations,
    currentConversation,
    isLoading,
    loadConversations,
    saveConversation,
    updateConversation,
    deleteConversation,
    startNewConversation,
    setCurrentConversation
  };
};