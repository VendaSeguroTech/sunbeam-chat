import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.vendaseguro.tech'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU5MTE0ODAwLCJleHAiOjE5MTY4ODEyMDB9.qwETpJf9wXfGmh3E0SfLdg6xXnTK3cgWp_tkfnR5hKQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);