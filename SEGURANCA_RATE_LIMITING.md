# 🔒 Guia de Segurança: Rate Limiting e Validação de UserID

## 📋 Índice
1. [O Que é Rate Limiting?](#o-que-é-rate-limiting)
2. [O Que é Validação de UserID?](#o-que-é-validação-de-userid)
3. [Por Que Isso é Importante?](#por-que-isso-é-importante)
4. [Como Implementar no N8N](#como-implementar-no-n8n)
5. [Exemplos Práticos](#exemplos-práticos)
6. [Testes e Monitoramento](#testes-e-monitoramento)

---

## 🎯 O Que é Rate Limiting?

**Rate Limiting** é uma técnica de segurança que **limita a quantidade de requisições** que um usuário pode fazer em um período de tempo.

### Analogia Simples
Imagine uma torneira de água:
- **Sem Rate Limiting**: A torneira fica 100% aberta, pode desperdiçar muita água rapidamente
- **Com Rate Limiting**: A torneira tem um regulador que controla o fluxo - permite usar, mas com controle

### No Contexto da Aplicação
```
Usuário normal: 10 mensagens por minuto ✅
Atacante/Bot: 1000 mensagens por minuto ❌ BLOQUEADO!
```

### Benefícios
✅ **Previne abuso**: Impede que alguém envie milhares de mensagens
✅ **Economiza recursos**: Cada mensagem consome:
   - Tokens da API de IA (custa dinheiro)
   - Processamento do servidor
   - Banda de rede
✅ **Melhora experiência**: Evita lentidão causada por spam
✅ **Protege custos**: APIs de IA como OpenAI cobram por uso

---

## 🔐 O Que é Validação de UserID?

**Validação de UserID** é verificar se o usuário que está enviando a mensagem **realmente existe e é válido** no sistema.

### O Problema Atual

**Situação ANTES da validação:**
```javascript
// Frontend envia para webhook N8N:
{
  userId: "abc123",
  sessionId: "session_xyz",
  message: "Olá"
}

// N8N recebe e processa SEM VERIFICAR
// ❌ RISCO: Qualquer um pode inventar um userId!
```

**Alguém malicioso pode fazer:**
```bash
curl -X POST https://n8n.vendaseguro.tech/webhook-test/... \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "usuario_inventado_12345",
    "sessionId": "sessao_falsa",
    "message": "Esta mensagem vai consumir tokens da IA!"
  }'
```

**Resultado:**
- ❌ Mensagem é processada
- ❌ Consome tokens da IA (custa dinheiro)
- ❌ Salva no banco de dados
- ❌ Não há como rastrear quem fez isso

---

### A Solução: Validação de UserID

**Situação DEPOIS da validação:**
```javascript
// 1. N8N recebe o payload
const userId = $input.json.userId;
const sessionId = $input.json.sessionId;

// 2. VALIDA no banco de dados
const userExists = await checkUserInDatabase(userId);

if (!userExists) {
  // ✅ BLOQUEIA a requisição
  return {
    statusCode: 403,
    body: { error: "Usuário inválido" }
  };
}

// 3. VALIDA se a sessão pertence ao usuário
const sessionBelongsToUser = await checkSession(sessionId, userId);

if (!sessionBelongsToUser) {
  // ✅ BLOQUEIA tentativa de acessar sessão de outro usuário
  return {
    statusCode: 403,
    body: { error: "Sessão não pertence ao usuário" }
  };
}

// 4. Se passou nas validações, PROCESSA a mensagem
```

### Benefícios da Validação
✅ **Apenas usuários reais**: Só processa mensagens de usuários cadastrados
✅ **Previne falsificação**: Não aceita userIds inventados
✅ **Protege privacidade**: Usuário A não pode acessar sessões do usuário B
✅ **Auditoria**: Todos os acessos são de usuários rastreáveis

---

## ⚠️ Por Que Isso é Importante?

### Cenário de Ataque Real

**Sem Proteção:**
```
1. Atacante descobre URL do webhook (inspecionando código)
2. Atacante escreve script que envia 10.000 mensagens
3. Cada mensagem chama API da OpenAI
4. Custo: 10.000 mensagens × $0.002 por mensagem = $20 USD
5. Servidor fica lento processando requisições falsas
6. Usuários reais não conseguem usar o sistema
```

**Com Rate Limiting + Validação:**
```
1. Atacante descobre URL do webhook
2. Atacante tenta enviar com userId falso
   → ❌ BLOQUEADO: "Usuário inválido"
3. Atacante tenta usar userId real roubado
   → ❌ BLOQUEADO: "SessionId não pertence ao usuário"
4. Atacante tenta com userId e sessionId válidos
   → ✅ Primeira mensagem passa
   → ✅ Segunda mensagem passa
   → ✅ 10ª mensagem passa
   → ❌ 11ª mensagem: BLOQUEADO "Rate limit excedido: máximo 10 msgs/min"
5. Sistema protegido! Máximo dano possível: 10 mensagens
```

---

## 🛠️ Como Implementar no N8N

### Arquitetura da Solução

```
┌─────────────┐
│  Frontend   │
│  (React)    │
└──────┬──────┘
       │ POST: { userId, sessionId, message }
       ↓
┌─────────────────────────────────────────┐
│          N8N Webhook                    │
│  ┌─────────────────────────────────┐   │
│  │ 1. VALIDAR USERID               │   │
│  │    ├─ Consultar Supabase        │   │
│  │    ├─ Usuário existe?           │   │
│  │    └─ Se NÃO → 403 Forbidden    │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ 2. VALIDAR SESSIONID            │   │
│  │    ├─ Consultar Supabase        │   │
│  │    ├─ Sessão pertence ao user?  │   │
│  │    └─ Se NÃO → 403 Forbidden    │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ 3. VERIFICAR RATE LIMIT         │   │
│  │    ├─ Quantas msgs em 1 min?    │   │
│  │    ├─ Mais de 10?               │   │
│  │    └─ Se SIM → 429 Too Many     │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ 4. PROCESSAR MENSAGEM           │   │
│  │    ├─ Fazer busca RAG           │   │
│  │    ├─ Chamar IA                 │   │
│  │    └─ Salvar no banco           │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

### Passo a Passo de Implementação

#### **PASSO 1: Criar Nó de Validação de UserID**

No workflow do N8N, logo após receber o webhook, adicione um nó **Postgres**:

**Configuração do Nó Postgres:**
```
Nome: Validar UserID
Operação: Execute Query
Query:
```

```sql
-- Verificar se o userId existe na tabela profiles
SELECT
  id,
  email,
  role,
  name
FROM profiles
WHERE id = '{{ $json.userId }}'
LIMIT 1;
```

**Conexão:**
- Host: `db` (nome do serviço Docker do Supabase)
- Port: `5432`
- Database: `postgres`
- User: `postgres`
- Password: [sua senha do .env]
- SSL: `disable`

---

#### **PASSO 2: Adicionar Nó Switch para Verificar Resultado**

Após o nó de validação, adicione um nó **Switch**:

**Configuração:**
```
Nome: Usuário Válido?
Modo: Regras

Rota 1 (Usuário Existe):
  Condição: {{ $json.length > 0 }}

Rota 2 (Usuário Inválido - Fallback):
  Catch All
```

---

#### **PASSO 3: Criar Nó de Resposta para Usuário Inválido**

Na Rota 2 do Switch, adicione um nó **Respond to Webhook**:

**Configuração:**
```
Nome: Bloquear - Usuário Inválido
Status Code: 403
Corpo da Resposta:
```

```json
{
  "error": "Acesso negado",
  "message": "Usuário não encontrado no sistema",
  "timestamp": "{{ $now.toISO() }}"
}
```

---

#### **PASSO 4: Validar SessionID (Opcional mas Recomendado)**

Na Rota 1 do Switch, adicione outro nó **Postgres**:

**Query:**
```sql
-- Verificar se a sessão pertence ao usuário
SELECT
  session_id,
  user_id,
  created_at
FROM n8n_chat_histories
WHERE session_id = '{{ $json.sessionId }}'
  AND user_id = '{{ $json.userId }}'
LIMIT 1;
```

**Adicionar outro Switch:**
```
Rota 1: {{ $json.length > 0 }} → Sessão válida, continuar
Rota 2: Fallback → Responder 403 "Sessão inválida"
```

---

#### **PASSO 5: Implementar Rate Limiting**

Adicione um nó **Postgres** para verificar mensagens recentes:

**Query:**
```sql
-- Contar mensagens do usuário no último minuto
SELECT COUNT(*) as message_count
FROM n8n_chat_histories
WHERE user_id = '{{ $json.userId }}'
  AND created_at >= NOW() - INTERVAL '1 minute'
  AND message->>'role' = 'user'; -- Contar apenas mensagens do usuário
```

**Adicionar Switch:**
```
Nome: Rate Limit Check

Rota 1 (Permitir):
  Condição: {{ $json[0].message_count < 10 }}

Rota 2 (Bloquear):
  Condição: {{ $json[0].message_count >= 10 }}
  Resposta:
  Status: 429
  Body: {
    "error": "Rate limit excedido",
    "message": "Você enviou muitas mensagens. Aguarde 1 minuto.",
    "retry_after": 60
  }
```

---

#### **PASSO 6: (Opcional) Registrar Tentativas Bloqueadas**

Para monitorar ataques, adicione um nó **Postgres** na rota de bloqueio:

**Query:**
```sql
-- Registrar tentativa bloqueada
INSERT INTO security_logs (
  user_id,
  session_id,
  event_type,
  ip_address,
  details,
  created_at
) VALUES (
  '{{ $json.userId }}',
  '{{ $json.sessionId }}',
  'rate_limit_exceeded', -- ou 'invalid_user', 'invalid_session'
  '{{ $json.headers["x-forwarded-for"] || $json.headers["x-real-ip"] }}',
  '{{ JSON.stringify($json) }}',
  NOW()
);
```

---

## 📊 Exemplos Práticos

### Exemplo 1: Requisição Normal (Aprovada)

**Request:**
```json
POST /webhook-test/0fc3496c-5dfa-4772-8661-da71da6353c7
{
  "userId": "real-user-id-123",
  "sessionId": "session_1234567890_abc",
  "message": "Como funciona o seguro?"
}
```

**Fluxo:**
1. ✅ Validar UserID → Usuário existe
2. ✅ Validar SessionID → Sessão pertence ao usuário
3. ✅ Rate Limit → 3 mensagens no último minuto (< 10)
4. ✅ Processar mensagem → Chamar IA → Retornar resposta

**Response:**
```json
{
  "response": "O seguro funciona da seguinte forma..."
}
```

---

### Exemplo 2: UserID Inválido (Bloqueado)

**Request:**
```json
POST /webhook-test/0fc3496c-5dfa-4772-8661-da71da6353c7
{
  "userId": "usuario_inventado_xyz",
  "sessionId": "session_falsa",
  "message": "Teste de ataque"
}
```

**Fluxo:**
1. ❌ Validar UserID → Usuário NÃO existe
2. 🛑 PARAR PROCESSAMENTO

**Response:**
```json
{
  "error": "Acesso negado",
  "message": "Usuário não encontrado no sistema",
  "timestamp": "2025-11-26T10:30:00Z"
}
```

---

### Exemplo 3: Rate Limit Excedido (Bloqueado)

**Request:**
```json
POST /webhook-test/0fc3496c-5dfa-4772-8661-da71da6353c7
{
  "userId": "real-user-id-123",
  "sessionId": "session_1234567890_abc",
  "message": "11ª mensagem em 1 minuto"
}
```

**Fluxo:**
1. ✅ Validar UserID → Usuário existe
2. ✅ Validar SessionID → Sessão válida
3. ❌ Rate Limit → 11 mensagens no último minuto (>= 10)
4. 🛑 PARAR PROCESSAMENTO

**Response:**
```json
{
  "error": "Rate limit excedido",
  "message": "Você enviou muitas mensagens. Aguarde 1 minuto.",
  "retry_after": 60
}
```

---

### Exemplo 4: SessionID de Outro Usuário (Bloqueado)

**Request:**
```json
POST /webhook-test/0fc3496c-5dfa-4772-8661-da71da6353c7
{
  "userId": "user-A",
  "sessionId": "session_do_user_B", // Tentando acessar sessão de outro usuário
  "message": "Quero ver conversas do user B"
}
```

**Fluxo:**
1. ✅ Validar UserID → user-A existe
2. ❌ Validar SessionID → Sessão pertence ao user-B (não user-A)
3. 🛑 PARAR PROCESSAMENTO

**Response:**
```json
{
  "error": "Acesso negado",
  "message": "Sessão inválida ou não pertence ao usuário",
  "timestamp": "2025-11-26T10:35:00Z"
}
```

---

## 🧪 Testes e Monitoramento

### Como Testar a Implementação

#### Teste 1: UserID Válido
```bash
curl -X POST https://n8n.vendaseguro.tech/webhook-test/... \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-real-do-banco",
    "sessionId": "session_valida",
    "message": "Teste"
  }'
```

**Resultado Esperado:** 200 OK + resposta da IA

---

#### Teste 2: UserID Inválido
```bash
curl -X POST https://n8n.vendaseguro.tech/webhook-test/... \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "usuario_fake_12345",
    "sessionId": "session_fake",
    "message": "Teste de ataque"
  }'
```

**Resultado Esperado:** 403 Forbidden + mensagem de erro

---

#### Teste 3: Rate Limiting
```bash
# Enviar 15 mensagens em sequência rápida
for i in {1..15}; do
  curl -X POST https://n8n.vendaseguro.tech/webhook-test/... \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "uuid-real-do-banco",
      "sessionId": "session_valida",
      "message": "Teste '$i'"
    }'
  echo "Mensagem $i enviada"
done
```

**Resultado Esperado:**
- Mensagens 1-10: 200 OK
- Mensagens 11-15: 429 Too Many Requests

---

### Monitoramento e Logs

#### Query para Ver Tentativas Bloqueadas (últimas 24h)
```sql
SELECT
  event_type,
  user_id,
  COUNT(*) as attempts,
  MAX(created_at) as last_attempt
FROM security_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND event_type IN ('rate_limit_exceeded', 'invalid_user', 'invalid_session')
GROUP BY event_type, user_id
ORDER BY attempts DESC;
```

#### Query para Ver Usuários com Mais Mensagens
```sql
SELECT
  user_id,
  COUNT(*) as message_count,
  MIN(created_at) as first_message,
  MAX(created_at) as last_message
FROM n8n_chat_histories
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY user_id
ORDER BY message_count DESC
LIMIT 10;
```

---

## 🎯 Configurações Recomendadas

### Rate Limits por Tipo de Usuário

| Tipo de Usuário | Limite por Minuto | Limite por Hora |
|-----------------|-------------------|-----------------|
| **Free** | 5 mensagens | 50 mensagens |
| **Básico** | 10 mensagens | 100 mensagens |
| **Pro** | 20 mensagens | 500 mensagens |
| **Admin** | Ilimitado | Ilimitado |

### Implementação de Limites Dinâmicos

**Query no N8N:**
```sql
-- Buscar limite do usuário baseado no plano
SELECT
  p.id,
  p.role,
  p.unlimited_tokens,
  CASE
    WHEN p.unlimited_tokens = true THEN 999999
    WHEN p.role = 'admin' THEN 999999
    WHEN p.subscription_plan = 'pro' THEN 20
    WHEN p.subscription_plan = 'basic' THEN 10
    ELSE 5
  END as rate_limit_per_minute
FROM profiles p
WHERE p.id = '{{ $json.userId }}';
```

---

## 📝 Checklist de Implementação

- [ ] Criar nó de validação de UserID
- [ ] Criar nó de validação de SessionID
- [ ] Implementar rate limiting básico (10 msgs/min)
- [ ] Adicionar respostas de erro apropriadas (403, 429)
- [ ] (Opcional) Criar tabela security_logs
- [ ] (Opcional) Implementar rate limits dinâmicos por plano
- [ ] Testar com userId válido
- [ ] Testar com userId inválido
- [ ] Testar rate limiting
- [ ] Configurar alertas de segurança
- [ ] Documentar limites para usuários

---

## 🚨 Respostas de Erro Padronizadas

### 403 Forbidden - Usuário Inválido
```json
{
  "error": "Acesso negado",
  "message": "Usuário não encontrado no sistema",
  "code": "INVALID_USER",
  "timestamp": "2025-11-26T10:30:00Z"
}
```

### 403 Forbidden - Sessão Inválida
```json
{
  "error": "Acesso negado",
  "message": "Sessão inválida ou não pertence ao usuário",
  "code": "INVALID_SESSION",
  "timestamp": "2025-11-26T10:30:00Z"
}
```

### 429 Too Many Requests - Rate Limit
```json
{
  "error": "Rate limit excedido",
  "message": "Você enviou muitas mensagens. Aguarde 1 minuto.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60,
  "timestamp": "2025-11-26T10:30:00Z"
}
```

---

## 🎓 Resumo

### O Que Implementamos?

✅ **Validação de UserID**: Apenas usuários reais podem enviar mensagens
✅ **Validação de SessionID**: Usuários só acessam suas próprias conversas
✅ **Rate Limiting**: Máximo de 10 mensagens por minuto por usuário
✅ **Respostas de Erro**: Feedback claro quando bloqueado
✅ **Monitoramento**: Logs de tentativas bloqueadas

### Nível de Segurança Antes vs Depois

| Aspecto | Antes ❌ | Depois ✅ |
|---------|----------|-----------|
| UserID Falso | Aceita | Bloqueia (403) |
| SessionID de Outro User | Aceita | Bloqueia (403) |
| Spam (1000 msgs) | Aceita | Bloqueia após 10 (429) |
| Custo de Ataque | Ilimitado | Máximo 10 msgs/min |
| Rastreabilidade | Impossível | Todos os eventos logados |

---

## 🔗 Recursos Adicionais

- [Documentação N8N - Postgres Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/)
- [HTTP Status Codes - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [OWASP Rate Limiting](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)

---

**Documentação criada em:** 26 de Novembro de 2025
**Versão:** 1.0
**Autor:** Claude Code - Anthropic
