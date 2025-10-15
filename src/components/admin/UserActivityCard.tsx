import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/supabase/client';
import UserChatHistoryDialog from './UserChatHistoryDialog';

interface UserActivity {
  id: string;
  email: string;
  name: string | null;
  last_seen: string | null;
  last_message_time: string | null;
  message_count: number;
}

const UserActivityCard: React.FC = () => {
  const [users, setUsers] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserActivity | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const fetchUserActivity = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Buscar todos os usuários da tabela profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, name, last_seen')
        .order('last_seen', { ascending: false, nullsLast: true });

      if (profilesError) throw profilesError;

      // 2. Para cada usuário, buscar a última mensagem e contagem
      const usersWithActivity: UserActivity[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Buscar última mensagem do usuário
          const { data: lastMessage } = await supabase
            .from('n8n_chat_histories')
            .select('created_at')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Contar total de mensagens
          const { count } = await supabase
            .from('n8n_chat_histories')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          return {
            id: profile.id,
            email: profile.email || 'Sem email',
            name: profile.name,
            last_seen: profile.last_seen,
            last_message_time: lastMessage?.created_at || null,
            message_count: count || 0,
          };
        })
      );

      setUsers(usersWithActivity);
    } catch (err) {
      console.error('Erro ao buscar atividade dos usuários:', err);
      setError('Não foi possível carregar os dados dos usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserActivity();
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchUserActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return 'Nunca';

    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 5) return `${diffMins} min atrás`;
    if (diffMins < 60) return `${diffMins} minutos atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;

    return date.toLocaleDateString('pt-BR');
  };

  const isOnline = (lastSeen: string | null): boolean => {
    if (!lastSeen) return false;
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMins = (now.getTime() - lastSeenDate.getTime()) / 60000;
    return diffMins < 5; // Considerado online se visto nos últimos 5 minutos
  };

  const handleUserClick = (user: UserActivity) => {
    setSelectedUser(user);
    setShowHistoryDialog(true);
  };

  // Cálculo da paginação
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const paginatedUsers = users.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      <Card className="mt-8">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-xl sm:text-2xl">Atividade dos Usuários</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUserActivity}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          {/* Info de paginação */}
          <div className="mb-4 text-sm text-muted-foreground">
            Mostrando {paginatedUsers.length} de {users.length} usuários
            {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
          </div>

          <div className="space-y-4">
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => handleUserClick(user)}
                        className="text-sm font-medium hover:underline cursor-pointer text-left hover:text-primary transition-colors"
                      >
                        {user.name || user.email}
                      </button>
                      {isOnline(user.last_seen) && (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-xs">
                          Online
                        </Badge>
                      )}
                    </div>

                  {user.name && (
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  )}

                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Visto: {formatRelativeTime(user.last_seen)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{user.message_count} mensagens</span>
                    </div>

                    {user.last_message_time && (
                      <div className="flex items-center gap-1">
                        <span>Última msg: {formatRelativeTime(user.last_message_time)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            !loading && <p className="text-muted-foreground">Nenhum usuário cadastrado.</p>
          )}

          {loading && users.length === 0 && (
            <p className="text-muted-foreground">Carregando...</p>
          )}
        </div>

        {/* Controles de paginação */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex-1 sm:flex-none"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex-1 sm:flex-none"
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground">
          <p>Atualizado automaticamente a cada 30 segundos</p>
        </div>
      </CardContent>
    </Card>

    {/* Dialog de histórico de conversas */}
    <UserChatHistoryDialog
      userId={selectedUser?.id || null}
      userName={selectedUser?.name || ''}
      userEmail={selectedUser?.email || ''}
      open={showHistoryDialog}
      onOpenChange={setShowHistoryDialog}
    />
    </>
  );
};

export default UserActivityCard;
