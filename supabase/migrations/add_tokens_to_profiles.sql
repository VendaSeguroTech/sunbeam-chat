-- Adicionar coluna de tokens na tabela profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS tokens INTEGER DEFAULT 5;

-- Atualizar usuários existentes para terem 5 tokens (caso a coluna já exista sem valor)
UPDATE profiles
SET tokens = 5
WHERE tokens IS NULL;

-- Adicionar comentário na coluna
COMMENT ON COLUMN profiles.tokens IS 'Número de tokens disponíveis para o usuário. Admins têm tokens ilimitados (verificado na aplicação).';

-- Criar índice para melhor performance em consultas
CREATE INDEX IF NOT EXISTS idx_profiles_tokens ON profiles(tokens);
