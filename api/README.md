# API Node.js - Validação SSO

## Descrição

Este é um servidor Node.js standalone que valida tokens SSO do Hub VendaSeguro e cria/autentica usuários no Supabase.

## Instalação

### 1. Instalar Dependências

```bash
cd api
npm install @supabase/supabase-js
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Supabase Configuration
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua_service_role_key_aqui

# Server Configuration
PORT=3001

# Encryption Key (mesma do Hub VendaSeguro)
ENCRYPTION_KEY=isw_venda_seguro
```

### 3. Obter Credenciais do Supabase

1. Acesse seu projeto no Supabase: https://supabase.com/dashboard
2. Vá em **Settings** > **API**
3. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key (secret) → `SUPABASE_SERVICE_KEY`

⚠️ **IMPORTANTE**: A `service_role` key é secreta! Nunca exponha em frontend ou commits.

## Como Executar

### Desenvolvimento (com logs detalhados)

```bash
npm start
```

O servidor iniciará na porta 3001 (ou a definida em `PORT`):

```
========================================
🚀 API de Validação SSO rodando!
📍 URL: http://localhost:3001
🔑 Supabase URL: https://seu-projeto.supabase.co
========================================
```

### Produção (com PM2)

Para manter o servidor rodando em produção, use PM2:

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar servidor
pm2 start validate-token.js --name "sso-validation"

# Ver logs
pm2 logs sso-validation

# Reiniciar
pm2 restart sso-validation

# Parar
pm2 stop sso-validation

# Configurar para iniciar no boot
pm2 startup
pm2 save
```

## Como Funciona

### Fluxo de Autenticação

1. **Hub VendaSeguro** gera token criptografado ao redirecionar usuário
2. **Frontend** detecta `?token=` na URL via `TokenAutoLogin.tsx`
3. **Frontend** faz POST para `http://localhost:3001` com o token
4. **API Node.js**:
   - Descriptografa o token (AES-256-CBC)
   - Valida com endpoint do Hub
   - Cria/busca usuário no Supabase
   - Gera magic link para autenticação
   - Retorna session URL
5. **Frontend** usa os tokens da session URL para autenticar via `supabase.auth.setSession()`
6. **Usuário** é redirecionado para `/chat` já autenticado

### Estrutura do Token

**Formato Criptografado (na URL):**
```
base64_url_safe(encrypted_data;iv)
```

**Formato Descriptografado:**
```
md5_token|user_id|email_or_nickname
```

**Exemplo:**
```
a1b2c3d4e5f6|123|usuario@exemplo.com
```

## Endpoints

### POST /

**Request:**
```json
{
  "token": "SGVsbG8gV29ybGQ-base64encrypteddata"
}
```

**Response (Sucesso):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-do-usuario",
    "email": "usuario@exemplo.com"
  },
  "session_url": "https://seu-projeto.supabase.co/auth/v1/verify?token=...&type=magiclink"
}
```

**Response (Erro):**
```json
{
  "error": "Invalid token format",
  "status": 401
}
```

## Logs e Depuração

O servidor inclui logs detalhados em cada etapa:

```
========================================
[MAIN] Iniciando validação de token
========================================

[DECRYPT] Token recebido: SGVsbG8...
[DECRYPT] Após replace: SGVsbG8...
[DECRYPT] Decoded data: encrypted_data;iv_string
[DECRYPT] ✅ Token descriptografado: a1b2c3d4|123|user@example.com

[HUB] Chamando endpoint de validação...
[HUB] Resposta do Hub: liberado
[MAIN] ✅ Token validado com sucesso pelo Hub

[MAIN] ✅ Usuário já existe: uuid-123
[MAIN] ✅ Magic link gerado com sucesso
```

### Problemas Comuns

#### Erro: "Invalid token format"
- Token foi modificado na URL
- Formato incorreto (não tem `;` separando dados e IV)
- Token não foi gerado corretamente pelo Hub

#### Erro: "Token validation failed"
- Hub rejeitou o token (pode ter expirado)
- Endpoint do Hub está inacessível
- Token não existe na sessão do Hub

#### Erro: "Failed to create user"
- Credenciais do Supabase incorretas
- Service key sem permissões admin
- Tabela `profiles` não existe

#### Erro: "ECONNREFUSED"
- Servidor não está rodando
- Porta 3001 já está em uso
- Firewall bloqueando a porta

## Segurança

### Criptografia
- **Algoritmo**: AES-256-CBC
- **Chave**: `isw_venda_seguro` (32 bytes, padded)
- **IV**: Aleatório, anexado ao token (16 bytes)

### Validação
- Token sempre validado com endpoint do Hub
- Sessões temporárias (expiram após tempo definido no Hub)
- HTTPS obrigatório em produção

### Proteção de Credenciais
- ⚠️ Nunca commite o arquivo `.env`
- ⚠️ Use `SUPABASE_SERVICE_KEY` apenas no backend
- ⚠️ Em produção, use variáveis de ambiente do servidor

## Integração com Frontend

O componente `TokenAutoLogin.tsx` já está configurado para chamar esta API:

```typescript
const response = await fetch('http://localhost:3001', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ token }),
});
```

### ⚠️ Alteração para Produção

Quando fazer deploy, você precisará atualizar a URL em `TokenAutoLogin.tsx`:

```typescript
// Desenvolvimento
const API_URL = 'http://localhost:3001';

// Produção
const API_URL = 'https://sua-api.dominio.com';
```

Ou melhor ainda, use variável de ambiente:

```typescript
const API_URL = import.meta.env.VITE_SSO_API_URL || 'http://localhost:3001';
```

E adicione no `.env`:

```env
VITE_SSO_API_URL=https://sua-api.dominio.com
```

## Testes

### Teste Automatizado

Com a API rodando, execute em outro terminal:

```bash
npm test
```

Este script testará:
- ✅ Conectividade com a API
- ✅ Headers CORS corretos
- ✅ Resposta JSON válida
- ✅ Códigos de status apropriados

Para testar com um token real do Hub:

```bash
npm test "TOKEN_REAL_AQUI"
```

### Teste Manual (curl)

```bash
# Com token real do Hub
curl -X POST http://localhost:3001 \
  -H "Content-Type: application/json" \
  -d '{"token":"SEU_TOKEN_AQUI"}'
```

### Resposta Esperada

```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "..."
  },
  "session_url": "https://..."
}
```

## Deploy em Produção

### Opção 1: VPS/Servidor Linux

```bash
# 1. Clone o repositório
git clone seu-repositorio.git
cd sunbeam-chat/api

# 2. Instale dependências
npm install @supabase/supabase-js

# 3. Configure .env
nano .env

# 4. Instale PM2
npm install -g pm2

# 5. Inicie o servidor
pm2 start validate-token.js --name sso-validation

# 6. Configure para iniciar no boot
pm2 startup
pm2 save

# 7. Configure Nginx como proxy reverso (opcional)
# /etc/nginx/sites-available/sso-api
server {
    listen 80;
    server_name sua-api.dominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Opção 2: Heroku

```bash
# 1. Criar Procfile na pasta api/
echo "web: node validate-token.js" > Procfile

# 2. Deploy
heroku create sua-app-sso
heroku config:set SUPABASE_URL=...
heroku config:set SUPABASE_SERVICE_KEY=...
git subtree push --prefix api heroku main
```

### Opção 3: Railway/Render

1. Conecte o repositório
2. Configure build command: `npm install @supabase/supabase-js`
3. Configure start command: `node api/validate-token.js`
4. Adicione variáveis de ambiente no painel

## Monitoramento

### Ver Logs em Tempo Real

```bash
# Com PM2
pm2 logs sso-validation --lines 100

# Com Node direto
node validate-token.js
```

### Métricas do PM2

```bash
pm2 monit
```

## Suporte

Para problemas com SSO:
1. Verifique logs do servidor Node.js
2. Verifique console do browser (F12)
3. Teste endpoint do Hub diretamente
4. Verifique formato do token
5. Confirme credenciais do Supabase

## Referências

- [Supabase Auth API](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Node.js Crypto](https://nodejs.org/api/crypto.html)
- [Hub VendaSeguro SSO](../SSO_SETUP.md)
