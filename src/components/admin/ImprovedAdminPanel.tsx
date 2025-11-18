import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePresenceContext } from '@/contexts/PresenceContext';
import {
  MoreVertical,
  UserPlus,
  Shield,
  ShieldOff,
  Trash2,
  RefreshCw,
  Users,
  UserCheck,
  Coins,
  Plus,
  Minus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import ManageUserModelsDialog from './ManageUserModelsDialog';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'default';
  last_seen: string | null;
  tokens: number;
  unlimited_tokens: boolean;
  allowed_model_ids: string[]; // IDs dos modelos permitidos
  total_api_tokens?: number;
  avg_tokens_per_message?: number;
  message_count?: number;
}

const ImprovedAdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'default'>('all');
  const [tokenFilter, setTokenFilter] = useState<'all' | 'low' | 'zero' | 'hasTokens'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Create User Dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Manage Models Dialog
  const [showManageModelsDialog, setShowManageModelsDialog] = useState(false);
  const [selectedUserForModels, setSelectedUserForModels] = useState<User | null>(null);

  // Delete User Dialog
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Token Management Dialog
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [userToEditTokens, setUserToEditTokens] = useState<User | null>(null);
  const [tokenAmount, setTokenAmount] = useState<number>(0);

  const { onlineUsers } = usePresenceContext();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Buscar dados dos usuários
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar estatísticas de tokens da API para cada usuário
      const usersWithStats = await Promise.all(
        (profilesData || []).map(async (user) => {
          // Query para buscar estatísticas de tokens da tabela n8n_chat_histories
          const { data: tokenStats, error: tokenError } = await supabase
            .from('n8n_chat_histories')
            .select('tokens_api')
            .eq('user_id', user.id)
            .not('tokens_api', 'is', null);

          if (tokenError) {
            console.error(`Erro ao buscar tokens do usuário ${user.id}:`, tokenError);
          }

          // Calcular estatísticas
          const totalApiTokens = tokenStats?.reduce((sum, record) => sum + (record.tokens_api || 0), 0) || 0;
          const messageCount = tokenStats?.length || 0;
          const avgTokensPerMessage = messageCount > 0 ? Math.round(totalApiTokens / messageCount) : 0;

          return {
            ...user,
            total_api_tokens: totalApiTokens,
            avg_tokens_per_message: avgTokensPerMessage,
            message_count: messageCount
          };
        })
      );

      setUsers(usersWithStats);
      setTotalUsers(usersWithStats.length);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Não foi possível carregar os usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtrar e paginar usuários
  const getFilteredUsers = () => {
    let filtered = [...users];

    // Filtro de busca (nome ou email)
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Filtro de tokens
    if (tokenFilter === 'zero') {
      filtered = filtered.filter(user => user.role !== 'admin' && user.tokens === 0);
    } else if (tokenFilter === 'low') {
      filtered = filtered.filter(user => user.role !== 'admin' && user.tokens > 0 && user.tokens <= 5);
    } else if (tokenFilter === 'hasTokens') {
      filtered = filtered.filter(user => user.role !== 'admin' && user.tokens > 0);
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, tokenFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      if (error) throw error;

      if (data.user) {
        // Aguardar para verificar se trigger criou o perfil
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (!existingProfile) {
          await supabase.from('profiles').insert([{
            id: data.user.id,
            email: data.user.email,
            role: 'default',
            name: newUserEmail.split('@')[0]
          }]);
        }
      }

      toast.success('Usuário criado com sucesso!');
      setNewUserEmail('');
      setNewUserPassword('');
      setShowCreateDialog(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    }
  };

  const handleToggleRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'default' : 'admin';

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`Role alterada para ${newRole === 'admin' ? 'Admin' : 'Usuário Padrão'}`);
      fetchUsers();
    } catch (error) {
      console.error('Erro ao alterar role:', error);
      toast.error('Erro ao alterar permissão do usuário');
    }
  };

  const handleToggleUnlimitedTokens = async (user: User) => {
    const newValue = !user.unlimited_tokens;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ unlimited_tokens: newValue })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`Tokens ilimitados ${newValue ? 'ativados' : 'desativados'} para ${user.email}`);
      fetchUsers();
    } catch (error) {
      console.error('Erro ao alterar tokens ilimitados:', error);
      toast.error('Erro ao alterar a configuração de tokens ilimitados.');
    }
  };

  const handleManageModels = (user: User) => {
    setSelectedUserForModels(user);
    setShowManageModelsDialog(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const { error } = await supabase.rpc('delete_user', {
        user_id_to_delete: userToDelete.id
      });

      if (error) throw error;

      toast.success(`Usuário ${userToDelete.email} deletado com sucesso`);
      fetchUsers();
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      toast.error('Erro ao deletar usuário');
    } finally {
      setShowDeleteDialog(false);
      setUserToDelete(null);
    }
  };

  const handleAddTokens = async () => {
    if (!userToEditTokens || tokenAmount <= 0) return;

    try {
      const newTokenCount = (userToEditTokens.tokens || 0) + tokenAmount;

      const { error } = await supabase
        .from('profiles')
        .update({ tokens: newTokenCount })
        .eq('id', userToEditTokens.id);

      if (error) throw error;

      toast.success(`${tokenAmount} tokens adicionados a ${userToEditTokens.email}`);

      // Fechar dialog e limpar estados ANTES de recarregar
      setShowTokenDialog(false);
      setUserToEditTokens(null);
      setTokenAmount(0);

      // Recarregar dados após fechar
      await fetchUsers();
    } catch (error) {
      console.error('Erro ao adicionar tokens:', error);
      toast.error('Erro ao adicionar tokens');
    }
  };

  const handleRemoveTokens = async () => {
    if (!userToEditTokens || tokenAmount <= 0) return;

    try {
      const currentTokens = userToEditTokens.tokens || 0;
      const newTokenCount = Math.max(0, currentTokens - tokenAmount);

      const { error } = await supabase
        .from('profiles')
        .update({ tokens: newTokenCount })
        .eq('id', userToEditTokens.id);

      if (error) throw error;

      toast.success(`${tokenAmount} tokens removidos de ${userToEditTokens.email}`);

      // Fechar dialog e limpar estados ANTES de recarregar
      setShowTokenDialog(false);
      setUserToEditTokens(null);
      setTokenAmount(0);

      // Recarregar dados após fechar
      await fetchUsers();
    } catch (error) {
      console.error('Erro ao remover tokens:', error);
      toast.error('Erro ao remover tokens');
    }
  };

  const formatLastSeen = (lastSeen: string | null): string => {
    if (!lastSeen) return 'Nunca';

    const now = new Date();
    const date = new Date(lastSeen);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 5) return `${diffMins} min`;
    if (diffMins < 60) return `${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.some(u => u.user_id === userId);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registrados no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Online</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineUsers.length}</div>
            <p className="text-xs text-muted-foreground">Ativos agora</p>
          </CardContent>
        </Card>
      </div>

      {/* User Management Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-xl sm:text-2xl">Gerenciamento de Usuários</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchUsers}
                  disabled={loading}
                  className="w-full sm:w-auto bg-novo-chat text-white hover:bg-novo-chat/90 hover:text-primary-foreground"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowCreateDialog(true)}
                  className="w-full sm:w-auto bg-novo-chat hover:bg-novo-chat/90 text-primary-foreground"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Role Filter */}
              <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="default">Usuário</SelectItem>
                </SelectContent>
              </Select>

              {/* Token Filter */}
              <Select value={tokenFilter} onValueChange={(value: any) => setTokenFilter(value)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Coins className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por tokens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tokens</SelectItem>
                  <SelectItem value="hasTokens">Com tokens</SelectItem>
                  <SelectItem value="low">Poucos tokens (≤5)</SelectItem>
                  <SelectItem value="zero">Sem tokens</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results info */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Mostrando {paginatedUsers.length} de {filteredUsers.length} usuários
                {filteredUsers.length !== totalUsers && ` (${totalUsers} no total)`}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Wrapper com scroll horizontal para mobile */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Usuário</TableHead>
                      <TableHead className="min-w-[100px]">Role</TableHead>
                      <TableHead className="min-w-[80px]">Tokens</TableHead>
                      <TableHead className="min-w-[100px]">Mensagens</TableHead>
                      <TableHead className="min-w-[120px]">Tokens API Usados</TableHead>
                      <TableHead className="min-w-[110px]">Média Tokens/Msg</TableHead>
                      <TableHead className="min-w-[90px]">Status</TableHead>
                      <TableHead className="min-w-[100px]">Último Acesso</TableHead>
                      <TableHead className="text-right min-w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name || user.email}</span>
                      {user.name && (
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        'Usuário'
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-novo-chat" />
                      <span className="font-medium">
                        {(user.role === 'admin' || user.unlimited_tokens) ? '∞' : (user.tokens || 0)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-gray-700">
                      {user.message_count || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-blue-600">
                        {user.total_api_tokens?.toLocaleString() || 0}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-purple-600">
                      {user.avg_tokens_per_message || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    {isUserOnline(user.id) ? (
                      <Badge variant="default" className="bg-green-500">
                        Online
                      </Badge>
                    ) : (
                      <Badge variant="outline">Offline</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatLastSeen(user.last_seen)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleRole(user)}>
                          {user.role === 'admin' ? (
                            <>
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Remover Admin
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-2" />
                              Tornar Admin
                            </>
                          )}
                        </DropdownMenuItem>
                        {user.role !== 'admin' && (
                          <>
                            <DropdownMenuItem onClick={() => handleToggleUnlimitedTokens(user)}>
                              <Coins className="h-4 w-4 mr-2" />
                              <span>{user.unlimited_tokens ? 'Desativar Tokens Ilimitados' : 'Ativar Tokens Ilimitados'}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setUserToEditTokens(user);
                                setTokenAmount(0);
                                setShowTokenDialog(true);
                              }}
                            >
                              <Coins className="h-4 w-4 mr-2" />
                              Gerenciar Tokens
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleManageModels(user)}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Gerenciar Modelos
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setUserToDelete(user);
                            setShowDeleteDialog(true);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deletar Usuário
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedUsers.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {searchTerm || roleFilter !== 'all' || tokenFilter !== 'all'
                      ? 'Nenhum usuário encontrado com os filtros aplicados'
                      : 'Nenhum usuário encontrado'}
                  </TableCell>
                </TableRow>
              )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Pagination */}
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
                  className="flex-1 sm:flex-none hover:bg-novo-chat hover:text-primary-foreground"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex-1 sm:flex-none hover:bg-novo-chat hover:text-primary-foreground"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar um novo usuário no sistema.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Criar Usuário</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Token Management Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Tokens</DialogTitle>
            <DialogDescription>
              Gerenciar tokens para <strong>{userToEditTokens?.email}</strong>
              <br />
              Tokens atuais: <strong>{userToEditTokens?.tokens || 0}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tokenAmount">Quantidade de Tokens</Label>
              <Input
                id="tokenAmount"
                type="number"
                min="1"
                placeholder="Digite a quantidade"
                value={tokenAmount || ''}
                onChange={(e) => setTokenAmount(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowTokenDialog(false);
                setUserToEditTokens(null);
                setTokenAmount(0);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemoveTokens}
              disabled={tokenAmount <= 0}
            >
              <Minus className="h-4 w-4 mr-2" />
              Remover
            </Button>
            <Button
              type="button"
              onClick={handleAddTokens}
              disabled={tokenAmount <= 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage User Models Dialog */}
      {selectedUserForModels && (
        <ManageUserModelsDialog
          open={showManageModelsDialog}
          onOpenChange={setShowManageModelsDialog}
          userId={selectedUserForModels.id}
          userEmail={selectedUserForModels.email}
          userName={selectedUserForModels.name}
          currentAllowedModelIds={selectedUserForModels.allowed_model_ids || []}
          onSuccess={fetchUsers}
        />
      )}

      {/* Delete User Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a deletar o usuário <strong>{userToDelete?.email}</strong>.
              Esta ação não pode ser desfeita e removerá permanentemente todos os dados do usuário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ImprovedAdminPanel;
