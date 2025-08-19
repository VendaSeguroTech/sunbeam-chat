import { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';

export const useUserRole = () => {
  const [userRole, setUserRole] = useState<'admin' | 'default' | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserEmail(user.email || '');
          
          // Verificar se é admin pelo email
          if (user.email === 'tech@vendaseguro.com.br') {
            setUserRole('admin');
          } else {
            setUserRole('default');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar role do usuário:', error);
        setUserRole('default');
      } finally {
        setLoading(false);
      }
    };

    getUserRole();
  }, []);

  return { userRole, userEmail, loading, isAdmin: userRole === 'admin' };
};