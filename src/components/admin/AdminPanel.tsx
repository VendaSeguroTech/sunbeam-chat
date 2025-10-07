import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client'; 
import { Button } from '@/components/ui/button'; 
import UserActivityCard from './UserActivityCard'; 
import { usePresenceContext } from '@/contexts/PresenceContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface User {
  id: string;
  email: string;
  role: 'admin' | 'default';
}

const AdminPanel: React.FC = () => { 
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const { onlineUsers } = usePresenceContext();
  const [message, setMessage] = useState<string | null>(null);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      setUsers(data);
    } catch (error: unknown) {
      handleError(error, 'listar usuários');
      setUsers([]);
    }
  };

  const handleError = (error: unknown, action: string) => {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    setMessage(`Erro ao ${action}: ${errorMessage}`);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    console.log('🔄 Tentando criar usuário:', newUserEmail);

    try {
      // Criar usuário no Supabase Auth com auto-confirmação
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            email_confirm: true // Tenta auto-confirmar
          }
        }
      });

      console.log('📧 Resposta do signUp:', { data, error });

      if (error) {
        // Se o erro for sobre email já existe, mostre mensagem mais clara
        if (error.message.includes('already registered')) {
          throw new Error('Este email já está cadastrado no sistema.');
        }
        throw error;
      }

      if (data.user) {
        console.log('✅ Usuário criado no Auth:', data.user.id);

        // Aguardar um pouco para garantir que o trigger do banco executou
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verificar se o perfil já foi criado por um trigger
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (!existingProfile) {
          console.log('📝 Criando perfil manualmente...');
          // Criar perfil na tabela profiles
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: data.user.id,
              email: data.user.email,
              role: 'default',
              name: newUserEmail.split('@')[0] // Nome padrão baseado no email
            }]);

          if (profileError) {
            console.error('❌ Erro ao criar perfil:', profileError);
            // Se o erro for de duplicata, não é crítico
            if (!profileError.message.includes('duplicate')) {
              throw profileError;
            }
          }
        } else {
          console.log('✅ Perfil já existe (criado por trigger)');
        }

        console.log('✅ Processo completo!');
      }

      // Mensagem de sucesso diferente se precisar confirmar email
      const needsConfirmation = data.user && !data.user.email_confirmed_at;
      const successMsg = needsConfirmation
        ? '✅ Usuário criado! ⚠️ Pode precisar confirmar o email antes de fazer login.'
        : '✅ Usuário criado com sucesso! O usuário já pode fazer login.';

      setMessage(successMsg);
      setNewUserEmail('');
      setNewUserPassword('');
      fetchTotalUserCount();
      fetchUsers(); // Atualizar lista de usuários
      setShowCreateUserForm(false);

    } catch (error: unknown) {
      console.error('❌ Erro completo:', error);
      handleError(error, 'criar usuário');
    }
  };

  const fetchTotalUserCount = async () => {
    try {
      const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      if (error) throw error;
      setTotalUsers(count ?? 0);
    } catch (error: unknown) {
      handleError(error, 'buscar contagem de usuários');
      setTotalUsers(0);
    }
  };

  const handleListUsers = async () => {
    setShowUserList(!showUserList);
    if (!showUserList) {
      await fetchUsers();
    }
  };

  const handleSetRole = async (userId: string, role: 'admin' | 'default') => {
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
      if (error) throw error;
      setMessage(`Função de usuário atualizada para ${role} com sucesso!`);
      await fetchUsers();
      setSelectedUser(null);
    } catch (error: unknown) {
      handleError(error, `atualizar função para ${role}`);
    }
  };

  const confirmDeleteUser = (user: User) => {
    setUserToDelete(user);
    setIsDeleteAlertOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      // Call the RPC function in the database
      const { error } = await supabase.rpc('delete_user', { user_id_to_delete: userToDelete.id });
      if (error) throw error;

      setMessage(`Usuário ${userToDelete.email} deletado com sucesso.`);
      await fetchUsers();
      fetchTotalUserCount();
    } catch (error: unknown) {
      handleError(error, `deletar usuário ${userToDelete.email}`);
    }
    setIsDeleteAlertOpen(false);
    setUserToDelete(null);
  };

  useEffect(() => {
    fetchTotalUserCount();
  }, []); 

  return (
    <>
      <div className="p-4"> 
        <h1 className="text-2xl font-bold mb-4">Painel Administrativo</h1>
        {message && (
          <div className={`p-2 mb-4 rounded ${message.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Estatísticas do usuário</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-100 p-4 rounded shadow"><h3 className="text-lg font-medium">Usuários Registrados</h3><p className="text-3xl font-bold">{totalUsers ?? '...'}</p></div>
            <div className="bg-gray-100 p-4 rounded shadow"><h3 className="text-lg font-medium">Usuários Online (Realtime)</h3><p className="text-3xl font-bold">{onlineUsers.length}</p></div>
          </div>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2">Gerenciamento de usuário</h2>
          <div className="flex gap-2 mb-4">
            <Button onClick={() => setShowCreateUserForm(!showCreateUserForm)}>{showCreateUserForm ? 'Fechar' : 'Criar Usuário'}</Button>
            <Button onClick={handleListUsers}>{showUserList ? 'Fechar Lista' : 'Listar Usuários'}</Button>
          </div>
          {showCreateUserForm && (
            <form onSubmit={handleCreateUser} className="bg-white dark:bg-gray-800 p-6 rounded shadow-md">
              <h3 className="text-lg font-semibold mb-4">Criar Novo Usuário</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="usuario@exemplo.com"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1">
                    Senha
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-1">A senha deve ter pelo menos 6 caracteres</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="flex-1">
                    Criar Usuário
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateUserForm(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </form>
          )}
          {showUserList && (
            <div className="bg-white p-6 rounded shadow-md mt-4">
              <h3 className="text-lg font-semibold mb-4">Usuários do Sistema</h3>
              {users.length === 0 ? <p>Nenhum usuário encontrado.</p> : (
                <ul className="space-y-2">
                  {users.map((user) => (
                    <Popover key={user.id} onOpenChange={(open) => !open && setSelectedUser(null)}>
                      <PopoverTrigger asChild>
                        <li className="p-2 border rounded flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => setSelectedUser(user)}>
                          <span>{user.email}</span>
                          <span className="text-sm text-gray-500">({user.role})</span>
                        </li>
                      </PopoverTrigger>
                      {selectedUser?.id === user.id && (
                        <PopoverContent className="w-48 p-2">
                          <div className="flex flex-col gap-1">
                            <Button variant="ghost" onClick={() => handleSetRole(user.id, 'admin')} disabled={user.role === 'admin'}>Tornar Admin</Button>
                            <Button variant="ghost" onClick={() => handleSetRole(user.id, 'default')} disabled={user.role === 'default'}>Remover Admin</Button>
                            <hr className="my-1" />
                            <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => confirmDeleteUser(user)}>Deletar</Button>
                          </div>
                        </PopoverContent>
                      )}
                    </Popover>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
        <UserActivityCard />
      </div>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a deletar o usuário {userToDelete?.email}. Esta ação não pode ser desfeita e removerá o perfil do usuário permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">Sim, deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminPanel;
