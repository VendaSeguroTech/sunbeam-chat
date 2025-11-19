import { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';

export const useUserRole = () => {
  // OTIMIZAÇÃO: Inicializar com cache do localStorage
  const [userRole, setUserRole] = useState<'admin' | 'default' | null>(() => {
    try {
      const cached = localStorage.getItem('experta_userRole');
      return cached as 'admin' | 'default' | null;
    } catch {
      return null;
    }
  });
  const [userEmail, setUserEmail] = useState<string>(() => {
    try {
      return localStorage.getItem('experta_userEmail') || '';
    } catch {
      return '';
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('experta_userRole');
      return !cached; // Se tem cache, não está loading
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          console.log('Supabase User:', user); // DEBUG LOG
          const email = user.email || '';
          setUserEmail(email);

          // OTIMIZAÇÃO: Cachear email
          try {
            localStorage.setItem('experta_userEmail', email);
          } catch (e) {
            console.warn('Erro ao cachear userEmail:', e);
          }

          // Fetch user role from the 'profiles' table
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          let role: 'admin' | 'default' = 'default';

          if (profileError) {
            console.error('❌ Error fetching profile:', profileError);
            role = 'default';
          } else if (profileData && profileData.role) {
            const roleFromProfile = profileData.role;
            console.log('✅ User role from profiles table:', roleFromProfile);

            if (roleFromProfile === 'admin') {
              console.log('🔑 User is ADMIN');
              role = 'admin';
            } else {
              console.log('👤 User is DEFAULT');
              role = 'default';
            }
          } else {
            console.warn('⚠️ No role found in profiles table for user:', user.id);
            role = 'default';
          }

          setUserRole(role);

          // OTIMIZAÇÃO: Cachear role
          try {
            localStorage.setItem('experta_userRole', role);
          } catch (e) {
            console.warn('Erro ao cachear userRole:', e);
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