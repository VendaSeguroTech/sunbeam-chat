import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/supabase/client';
import { User, UserStats } from '@/types/user';
import { Users, UserCheck, Activity, UserPlus, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  const createDefaultUser = async () => {
    setCreatingUser(true);
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: 'cliente@teste.com',
        password: 'teste123',
        email_confirm: true
      });

      if (error) throw error;

      toast.success('Usuário padrão criado com sucesso!');
      fetchUserStats();
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      toast.error('Erro ao criar usuário padrão');
    } finally {
      setCreatingUser(false);
    }
  };

  const promoteToAdmin = async (userId: string, userEmail: string) => {
    try {
      // Aqui você salvaria no metadata do usuário que ele é admin
      // Por enquanto vamos simular atualizando localmente
      toast.success(`Usuário ${userEmail} promovido para admin!`);
      fetchUserStats();
    } catch (error) {
      console.error('Erro ao promover usuário:', error);
      toast.error('Erro ao promover usuário');
    }
  };

  const fetchUserStats = async () => {
    setLoading(true);
    try {
      // Buscar todos os usuários
      const { data: users, error } = await supabase.auth.admin.listUsers();
      
      if (error) throw error;

      const usersList: User[] = users.users.map(user => ({
        id: user.id,
        email: user.email || '',
        role: (user.email === 'tech@vendaseguro.com.br' ? 'admin' : 'default') as 'admin' | 'default',
        created_at: user.created_at,
        is_online: false // Por simplicidade, não vamos trackear status online ainda
      }));

      setStats({
        total_users: usersList.length,
        online_users: 0, // Implementar tracking real depois
        users_list: usersList
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUserStats();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Painel Administrativo
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 overflow-y-auto">
          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Usuários</p>
                  <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <UserCheck className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Usuários Online</p>
                  <p className="text-2xl font-bold">{stats?.online_users || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <Button 
                onClick={createDefaultUser} 
                disabled={creatingUser}
                className="w-full h-full flex flex-col items-center gap-2"
                variant="outline"
              >
                <UserPlus className="w-6 h-6" />
                <span className="text-sm">
                  {creatingUser ? 'Criando...' : 'Criar Usuário Teste'}
                </span>
              </Button>
            </div>
          </div>

          {/* Lista de usuários */}
          <div className="border rounded-lg">
            <div className="p-4 border-b bg-muted/30">
              <h3 className="font-semibold">Lista de Usuários</h3>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Carregando usuários...</p>
                </div>
              ) : (
                <div className="divide-y">
                  {stats?.users_list.map((user) => (
                    <div key={user.id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Criado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? 'Admin' : 'Default'}
                        </Badge>
                        {user.role === 'default' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => promoteToAdmin(user.id, user.email)}
                            className="h-6 px-2 text-xs"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Promover
                          </Button>
                        )}
                        <div className={`w-2 h-2 rounded-full ${user.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </div>
                    </div>
                  ))}
                  
                  {stats?.users_list.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      Nenhum usuário encontrado
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={fetchUserStats} disabled={loading}>
            Atualizar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminPanel;