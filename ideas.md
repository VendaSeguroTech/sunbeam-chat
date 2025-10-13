# 💡 Ideias para Implementações Futuras

## 🔗 Webhook para Adicionar Tokens via IA

### Contexto
Criar um sistema onde a IA pode adicionar tokens automaticamente para usuários via webhook.

### Opções de Implementação

#### 1. **N8N Workflow** ⭐ (Recomendado)
- **Vantagens:**
  - Já temos N8N rodando
  - Não precisa de servidor adicional
  - Interface visual para criar o workflow
  - Fácil de manter e debugar

- **Como fazer:**
  ```
  Webhook Trigger (N8N)
    ↓
  Recebe payload: { user_id, tokens_to_add }
    ↓
  Postgres Node
    ↓
  UPDATE profiles SET tokens = tokens + {{tokens_to_add}} WHERE id = {{user_id}}
    ↓
  Response com sucesso/erro
  ```

- **Endpoint gerado:** `https://n8n.vendaseguro.tech/webhook/add-tokens`

#### 2. **Supabase Edge Functions** (Serverless)
- **Vantagens:**
  - Serverless (não precisa manter servidor rodando)
  - Integrado diretamente com Supabase
  - TypeScript/Deno

- **Como fazer:**
  - Criar função em `supabase/functions/add-tokens/index.ts`
  - Deploy via CLI do Supabase
  - Endpoint: `https://supabase.vendaseguro.tech/functions/v1/add-tokens`

#### 3. **Servidor Node.js Express**
- **Desvantagens:**
  - Precisa manter servidor adicional rodando 24/7
  - Mais complexo de configurar e manter
  - Custo adicional de infraestrutura

- **Quando usar:**
  - Se precisar de lógica muito complexa
  - Se precisar de múltiplos endpoints relacionados

### Segurança
- [ ] Adicionar autenticação via token/API key no webhook
- [ ] Validar payload recebido (user_id existe? tokens_to_add é válido?)
- [ ] Limitar quantidade máxima de tokens que podem ser adicionados por chamada
- [ ] Log de todas as adições de tokens para auditoria

### Payload Sugerido
```json
{
  "user_id": "uuid-do-usuario",
  "tokens_to_add": 10,
  "reason": "Recompensa por tarefa X",
  "api_key": "sua-chave-secreta"
}
```

---

## 🎯 Outras Ideias Futuras

### Melhorias no Sistema de Tokens
- [ ] Sistema de pacotes de tokens (ex: pacote 10, 50, 100 tokens)
- [ ] Histórico de transações de tokens (quem adicionou, quando, quanto)
- [ ] Tokens com validade/expiração
- [ ] Diferentes "tipos" de tokens (ex: tokens premium, tokens gratuitos)

### Melhorias no Admin Panel
- [ ] Exportar lista de usuários para CSV/Excel
- [ ] Gráficos de uso de tokens ao longo do tempo
- [ ] Notificações automáticas quando usuário fica sem tokens
- [ ] Bulk actions (adicionar tokens para múltiplos usuários de uma vez)

### Melhorias no Chat
- [ ] Histórico de uso de tokens do usuário
- [ ] Promoções/eventos especiais com tokens extras
- [ ] Sistema de referência (ganhar tokens ao convidar amigos)
- [ ] Achievements/conquistas que dão tokens como recompensa

### Integrações
- [ ] Webhook de notificação quando tokens acabam
- [ ] Integração com sistema de pagamento para compra de tokens
- [ ] API REST para consultar/gerenciar tokens externamente

---

## 📝 Notas Técnicas

### Arquivos Relacionados
- `supabase/migrations/add_tokens_to_profiles.sql` - Migração do banco
- `src/hooks/useTokens.ts` - Hook de gerenciamento de tokens
- `src/components/admin/ImprovedAdminPanel.tsx` - Painel administrativo
- `src/components/user/UserSettingsForm.tsx` - Configurações do usuário
- `src/components/chat/ChatInterface.tsx` - Interface do chat com bloqueio

### Documentação
Ver `CLAUDE.md` para documentação completa do sistema.
