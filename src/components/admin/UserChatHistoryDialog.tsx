import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/supabase/client';
import { RefreshCw, MessageSquare, Calendar, User, Bot } from 'lucide-react';

interface UserChatHistoryDialogProps {
  userId: string | null;
  userName: string;
  userEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMessage {
  id: string;
  session_id: string;
  message: string | { content?: string; type?: string };
  created_at: string;
  user_id: string;
}

interface GroupedSession {
  session_id: string;
  messages: ChatMessage[];
  first_message_time: string;
  message_count: number;
}

const UserChatHistoryDialog: React.FC<UserChatHistoryDialogProps> = ({
  userId,
  userName,
  userEmail,
  open,
  onOpenChange,
}) => {
  const [sessions, setSessions] = useState<GroupedSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserChatHistory = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Admin buscando histórico para user_id:', userId);

      // Buscar todas as mensagens do usuário (admin pode ver todos os usuários)
      const { data: messages, error: messagesError } = await supabase
        .from('n8n_chat_histories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      console.log('📨 Mensagens encontradas:', messages);
      console.log('❌ Erro (se houver):', messagesError);

      if (messagesError) {
        console.error('Erro ao buscar mensagens:', messagesError);
        throw messagesError;
      }

      if (!messages || messages.length === 0) {
        console.log('📭 Nenhuma mensagem encontrada para este usuário');
        setSessions([]);
        setLoading(false);
        return;
      }

      // Agrupar mensagens por session_id
      const groupedBySession: { [key: string]: ChatMessage[] } = {};

      messages.forEach((msg) => {
        if (!groupedBySession[msg.session_id]) {
          groupedBySession[msg.session_id] = [];
        }
        groupedBySession[msg.session_id].push(msg);
      });

      // Converter para array e ordenar por data da primeira mensagem (mais recente primeiro)
      const sessionsArray: GroupedSession[] = Object.entries(groupedBySession)
        .map(([session_id, msgs]) => ({
          session_id,
          messages: msgs,
          first_message_time: msgs[0]?.created_at || '',
          message_count: msgs.length,
        }))
        .sort((a, b) =>
          new Date(b.first_message_time).getTime() - new Date(a.first_message_time).getTime()
        );

      console.log('✅ Sessões agrupadas:', sessionsArray);
      setSessions(sessionsArray);
    } catch (err) {
      console.error('❌ Erro ao buscar histórico do usuário:', err);
      setError('Não foi possível carregar o histórico de conversas. Verifique as permissões RLS no Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && userId) {
      fetchUserChatHistory();
    }
  }, [open, userId]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMessageContent = (message: string | { content?: string; type?: string }): string => {
    if (typeof message === 'string') {
      return message;
    }
    return message.content || JSON.stringify(message);
  };

  const isUserMessage = (index: number): boolean => {
    // Consideramos que mensagens ímpares são do usuário e pares são da IA
    return index % 2 === 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Histórico de Conversas
          </DialogTitle>
          <DialogDescription>
            Conversas de <strong>{userName || userEmail}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            {sessions.length} sessões encontradas
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUserChatHistory}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {error && (
          <div className="text-red-500 text-sm mb-4 p-3 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        <ScrollArea className="h-[60vh] pr-4">
          {loading && sessions.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Carregando histórico...
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-3 opacity-50" />
              <p>Nenhuma conversa encontrada</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sessions.map((session) => (
                <Card key={session.session_id} className="border-2 overflow-hidden">
                  <CardContent className="pt-4 overflow-hidden">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {formatDate(session.first_message_time)}
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {session.message_count} mensagens
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {session.session_id.slice(0, 20)}...
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {session.messages.map((msg, index) => {
                        const isUser = isUserMessage(index);
                        const messageContent = getMessageContent(msg.message);

                        return (
                          <div
                            key={msg.id}
                            className={`flex gap-2 ${isUser ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`flex gap-2 max-w-[80%] ${
                                isUser ? 'flex-row' : 'flex-row-reverse'
                              }`}
                            >
                              <div
                                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                  isUser
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-purple-100 text-purple-600'
                                }`}
                              >
                                {isUser ? (
                                  <User className="h-4 w-4" />
                                ) : (
                                  <Bot className="h-4 w-4" />
                                )}
                              </div>
                              <div
                                className={`rounded-lg px-4 py-2 overflow-hidden ${
                                  isUser
                                    ? 'bg-blue-50 text-blue-900'
                                    : 'bg-purple-50 text-purple-900'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">
                                  {messageContent}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default UserChatHistoryDialog;
