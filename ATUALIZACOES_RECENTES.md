# Atualizações Recentes - Sunbeam Chat

## 📅 Data: 17 de Novembro de 2025

---

## ✅ Sistema de Tokens com Reset a Cada 6 Horas - Implementado!

### 📋 O que foi feito:

**1. Sistema de Tokens Renovável:**
- Limite inicial: **20 tokens** por usuário
- **Reset automático** a cada 6 horas
- Contador em tempo real mostrando quanto tempo falta para o próximo reset
- Administradores continuam com tokens ilimitados

**2. Mensagens Informativas:**
- Quando tem poucos tokens: "Você tem apenas 3 tokens disponíveis. Seus tokens serão resetados em 2h 15min."
- Quando acabam os tokens: "Você não possui tokens disponíveis. Seus tokens serão resetados em 1h 45min."
- No input: "Sem tokens. Reset em 3h 20min"
- Nas configurações: "Reset em 4h 30min"

### 🗄️ Query SQL para Executar:

**IMPORTANTE:** Execute esta query no **SQL Editor** do Supabase:

```sql
-- Adicionar campos para controle de tokens com reset a cada 6 horas
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS initial_tokens INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS last_token_reset TIMESTAMPTZ DEFAULT NOW();

-- Atualizar todos os usuários existentes para terem 20 tokens iniciais
UPDATE profiles
SET tokens = 20, initial_tokens = 20, last_token_reset = NOW()
WHERE unlimited_tokens = false;

-- Criar índice para otimizar consultas por last_token_reset
CREATE INDEX IF NOT EXISTS idx_profiles_last_token_reset ON profiles(last_token_reset);
```

### 📁 Arquivos Modificados:

1. **`src/hooks/useTokens.ts`** - Lógica de reset automático e timer
2. **`src/components/chat/ChatInterface.tsx`** - UI com countdown
3. **`src/components/user/UserSettingsForm.tsx`** - Exibir tempo de reset
4. **`SISTEMA_TOKENS_6H.md`** - Documentação completa do sistema

### 🎯 Como Funciona:

1. **Ao carregar a página**: O sistema verifica se passaram 6 horas desde o último reset
2. **Se passaram 6h**: Automaticamente reseta os tokens para 20 e atualiza o timestamp
3. **Contador em tempo real**: A cada segundo, calcula e mostra quanto tempo falta
4. **No momento do reset**: Quando o contador chega a zero, automaticamente busca os tokens novamente

### ⚙️ Ajustes Opcionais:

**Para alterar o limite inicial (ex: 50 tokens):**
```sql
UPDATE profiles SET initial_tokens = 50 WHERE unlimited_tokens = false;
```

**Para alterar o período (ex: 12 horas):**
Edite `src/hooks/useTokens.ts` nas linhas 31 e 39, trocando `6` pelo novo valor.

---

## 📊 Estatísticas de Tokens API no Painel Admin

### 📋 O que foi feito:

**Nova funcionalidade no painel `/admin`:**
- Exibe **total de mensagens** por usuário
- Exibe **total de tokens API consumidos** (OpenAI/Gemini)
- Exibe **média de tokens por mensagem**

### 🗄️ Estrutura do Banco:

**Tabela `n8n_chat_histories`:**
- Adicionada coluna `tokens_api` (INTEGER)
- Esta coluna é preenchida pelo N8N ao salvar cada mensagem
- Armazena quantos tokens a API consumiu naquela mensagem

### 📁 Arquivos Modificados:

1. **`src/components/admin/ImprovedAdminPanel.tsx`**
   - Nova interface `User` com campos: `total_api_tokens`, `avg_tokens_per_message`, `message_count`
   - Query modificada para buscar e calcular estatísticas de `n8n_chat_histories`
   - Três novas colunas na tabela admin:
     - **Mensagens** (cinza)
     - **Tokens API Usados** (azul)
     - **Média Tokens/Msg** (roxo)

### 🎯 Integração com N8N:

O workflow N8N deve salvar o consumo de tokens em cada mensagem:
```json
{
  "message": "resposta do usuário ou assistente",
  "user_id": "uuid-do-usuario",
  "session_id": "session-id",
  "tokens_api": 1250  // <- tokens consumidos pela API
}
```

### 📊 Exemplo de Visualização no Admin:

| Usuário | Mensagens | Tokens API Usados | Média Tokens/Msg |
|---------|-----------|-------------------|------------------|
| João Silva | 45 | 67,890 | 1,508 |
| Maria Santos | 23 | 31,200 | 1,357 |

---

## 🐛 Correção: Bug do Enter Key

### 📋 Problema:

Usuários não conseguiam enviar mensagens pressionando apenas Enter. O erro ocorria devido à ordem incorreta das declarações de funções com `useCallback`.

### ✅ Solução:

**Reordenação das funções em `ChatInterface.tsx`:**

1. **Antes (QUEBRADO):**
   ```
   handleKeyDown → selectSuggestion (erro!) → handleSendMessage (erro!)
   ```

2. **Depois (CORRIGIDO):**
   ```
   handleSendMessage → selectSuggestion → handleKeyDown
   ```

### 📁 Arquivo Modificado:

- **`src/components/chat/ChatInterface.tsx`**
  - Movida função `handleSendMessage` para antes de `handleKeyDown`
  - Movida função `selectSuggestion` para antes de `handleKeyDown`
  - Removida função `handleSendMessage` duplicada
  - Adicionadas dependências corretas no `useCallback`

### 🎯 Resultado:

- ✅ Enter envia mensagens normalmente
- ✅ Shift+Enter adiciona nova linha
- ✅ Setas navegam nas sugestões de comandos
- ✅ Enter seleciona sugestão quando lista aberta

---

## 🚀 Otimizações de Performance

### 📋 O que foi feito:

**Otimizações com React Hooks:**
- `useCallback` em todas as funções críticas para evitar re-renderizações
- `useMemo` para cálculos pesados e filtros
- `React.memo` em componentes puros

### 📁 Arquivos Otimizados:

1. **`src/components/chat/ChatInterface.tsx`**
   - `convertN8nMessagesToLocal` com `useCallback`
   - `handleSendMessage` com `useCallback`
   - `handleKeyDown` com `useCallback`
   - `selectSuggestion` com `useCallback`

2. **`src/components/chat/ChatLayout.tsx`**
   - Mouse move handler otimizado

3. **`src/components/chat/ChatSidebar.tsx`**
   - `formatDate` com `useMemo`
   - Componente com `React.memo`

4. **`src/components/chat/MarkdownRenderer.tsx`**
   - Renderização de Markdown memoizada

### 🎯 Resultado:

- Redução significativa de re-renderizações desnecessárias
- Interface mais responsiva
- Melhor performance em dispositivos menos potentes

---

## 📦 Commits Realizados

### 1. `9965af0` - Sistema de tokens com reset 6h
```
feat: implementar sistema de tokens com reset automático a cada 6 horas
```

### 2. `349d208` - Fix Enter key + Tokens API
```
fix: resolver bug do Enter key e adicionar estatísticas de tokens API no painel admin
```

### 3. `39e9589` - Tokens API no admin
```
feat: adicionar estatísticas de tokens da API no painel admin
```

### 4. `13a539e` - Otimizações de performance
```
perf: otimizar performance da aplicação com React hooks
```

---

## 📖 Documentação Criada

### 1. `SISTEMA_TOKENS_6H.md`
Documentação completa do sistema de tokens com reset:
- Como funciona o reset automático
- Queries SQL necessárias
- Como testar o sistema
- Como ajustar configurações
- Troubleshooting
- Exemplos de monitoramento

### 2. `ATUALIZACOES_RECENTES.md` (este arquivo)
Resumo de todas as atualizações realizadas nesta sessão.

---

## 🧪 Como Testar

### Teste do Sistema de Tokens (6h):

1. Execute a query SQL no Supabase
2. Faça login com usuário não-admin
3. Gaste alguns tokens fazendo perguntas
4. Verifique que o contador aparece nas mensagens
5. Para testar rapidamente, execute:
   ```sql
   UPDATE profiles
   SET last_token_reset = NOW() - INTERVAL '5 hours 59 minutes'
   WHERE id = 'seu-user-id';
   ```
6. Aguarde 1 minuto e veja o reset automático

### Teste das Estatísticas de Tokens API:

1. Acesse `/admin` como administrador
2. Verifique as três novas colunas na tabela de usuários
3. Certifique-se de que o N8N está salvando `tokens_api` nas mensagens
4. Os valores devem atualizar após novas conversas

### Teste do Enter Key:

1. Abra o chat
2. Digite uma mensagem
3. Pressione Enter → deve enviar
4. Digite uma mensagem
5. Pressione Shift+Enter → deve adicionar linha
6. Digite `/` para abrir sugestões
7. Use setas para navegar
8. Pressione Enter → deve selecionar sugestão

---

## 🔄 Branch Atual

**Branch:** `feature/admin-improvements`

**Status:** Todas as alterações foram commitadas e enviadas para o GitHub.

**Link para criar PR:**
https://github.com/VendaSeguroTech/sunbeam-chat/pull/new/feature/admin-improvements

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Consulte `SISTEMA_TOKENS_6H.md` para detalhes técnicos
2. Verifique os logs do console do navegador
3. Execute as queries de monitoramento do banco de dados
4. Revise os commits para entender cada mudança

---

## ✅ Checklist de Deploy

- [ ] Executar query SQL no Supabase
- [ ] Fazer build da aplicação (`npm run build`)
- [ ] Testar sistema de tokens com usuário não-admin
- [ ] Verificar contador de reset funcionando
- [ ] Confirmar estatísticas de tokens API no admin
- [ ] Testar Enter key para enviar mensagens
- [ ] Verificar que N8N está salvando `tokens_api`
- [ ] Monitorar logs por 24h após deploy
- [ ] Ajustar `initial_tokens` se necessário

---

**Última atualização:** 17 de Novembro de 2025
**Desenvolvido por:** Claude Code
**Branch:** feature/admin-improvements
