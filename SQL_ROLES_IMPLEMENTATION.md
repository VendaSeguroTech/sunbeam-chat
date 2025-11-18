# SQL para Implementação de Separação de Roles por Modelo

## 📅 Data: 18 de Novembro de 2025

---

## 🗄️ Queries SQL para Executar no Supabase

### 1. Adicionar coluna `allowed_model_ids` na tabela `profiles`

```sql
-- Adicionar coluna para armazenar IDs dos modelos permitidos por usuário
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS allowed_model_ids TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Criar índice para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_profiles_allowed_model_ids
ON profiles USING GIN (allowed_model_ids);

-- Comentário na coluna para documentação
COMMENT ON COLUMN profiles.allowed_model_ids IS
'Array de UUIDs dos modelos privados que o usuário tem permissão para acessar. Modelos públicos (is_public=true) são acessíveis a todos independente desta coluna.';
```

### 2. Marcar modelo "basic" como público

```sql
-- Marcar modelo Basic como público (todos os usuários terão acesso)
UPDATE models
SET is_public = true
WHERE name = 'basic';

-- Garantir que outros modelos sejam privados por padrão
UPDATE models
SET is_public = false
WHERE name != 'basic' AND is_public IS NULL;
```

### 3. (Opcional) Migração de dados existentes

```sql
-- Se quiser dar acesso ao modelo "pro" para todos os usuários existentes (exemplo)
UPDATE profiles
SET allowed_model_ids = ARRAY(
  SELECT id::TEXT FROM models WHERE name = 'pro'
)
WHERE role != 'admin';

-- Ou limpar todos os acessos (começar do zero)
UPDATE profiles
SET allowed_model_ids = ARRAY[]::TEXT[]
WHERE role != 'admin';
```

---

## 🔍 Queries de Verificação

### Ver estrutura da tabela profiles
```sql
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name = 'allowed_model_ids';
```

### Ver todos os modelos e seu status público/privado
```sql
SELECT
  id,
  name,
  display_name,
  is_public,
  created_at
FROM models
ORDER BY is_public DESC, name;
```

### Ver usuários e seus modelos permitidos
```sql
SELECT
  p.email,
  p.name,
  p.role,
  p.allowed_model_ids,
  array_length(p.allowed_model_ids, 1) as qtd_modelos_privados
FROM profiles p
ORDER BY p.email;
```

### Ver quais usuários têm acesso a cada modelo
```sql
SELECT
  m.display_name as modelo,
  m.is_public as publico,
  COUNT(CASE WHEN p.role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN m.id::TEXT = ANY(p.allowed_model_ids) THEN 1 END) as usuarios_com_acesso
FROM models m
LEFT JOIN profiles p ON m.id::TEXT = ANY(p.allowed_model_ids) OR p.role = 'admin'
GROUP BY m.id, m.display_name, m.is_public
ORDER BY m.display_name;
```

---

## 📊 Queries para Gestão em Massa (N8N)

### Adicionar modelo a um usuário (não duplica)
```sql
UPDATE profiles
SET allowed_model_ids = (
  CASE
    WHEN :model_id = ANY(allowed_model_ids)
    THEN allowed_model_ids
    ELSE array_append(allowed_model_ids, :model_id)
  END
)
WHERE email = :user_email
RETURNING email, allowed_model_ids;
```

### Remover modelo de um usuário
```sql
UPDATE profiles
SET allowed_model_ids = array_remove(allowed_model_ids, :model_id)
WHERE email = :user_email
RETURNING email, allowed_model_ids;
```

### Adicionar modelo a múltiplos usuários
```sql
UPDATE profiles
SET allowed_model_ids = (
  CASE
    WHEN :model_id = ANY(allowed_model_ids)
    THEN allowed_model_ids
    ELSE array_append(allowed_model_ids, :model_id)
  END
)
WHERE email = ANY(:emails_array)
RETURNING email, allowed_model_ids;
```

### Substituir todos os modelos de um usuário
```sql
UPDATE profiles
SET allowed_model_ids = :new_model_ids_array
WHERE email = :user_email
RETURNING email, allowed_model_ids;
```

---

## 🔒 Função para Verificar Acesso (Opcional - para usar no Postgres)

```sql
-- Criar função para verificar se usuário tem acesso a um modelo
CREATE OR REPLACE FUNCTION user_has_model_access(
  user_id UUID,
  model_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  model_public BOOLEAN;
  has_access BOOLEAN;
BEGIN
  -- Buscar role do usuário
  SELECT role INTO user_role FROM profiles WHERE id = user_id;

  -- Admin tem acesso a tudo
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Buscar se modelo é público
  SELECT is_public INTO model_public FROM models WHERE id = model_id;

  -- Modelo público = todos têm acesso
  IF model_public THEN
    RETURN TRUE;
  END IF;

  -- Verificar se modelo está na lista de permitidos
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = user_id
      AND model_id::TEXT = ANY(allowed_model_ids)
  ) INTO has_access;

  RETURN has_access;
END;
$$ LANGUAGE plpgsql;

-- Exemplo de uso:
-- SELECT user_has_model_access('user-uuid', 'model-uuid');
```

---

## 🧪 Queries de Teste

### Testar atribuição de modelo
```sql
-- 1. Buscar ID do modelo "pro"
SELECT id, name, display_name FROM models WHERE name = 'pro';

-- 2. Buscar usuário de teste
SELECT id, email, allowed_model_ids FROM profiles WHERE email = 'teste@email.com';

-- 3. Adicionar acesso ao modelo "pro"
UPDATE profiles
SET allowed_model_ids = array_append(allowed_model_ids, 'ID-DO-MODELO-PRO')
WHERE email = 'teste@email.com'
RETURNING email, allowed_model_ids;

-- 4. Verificar
SELECT
  email,
  allowed_model_ids,
  CASE
    WHEN 'ID-DO-MODELO-PRO' = ANY(allowed_model_ids)
    THEN 'TEM ACESSO'
    ELSE 'SEM ACESSO'
  END as status
FROM profiles
WHERE email = 'teste@email.com';
```

---

## ⚠️ Importante

1. **Backup antes de executar**: Sempre faça backup antes de alterações em produção
2. **Testar em dev primeiro**: Execute em ambiente de desenvolvimento primeiro
3. **Validar queries**: Rode as queries de verificação após cada alteração
4. **IDs corretos**: Use UUIDs reais da sua tabela `models`

---

## 📝 Ordem de Execução Recomendada

```sql
-- 1. ADICIONAR COLUNA
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS allowed_model_ids TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 2. CRIAR ÍNDICE
CREATE INDEX IF NOT EXISTS idx_profiles_allowed_model_ids
ON profiles USING GIN (allowed_model_ids);

-- 3. MARCAR BASIC COMO PÚBLICO
UPDATE models SET is_public = true WHERE name = 'basic';

-- 4. GARANTIR OUTROS SEJAM PRIVADOS
UPDATE models SET is_public = false WHERE name != 'basic' AND is_public IS NULL;

-- 5. VERIFICAR
SELECT name, display_name, is_public FROM models ORDER BY name;
SELECT email, allowed_model_ids FROM profiles LIMIT 5;
```

---

**Executar essas queries no Supabase SQL Editor antes de continuar com o código!**
