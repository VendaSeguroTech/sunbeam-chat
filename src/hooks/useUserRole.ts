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
            console.error('❌ Error fetching profile:', profileError);
            setUserRole('default'); // Default to non-admin on error
          } else if (profileData && profileData.role) {
            const roleFromProfile = profileData.role;
            console.log('✅ User role from profiles table:', roleFromProfile);

            if (roleFromProfile === 'admin') {
              console.log('🔑 User is ADMIN');
              setUserRole('admin');
            } else {
              console.log('👤 User is DEFAULT');
              setUserRole('default');
            }
          } else {
            console.warn('⚠️ No role found in profiles table for user:', user.id);
            setUserRole('default'); // Default to non-admin if no role found
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