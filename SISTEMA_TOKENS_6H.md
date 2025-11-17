# Sistema de Tokens com Reset a Cada 6 Horas

## Resumo da Implementação

O sistema agora funciona da seguinte forma:
- **Limite inicial:** 20 tokens por usuário
- **Reset automático:** A cada 6 horas após o último reset
- **Mensagens informativas:** Mostram quanto tempo falta para o próximo reset
- **Administradores:** Continuam com tokens ilimitados

## 1. Query SQL para Executar no Supabase

Execute esta query no **SQL Editor** do Supabase:

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

## 2. Estrutura da Tabela `profiles` Após a Atualização

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | ID do usuário (FK para auth.users) |
| `email` | text | Email do usuário |
| `name` | text | Nome do usuário |
| `role` | text | 'admin' ou 'default' |
| `tokens` | integer | Tokens atuais disponíveis |
| `unlimited_tokens` | boolean | Se tem tokens ilimitados |
| `initial_tokens` | integer | **NOVO** - Quantidade inicial de tokens (padrão: 20) |
| `last_token_reset` | timestamptz | **NOVO** - Data/hora do último reset de tokens |

## 3. Como Funciona o Sistema

### Fluxo de Reset Automático

1. **Ao carregar a página**: O hook `useTokens` verifica se passaram 6 horas desde `last_token_reset`
2. **Se passaram 6h**: Automaticamente reseta `tokens` para `initial_tokens` e atualiza `last_token_reset`
3. **Contador em tempo real**: A cada segundo, calcula e mostra quanto tempo falta para o próximo reset
4. **No momento do reset**: Quando o contador chega a zero, automaticamente busca os tokens novamente

### Exemplos de Mensagens Exibidas

#### Quando tem poucos tokens (3 restantes):
```
⚠️ Poucos tokens restantes!
Você tem apenas 3 tokens disponíveis. Seus tokens serão resetados em 2h 15min.
```

#### Quando acabaram os tokens:
```
Tokens insuficientes
Você não possui tokens disponíveis. Seus tokens serão resetados em 1h 45min.
```

#### No placeholder do input:
```
Sem tokens. Reset em 3h 20min
```

#### Nas configurações do usuário:
```
Você tem 5 tokens disponíveis. Cada pergunta consome 1 token. Reset em 4h 30min.
```

## 4. Alterações no Código

### Arquivos Modificados:

1. **`src/hooks/useTokens.ts`**
   - Adicionado `timeUntilReset` e `nextResetTime` ao retorno
   - Implementada lógica de verificação de reset automático
   - Timer que atualiza a cada segundo
   - Função `shouldResetTokens()` para verificar se passaram 6 horas

2. **`src/components/chat/ChatInterface.tsx`**
   - Função `formatTimeUntilReset()` para formatar tempo restante
   - Mensagens de aviso mostram tempo até reset
   - Placeholder do input mostra countdown
   - Todas as mensagens de "tokens insuficientes" incluem informação de reset

3. **`src/components/user/UserSettingsForm.tsx`**
   - Exibe tempo até reset nas configurações
   - Mostra countdown ao lado das informações de tokens

## 5. Testando o Sistema

### Teste Manual Rápido

Para testar sem esperar 6 horas, você pode:

1. **Reduzir temporariamente para 1 minuto** (apenas para testes):

```sql
-- APENAS PARA TESTE - Atualizar last_token_reset para 59 minutos atrás
UPDATE profiles
SET last_token_reset = NOW() - INTERVAL '59 minutes'
WHERE id = 'seu-user-id-aqui';
```

2. Recarregue a página e observe que falta 1 minuto para o reset
3. Aguarde 1 minuto e veja o reset automático acontecer

### Teste de Produção

1. Execute a query SQL principal no Supabase
2. Faça login com um usuário não-admin
3. Gaste alguns tokens fazendo perguntas
4. Verifique que as mensagens mostram o tempo até o próximo reset
5. Após 6 horas, os tokens devem ser automaticamente restaurados para 20

## 6. Ajustes Possíveis

### Alterar o Limite Inicial de Tokens

```sql
-- Alterar para 50 tokens, por exemplo
UPDATE profiles
SET initial_tokens = 50
WHERE unlimited_tokens = false;
```

### Alterar o Período de Reset

Para alterar de 6 horas para outro período, edite no arquivo `src/hooks/useTokens.ts`:

```typescript
// Linha 39 - Trocar 6 por outro valor em horas
return hoursSinceReset >= 6;  // Altere o 6 aqui

// Linha 31 - Trocar 6 por outro valor em horas
nextReset.setHours(nextReset.getHours() + 6);  // E aqui também
```

### Forçar Reset Manual de Todos os Usuários

```sql
-- Resetar todos os usuários agora
UPDATE profiles
SET tokens = initial_tokens, last_token_reset = NOW()
WHERE unlimited_tokens = false;
```

## 7. Comportamento Especial

### Administradores
- Continuam com tokens ilimitados
- Não veem mensagens de reset
- Não são afetados pelo sistema de 6 horas

### Usuários com `unlimited_tokens = true`
- Não sofrem reset
- Não gastam tokens
- Não veem mensagens de reset

### Usuários Normais
- Começam com 20 tokens
- A cada 6 horas, voltam para 20 tokens
- Veem contador em tempo real até o próximo reset

## 8. Monitoramento

### Verificar próximo reset de um usuário específico:

```sql
SELECT
  email,
  tokens,
  initial_tokens,
  last_token_reset,
  last_token_reset + INTERVAL '6 hours' as next_reset,
  EXTRACT(EPOCH FROM (last_token_reset + INTERVAL '6 hours' - NOW())) / 3600 as hours_until_reset
FROM profiles
WHERE id = 'user-id-aqui';
```

### Ver todos os usuários e seus próximos resets:

```sql
SELECT
  email,
  tokens,
  last_token_reset + INTERVAL '6 hours' as next_reset,
  ROUND(EXTRACT(EPOCH FROM (last_token_reset + INTERVAL '6 hours' - NOW())) / 3600, 2) as hours_until_reset
FROM profiles
WHERE unlimited_tokens = false
ORDER BY hours_until_reset ASC;
```

## 9. Próximos Passos

1. ✅ Execute a query SQL no Supabase
2. ✅ Faça commit das alterações no código
3. ✅ Teste com um usuário não-admin
4. ✅ Monitore os logs do console para verificar resets automáticos
5. ✅ Ajuste `initial_tokens` conforme necessário

## 10. Troubleshooting

### Tokens não resetam automaticamente
- Verifique se a coluna `last_token_reset` existe no banco
- Confirme que o usuário não tem `unlimited_tokens = true`
- Verifique o console do navegador para logs de reset

### Contador mostra tempo negativo
- Isso pode acontecer se `last_token_reset` for null
- Execute: `UPDATE profiles SET last_token_reset = NOW() WHERE last_token_reset IS NULL;`

### Usuário não vê mensagens de reset
- Verifique se o hook `useTokens` está sendo chamado corretamente
- Confirme que `timeUntilReset` está sendo desestruturado dos componentes
