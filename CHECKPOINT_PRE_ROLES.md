# Checkpoint - Antes da Implementação de Separação de Roles

## 📅 Data: 18 de Novembro de 2025

## 🏷️ Tag Git: `v1.0-pre-roles`

---

## 📸 Estado Atual da Aplicação

### ✅ Funcionalidades Implementadas

1. **Sistema de Tokens com Reset Automático (6h)**
   - Limite de 20 tokens por usuário
   - Reset automático a cada 6 horas
   - Contador em tempo real até próximo reset
   - Avisos progressivos (5, 4, 3, 2, 1 tokens)

2. **Estatísticas de Tokens API no Admin**
   - Total de mensagens por usuário
   - Total de tokens API consumidos (OpenAI/Gemini)
   - Média de tokens por mensagem
   - Dados vêm da tabela `n8n_chat_histories.tokens_api`

3. **Sistema de Modelos Dinâmico**
   - Modelos cadastrados na tabela `models`
   - ModelSelector busca modelos do banco
   - Admin pode criar/editar/deletar modelos via `/admin`

4. **Otimizações de Performance**
   - React hooks (useCallback, useMemo)
   - Componentes memoizados
   - Renderização otimizada

5. **Markdown com Itálico**
   - Suporte para `**negrito**`
   - Suporte para `_itálico_`
   - Títulos, listas, parágrafos

6. **Avisos Progressivos de Tokens**
   - Alerta quando restam 5, 4, 3, 2, 1 tokens
   - Alerta vermelho para 2 e 1 token
   - Mostra tempo até reset

---

## 📊 Estrutura do Banco Atual

### Tabela `profiles`
```sql
- id (uuid)
- email (text)
- name (text)
- role (text) -- 'admin' ou 'default'
- tokens (integer)
- unlimited_tokens (boolean)
- initial_tokens (integer) -- padrão: 20
- last_token_reset (timestamptz)
- last_seen (timestamptz)
```

### Tabela `models`
```sql
- id (uuid)
- name (text) -- 'basic', 'pro', 'inter', 'GPT-5'
- display_name (text) -- Nome exibido
- description (text)
- is_public (boolean)
- created_at (timestamptz)
- updated_at (timestamptz)
```

### Tabela `n8n_chat_histories`
```sql
- id (uuid)
- session_id (text)
- user_id (uuid)
- message (jsonb)
- tokens_api (integer) -- consumo da API
- created_at (timestamptz)
```

---

## 🎯 Comportamento Atual do Sistema de Modelos

### Como Funciona Hoje:

1. **Todos os usuários veem todos os modelos** no ModelSelector
2. **Não há restrição** de acesso por usuário
3. **Admin pode gerenciar modelos** em `/admin` → "Gerenciar Modelos"
4. **Campo `is_public`** existe mas não é usado para filtrar acesso

### ModelSelector Atual:
- Busca TODOS os modelos da tabela `models`
- Exibe TODOS para qualquer usuário
- Não verifica permissões

---

## 🚀 Próxima Implementação: Separação de Roles por Modelo

### Objetivo:
Implementar sistema onde cada usuário só vê e pode usar os modelos aos quais tem acesso.

### Plano:
1. Adicionar coluna `allowed_model_ids` (TEXT[]) na tabela `profiles`
2. Marcar modelo "basic" como público (`is_public = true`)
3. Filtrar modelos no `useModels.ts` baseado em:
   - Admin: vê todos
   - Modelo público: todos veem
   - Modelo privado: só quem tem ID em `allowed_model_ids`
4. Adicionar interface no Admin para atribuir modelos aos usuários
5. Validar permissões antes de enviar mensagem

### Estrutura Planejada:
```sql
ALTER TABLE profiles
ADD COLUMN allowed_model_ids TEXT[] DEFAULT ARRAY[]::TEXT[];
```

---

## 📁 Arquivos Importantes

### Hooks:
- `src/hooks/useTokens.ts` - Gerenciamento de tokens e reset
- `src/hooks/useModels.ts` - Busca e gerenciamento de modelos
- `src/hooks/useUserRole.ts` - Verificação de role do usuário
- `src/hooks/useN8nChatHistory.ts` - Histórico de conversas

### Componentes Principais:
- `src/components/chat/ChatInterface.tsx` - Interface principal do chat
- `src/components/chat/ChatLayout.tsx` - Layout do chat com sidebar
- `src/components/chat/ModelSelector.tsx` - Seletor de modelos
- `src/components/chat/MarkdownRenderer.tsx` - Renderização de markdown
- `src/components/admin/ImprovedAdminPanel.tsx` - Painel administrativo
- `src/components/admin/ModelManagement.tsx` - Gerenciamento de modelos

### Contextos:
- `src/contexts/MaintenanceContext.tsx` - Modo manutenção
- `src/contexts/PresenceContext.tsx` - Presença de usuários

---

## 🔧 Configurações Importantes

### Webhook N8N:
```typescript
const WEBHOOK_URL = "https://n8n.vendaseguro.tech/webhook-test/0fc3496c-5dfa-4772-8661-da71da6353c7";
```

### Limites:
- `MESSAGE_LIMIT = 40` mensagens por conversa
- `MESSAGE_WARNING_THRESHOLD = 45` (aviso de limite)
- `initial_tokens = 20` tokens iniciais
- Reset de tokens: 6 horas

---

## 📝 Commits Recentes

```
91709e9 feat: adicionar suporte para texto em itálico usando underscore (_texto_)
33c2278 fix: mostrar aviso de tokens baixos na primeira carga da página
08f75a5 feat: adicionar avisos progressivos quando tokens estão acabando (5, 4, 3, 2, 1)
37a10d7 docs: adicionar documento com resumo de todas as atualizações recentes
9965af0 feat: implementar sistema de tokens com reset automático a cada 6 horas
349d208 fix: resolver bug do Enter key e adicionar estatísticas de tokens API no painel admin
```

---

## 🔄 Como Voltar para Este Ponto

Se precisar reverter para este estado:

```bash
# Voltar para a tag
git checkout v1.0-pre-roles

# Ou criar nova branch a partir daqui
git checkout -b nova-branch v1.0-pre-roles

# Ver diferenças com estado atual
git diff v1.0-pre-roles HEAD
```

---

## ✅ Testes Pendentes Antes de Produção

- [ ] Testar reset de tokens após 6 horas em produção
- [ ] Verificar estatísticas de tokens API com dados reais do N8N
- [ ] Validar avisos progressivos em diferentes cenários
- [ ] Testar markdown com itálico em diferentes mensagens
- [ ] Verificar performance com muitos usuários simultâneos

---

## 📞 Notas Importantes

1. **Branch atual:** `feature/admin-improvements`
2. **Última atualização:** 18/11/2025
3. **Status:** ✅ Estável e funcional
4. **Pronto para:** Implementação de separação de roles

---

**Documentação complementar:**
- `SISTEMA_TOKENS_6H.md` - Documentação completa do sistema de tokens
- `ATUALIZACOES_RECENTES.md` - Resumo de todas as atualizações
- `CLAUDE.md` - Instruções gerais do projeto
