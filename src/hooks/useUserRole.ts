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
          console.log('Supabase User:', user); // DEBUG LOG
          setUserEmail(user.email || '');
          
          // Fetch user role from the 'profiles' table
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
            setUserRole('default'); // Default to non-admin on error
          } else if (profileData && profileData.role) {
            const roleFromProfile = profileData.role;
            console.log('User role from profiles table:', roleFromProfile); // DEBUG LOG
            if (roleFromProfile === 'admin') {
              setUserRole('admin');
            } else {
              setUserRole('default');
            }
          } else {
            console.log('No role found in profiles table for user:', user.id); // DEBUG LOG
            setUserRole('default'); // Default to non-admin if no role found
          }
          console.log('Final userRole:', userRole); // DEBUG LOG
          console.log('Final isAdmin:', userRole === 'admin'); // DEBUG LOG
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