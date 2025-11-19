-- ====================================
-- CONSULTA: Estrutura da tabela profiles
-- ====================================

-- 1. Ver a definição completa da tabela profiles
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Ver constraints e chaves
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'profiles';

-- 3. Ver triggers da tabela profiles
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'profiles';

-- 4. Ver índices da tabela profiles
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- 5. Ver a definição exata da coluna 'id'
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'id';

-- ====================================
-- INSTRUÇÕES:
-- ====================================
-- 1. Abra o Supabase SQL Editor
-- 2. Cole cada query separadamente
-- 3. Execute uma por vez para ver os resultados
--
-- A query 1 mostra todas as colunas e seus defaults
-- A query 2 mostra as constraints (chaves primárias, estrangeiras)
-- A query 3 mostra triggers (funções automáticas)
-- A query 4 mostra índices
-- A query 5 mostra especificamente a coluna 'id'
