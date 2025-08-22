import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tfemwpqacbgresenuksm.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmZW13cHFhY2JncmVzZW51a3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDkyMTIsImV4cCI6MjA2ODQyNTIxMn0.qJ-Yd4bbRdnw-plVVv2XVOq6ENA1xti2XzPvYPuM5Ng'; // Substitua pela sua chave

export const supabase = createClient(supabaseUrl, supabaseAnonKey);