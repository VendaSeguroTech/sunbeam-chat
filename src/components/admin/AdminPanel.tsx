import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client'; 
import { Button } from '@/components/ui/button'; 
import OnlineUsersCard from './OnlineUsersCard'; 
import { usePresenceContext } from '@/contexts/PresenceContext'; // Import the context hook
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Import Popover components

interface User {
  id: string;
  email: string;
  role: 'admin' | 'default'; // Assuming these are the only two roles
}

const AdminPanel: React.FC = () => { 
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const { onlineUsers } = usePresenceContext(); // Use the context for online count
  const [message, setMessage] = useState<string | null>(null);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [users, setUsers] = useState<User[]>([]); // New state for users list
  const [showUserList, setShowUserList] = useState(false); // New state for showing user list
  const [selectedUser, setSelectedUser] = useState<User | null>(null); // State to hold the user selected for role manipulation 

  // Function to create a new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
      });

      if (error) throw error;

      // After successful signup, insert into profiles table with default role
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              role: 'default', // Assign default role
            },
          ]);

        if (profileError) throw profileError;
      }

      setMessage('Usuário criado com sucesso! Verifique o e-mail para confirmação.');
      setNewUserEmail('');
      setNewUserPassword('');
      fetchTotalUserCount(); // Refresh counts
      setShowCreateUserForm(false); // Hide form after successful creation
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage(`Erro ao criar usuário: ${error.message}`);
      } else {
        setMessage('Erro desconhecido ao criar usuário');
      }
    }

  };

  // Function to fetch only the total user count
  const fetchTotalUserCount = async () => {
    try {
      // TOTAL cadastrados
      const { count: totalCount, error: totalError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;
      setTotalUsers(totalCount ?? 0);

    } catch (error: unknown) {
       if (error instanceof Error) {
        console.error('[Admin] Error fetching total user count:', error.message);
      } else {
        console.error('[Admin] Error fetching total user count (unknown)');
      }
      setTotalUsers(0);
    }
  };


  // Function to fetch all users
  const handleListUsers = async () => {
    setShowUserList(!showUserList); // Toggle visibility
    if (!showUserList) { // Only fetch if we are about to show the list
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*'); // Select all columns from the profiles table

        if (error) throw error;
        setUsers(data);
        setMessage(null); // Clear any previous messages
      } catch (error: unknown) {
        if (error instanceof Error) {
          setMessage(`Erro ao listar usuários: ${error.message}`);
        } else {
          setMessage('Erro desconhecido ao listar usuários');
        }
        setUsers([]); // Clear users on error
      }
    }
  };

  const handleSetAdminRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userId);

      if (error) throw error;
      setMessage('Função de administrador adicionada com sucesso!');
      // Refresh the user list to reflect the change
      const { data, error: fetchError } = await supabase.from('profiles').select('*');
      if (fetchError) throw fetchError;
      setUsers(data);
      setSelectedUser(null); // Close popover
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage(`Erro ao adicionar função de administrador: ${error.message}`);
      } else {
        setMessage('Erro desconhecido ao adicionar função de administrador');
      }
    }
  };

  const handleRemoveAdminRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'default' }) // Assuming 'default' is the non-admin role
        .eq('id', userId);

      if (error) throw error;
      setMessage('Função de administrador removida com sucesso!');
      // Refresh the user list to reflect the change
      const { data, error: fetchError } = await supabase.from('profiles').select('*');
      if (fetchError) throw fetchError;
      setUsers(data);
      setSelectedUser(null); // Close popover
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage(`Erro ao remover função de administrador: ${error.message}`);
      } else {
        setMessage('Erro desconhecido ao remover função de administrador');
      }
    }
  };

  useEffect(() => {
    fetchTotalUserCount();
    // No interval needed for online users anymore, it's realtime!
  }, []); 

  return (
    <div className="p-4"> 
      <h1 className="text-2xl font-bold mb-4">Painel Administrativo</h1>

      {message && (
        <div className={`p-2 mb-4 rounded ${message.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Estatísticas do usuário</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-100 p-4 rounded shadow">
            <h3 className="text-lg font-medium">Usuários Registrados</h3>
            <p className="text-3xl font-bold">{totalUsers !== null ? totalUsers : 'Loading...'}</p>
          </div>
          <div className="bg-gray-100 p-4 rounded shadow">
            <h3 className="text-lg font-medium">Usuários Online (Realtime)</h3>
            <p className="text-3xl font-bold">{onlineUsers.length}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Gerenciamento de usuário</h2>
        <div className="flex gap-2 mb-4"> {/* Flex container for buttons */}
          <Button onClick={() => setShowCreateUserForm(!showCreateUserForm)}>
            {showCreateUserForm ? 'Fechar criação de usuário' : 'Criar um novo usuário'}
          </Button>
          <Button onClick={handleListUsers}>
            {showUserList ? 'Fechar lista de usuários' : 'Listar todos os usuários'}
          </Button>
        </div>

        {showCreateUserForm && (
          <form onSubmit={handleCreateUser} className="bg-white p-6 rounded shadow-md">
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
                Email:
              </label>
              <input
                type="email"
                id="email"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-6">
              <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
                Senha:
              </label>
              <input
                type="password"
                id="password"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Criar um usuário
              </button>
            </div>
          </form>
        )}

        {showUserList && (
          <div className="bg-white p-6 rounded shadow-md mt-4">
            <h3 className="text-lg font-semibold mb-4">Usuários do Sistema</h3>
            {users.length === 0 ? (
              <p>Nenhum usuário encontrado.</p>
            ) : (
              <ul className="space-y-2">
                {users.map((user) => (
                  <Popover key={user.id} onOpenChange={(open) => !open && setSelectedUser(null)}>
                    <PopoverTrigger asChild>
                      <li
                        className="p-2 border rounded flex justify-between items-center cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedUser(user)}
                      >
                        <span>{user.email}</span>
                        <span className="text-sm text-gray-500">({user.role})</span>
                      </li>
                    </PopoverTrigger>
                    {selectedUser && selectedUser.id === user.id && (
                      <PopoverContent className="w-48 p-2">
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => handleSetAdminRole(user.id)}
                            disabled={user.role === 'admin'}
                          >
                            Tornar Admin
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => handleRemoveAdminRole(user.id)}
                            disabled={user.role !== 'admin'}
                          >
                            Remover Admin
                          </Button>
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

      <OnlineUsersCard />

    </div>
  );
};

export default AdminPanel;