import { createClient } from '@supabase/supabase-js';

// SEGURANÇA: Credenciais do Supabase movidas para variáveis de ambiente (.env)
// Isso permite trocar facilmente entre ambientes (dev, prod) sem alterar código
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas. Verifique o arquivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);