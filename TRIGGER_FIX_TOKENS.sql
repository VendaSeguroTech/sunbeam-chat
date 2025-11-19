-- ====================================
-- FIX: Trigger handle_new_user com 20 tokens iniciais
-- ====================================

-- Atualizar a função do trigger para usar 20 tokens
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    tokens,
    initial_tokens,
    unlimited_tokens,
    terms_accepted,
    last_token_reset
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'default',
    20,  -- tokens iniciais = 20
    20,  -- initial_tokens = 20
    false,  -- unlimited_tokens
    false,  -- terms_accepted
    now()  -- last_token_reset
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================
-- OPCIONAL: Atualizar default da coluna tokens para 20
-- ====================================

ALTER TABLE profiles
ALTER COLUMN tokens SET DEFAULT 20;

ALTER TABLE profiles
ALTER COLUMN initial_tokens SET DEFAULT 20;

-- ====================================
-- VERIFICAÇÃO
-- ====================================

-- Ver defaults atuais
SELECT
  column_name,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('tokens', 'initial_tokens');

-- ====================================
-- INSTRUÇÕES:
-- ====================================
-- 1. Execute este SQL no Supabase SQL Editor
-- 2. Teste criando um novo usuário
-- 3. Verifique se ele recebeu 20 tokens
