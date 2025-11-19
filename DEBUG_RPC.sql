-- ========================================
-- SCRIPT DE DIAGNÓSTICO - RPC OTIMIZADA
-- ========================================
-- Execute este script no Supabase SQL Editor para verificar o status da função RPC
-- ========================================

-- 1. VERIFICAR SE A FUNÇÃO FOI CRIADA
SELECT
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments,
  prosecdef as security_definer
FROM pg_proc
WHERE proname = 'get_user_sessions_optimized';

-- Se retornar 0 linhas: função não foi criada
-- Se retornar 1 linha: função existe ✅

-- ========================================

-- 2. VERIFICAR O SCHEMA DA FUNÇÃO
SELECT
  n.nspname as schema_name,
  p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_user_sessions_optimized';

-- A função deve estar no schema 'public'
-- Se estiver em outro schema (ex: 'auth'), precisa mover

-- ========================================

-- 3. VERIFICAR PERMISSÕES DA FUNÇÃO
SELECT
  p.proname,
  pg_catalog.pg_get_userbyid(p.proowner) as owner,
  p.proacl as permissions
FROM pg_proc p
WHERE p.proname = 'get_user_sessions_optimized';

-- ========================================

-- 4. TESTAR A FUNÇÃO MANUALMENTE
-- Substitua 'SEU_USER_ID_AQUI' pelo seu user_id real
-- Exemplo: '71ce6d03-070a-43dc-946c-f27192f9a2ee'

SELECT * FROM get_user_sessions_optimized('71ce6d03-070a-43dc-946c-f27192f9a2ee'::uuid);

-- Se retornar erro: há problema na função
-- Se retornar dados: função funciona ✅

-- ========================================

-- 5. VERIFICAR SE OS ÍNDICES FORAM CRIADOS
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname IN (
  'idx_n8n_chat_user_session',
  'idx_n8n_chat_created_at',
  'idx_chat_sessions_user_session'
)
ORDER BY indexname;

-- Deve retornar 3 linhas (3 índices)

-- ========================================

-- 6. SE A FUNÇÃO NÃO ESTIVER NO SCHEMA PUBLIC, RECRIAR:
-- Descomente as linhas abaixo e execute:

-- DROP FUNCTION IF EXISTS get_user_sessions_optimized;
--
-- CREATE OR REPLACE FUNCTION public.get_user_sessions_optimized(p_user_id UUID)
-- RETURNS TABLE (
--   session_id TEXT,
--   title TEXT,
--   first_message_content TEXT,
--   last_message_content TEXT,
--   message_count BIGINT,
--   created_at TIMESTAMPTZ,
--   updated_at TIMESTAMPTZ
-- )
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- BEGIN
--   RETURN QUERY
--   WITH session_messages AS (
--     SELECT
--       n.session_id,
--       n.message,
--       n.created_at,
--       ROW_NUMBER() OVER (PARTITION BY n.session_id ORDER BY n.id ASC) as rn_first,
--       ROW_NUMBER() OVER (PARTITION BY n.session_id ORDER BY n.id DESC) as rn_last
--     FROM n8n_chat_histories n
--     WHERE n.user_id = p_user_id
--   ),
--   session_stats AS (
--     SELECT
--       sm.session_id,
--       MAX(CASE WHEN sm.rn_first = 1 THEN sm.message END) as first_msg,
--       MAX(CASE WHEN sm.rn_last = 1 THEN sm.message END) as last_msg,
--       COUNT(*) as msg_count,
--       MIN(sm.created_at) as first_created,
--       MAX(sm.created_at) as last_updated
--     FROM session_messages sm
--     GROUP BY sm.session_id
--   )
--   SELECT
--     ss.session_id,
--     COALESCE(cs.title,
--       CASE
--         WHEN ss.first_msg::text IS NOT NULL THEN
--           LEFT(ss.first_msg::text, 50) || CASE WHEN LENGTH(ss.first_msg::text) > 50 THEN '...' ELSE '' END
--         ELSE 'Nova Conversa'
--       END
--     ) as title,
--     ss.first_msg::text as first_message_content,
--     ss.last_msg::text as last_message_content,
--     ss.msg_count as message_count,
--     ss.first_created as created_at,
--     ss.last_updated as updated_at
--   FROM session_stats ss
--   LEFT JOIN chat_sessions cs ON cs.session_id = ss.session_id AND cs.user_id = p_user_id
--   ORDER BY ss.last_updated DESC;
-- END;
-- $$;
--
-- -- Garantir permissões corretas
-- GRANT EXECUTE ON FUNCTION public.get_user_sessions_optimized TO anon;
-- GRANT EXECUTE ON FUNCTION public.get_user_sessions_optimized TO authenticated;

-- ========================================
-- PROBLEMAS COMUNS E SOLUÇÕES:
-- ========================================
--
-- 1. ERRO 404 - Função não encontrada
--    Causa: Função não está no schema 'public' ou não tem permissões
--    Solução: Execute a seção 6 acima (descomente e rode)
--
-- 2. ERRO 42883 - Function does not exist
--    Causa: Função não foi criada ou está em schema diferente
--    Solução: Rode novamente o script OPTIMIZATION_PHASE2.sql
--
-- 3. ERRO 42501 - Permission denied
--    Causa: Role 'anon' ou 'authenticated' não tem permissão EXECUTE
--    Solução: Execute os GRANTs na seção 6
--
-- 4. Função criada mas ainda dá 404
--    Causa: Supabase pode estar cacheando a API
--    Solução: Aguarde 30-60 segundos ou reinicie o projeto Supabase
--
-- ========================================
