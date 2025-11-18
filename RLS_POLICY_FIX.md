# Fix: RLS Policy para Modelos Privados

## 🐛 Problema Encontrado

Usuários não conseguiam ver modelos privados que foram atribuídos a eles via `allowed_model_ids`, mesmo com o ID correto no banco.

**Causa Raiz:**
A política RLS da tabela `models` só permitia ver modelos com `is_public = true`:

```sql
"Anyone can view public models"
qual: "(is_public = true)"
```

Não havia política para permitir usuários verem modelos privados atribuídos a eles.

---

## ✅ Solução Implementada

Criada nova política RLS que permite:
1. Todos verem modelos públicos (`is_public = true`)
2. Usuários verem modelos privados atribuídos a eles (ID em `allowed_model_ids`)
3. Admins verem todos os modelos

### Query SQL Executada:

```sql
-- Permitir usuários verem modelos privados que foram atribuídos a eles
CREATE POLICY "Users can view their assigned models"
ON models
FOR SELECT
TO authenticated
USING (
  -- Modelo é público OU
  is_public = true
  OR
  -- Modelo está na lista de permitidos do usuário OU
  id::TEXT = ANY(
    SELECT unnest(allowed_model_ids)
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
  OR
  -- Usuário é admin
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

---

## 📊 Políticas RLS Finais

Após a correção, a tabela `models` deve ter estas políticas:

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'models';
```

**Resultado esperado:**

| policyname | cmd | qual |
|------------|-----|------|
| Anyone can view public models | SELECT | (is_public = true) |
| Admins can view all models | SELECT | (EXISTS ... profiles.role = 'admin') |
| Users can view their assigned models | SELECT | (is_public = true OR id::TEXT = ANY(...)) |
| Admins can insert models | INSERT | ... |
| Admins can update models | UPDATE | ... |
| Admins can delete models | DELETE | ... |

---

## 🧪 Como Testar

### 1. Verificar RLS ativo:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'models';
```
Deve retornar: `rowsecurity = true`

### 2. Verificar políticas:
```sql
SELECT policyname, permissive, cmd, qual
FROM pg_policies
WHERE tablename = 'models'
ORDER BY policyname;
```

### 3. Testar com usuário normal:

**No Supabase SQL Editor (como usuário autenticado):**
```sql
-- Ver modelos visíveis para você
SELECT id, name, display_name, is_public
FROM models;
```

Deve retornar:
- ✅ Modelos públicos (is_public = true)
- ✅ Modelos privados no seu allowed_model_ids
- ❌ Modelos privados que você não tem acesso

---

## 🔧 Troubleshooting

### Problema: Usuário ainda não vê modelos atribuídos

**1. Verificar se allowed_model_ids está correto:**
```sql
SELECT email, allowed_model_ids
FROM profiles
WHERE email = 'usuario@email.com';
```

**2. Verificar se modelo existe e é privado:**
```sql
SELECT id, name, is_public
FROM models
WHERE id = 'id-do-modelo';
```

**3. Verificar se política foi criada:**
```sql
SELECT policyname
FROM pg_policies
WHERE tablename = 'models'
AND policyname = 'Users can view their assigned models';
```

**4. Forçar reload das políticas:**
```sql
-- Re-criar a política
DROP POLICY IF EXISTS "Users can view their assigned models" ON models;

CREATE POLICY "Users can view their assigned models"
ON models
FOR SELECT
TO authenticated
USING (
  is_public = true
  OR
  id::TEXT = ANY(
    SELECT unnest(allowed_model_ids)
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

---

## 📝 Notas Importantes

1. **RLS deve estar habilitado** na tabela `models` para as políticas funcionarem
2. A política usa `auth.uid()` do Supabase para identificar o usuário atual
3. A função `unnest()` expande o array `allowed_model_ids` para comparação
4. Admins sempre veem todos os modelos (última condição OR)
5. O frontend (`useModels.ts`) também filtra, mas RLS é a camada de segurança principal

---

## 🎯 Resultado Final

**Antes:**
- ❌ Usuário via apenas modelos públicos
- ❌ `allowed_model_ids` era ignorado pelo RLS
- ❌ Query retornava só modelo "basic"

**Depois:**
- ✅ Usuário vê modelos públicos + atribuídos
- ✅ `allowed_model_ids` é respeitado pelo RLS
- ✅ Query retorna todos os modelos com permissão

---

**Data da correção:** 18 de Novembro de 2025
**Testado e funcionando:** ✅
