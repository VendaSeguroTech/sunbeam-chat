# SSO via Token Exchange - Arquitetura JWT RS256

## 📋 Visão Geral

Sistema de **Single Sign-On (SSO)** via **Token Exchange** entre Hub VendaSeguro e IA Experta.

**Diferencial desta arquitetura:**
- ✅ IA **NUNCA** descriptografa o token diretamente
- ✅ IA **NUNCA** acessa banco de dados do Hub
- ✅ Troca segura de token por JWT de curta duração
- ✅ Validação criptográfica (RS256) com chaves assimétricas
- ✅ Cookie HttpOnly Secure SameSite
- ✅ React não processa tokens

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│  PASSO 1: Usuário clica no card da IA no Hub                   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Hub gera token criptografado AES-256-CBC
                            │ Redireciona:
                            ▼
    ┌──────────────────────────────────────────────────────────┐
    │  https://ia.vendaseguro.com.br/?sso=1&token=XYZ&ts=123   │
    └──────────────────────────────────────────────────────────┘
                            │
                            │ Frontend detecta parâmetros SSO
                            │ SSORedirect.tsx redireciona para:
                            ▼
    ┌──────────────────────────────────────────────────────────┐
    │  http://localhost:3002/sso/callback?sso=1&token=XYZ&ts=123│
    └──────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┴────────────────────────────────────┐
│  PASSO 2: Backend faz exchange com Hub                         │
└────────────────────────────────────────────────────────────────┘
                            │
                            │ POST /wp-json/isw-sso/v1/exchange
                            │ { "token": "XYZ" }
                            ▼
    ┌──────────────────────────────────────────────────────────┐
    │  Hub WordPress                                            │
    │  1. Descriptografa token                                  │
    │  2. Valida na tabela ISW_sso                              │
    │  3. Verifica expiração (3 horas)                          │
    │  4. Gera JWT RS256 (10 minutos):                          │
    │     {                                                     │
    │       iss: "hub.vendaseguro.com.br",                      │
    │       aud: "ia.vendaseguro.com.br",                       │
    │       sub: "user_id",                                     │
    │       email: "user@example.com",                          │
    │       nickname: "username",                               │
    │       iat: 1234567890,                                    │
    │       exp: 1234568490                                     │
    │     }                                                     │
    │  5. Assina com chave privada RS256                        │
    │  6. Retorna: { "ok": true, "jwt": "eyJ..." }              │
    └──────────────────────────────────────────────────────────┘
                            │
                            │ Response: { ok: true, jwt: "eyJ..." }
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  PASSO 3: Backend valida JWT do Hub                           │
└───────────────────────────────────────────────────────────────┘
                            │
                            │ sso-server.js valida:
                            │ 1. Assinatura RS256 com chave pública
                            │ 2. Expiração (exp)
                            │ 3. Audience (aud)
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  PASSO 4: Backend cria/busca usuário no Supabase              │
└───────────────────────────────────────────────────────────────┘
                            │
                            │ Se usuário não existe:
                            │ - supabase.auth.admin.createUser()
                            │ - INSERT INTO profiles
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  PASSO 5: Backend cria cookie de sessão                       │
└───────────────────────────────────────────────────────────────┘
                            │
                            │ Cookie vs_session:
                            │ - JWT próprio (HS256) com 2 horas
                            │ - HttpOnly (JavaScript não acessa)
                            │ - Secure (HTTPS only em produção)
                            │ - SameSite=Lax (proteção CSRF)
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  PASSO 6: Redirect para /chat com cookie                      │
└───────────────────────────────────────────────────────────────┘
                            │
                            │ Location: http://localhost:8080/chat
                            │ Set-Cookie: vs_session=eyJ...; HttpOnly; Secure; SameSite=Lax
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  PASSO 7: Frontend chama GET /api/me                          │
└───────────────────────────────────────────────────────────────┘
                            │
                            │ fetch('/api/me', { credentials: 'include' })
                            │ Cookie vs_session enviado automaticamente
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  PASSO 8: Backend valida cookie e retorna usuário             │
└───────────────────────────────────────────────────────────────┘
                            │
                            │ Response: { ok: true, user: {...} }
                            ▼
┌───────────────────────────────────────────────────────────────┐
│  ✅ Usuário logado e autenticado!                             │
└───────────────────────────────────────────────────────────────┘
```

## 📁 Arquivos da Implementação

### WordPress (Hub)

| Arquivo | Descrição |
|---------|-----------|
| `wordpress/isw-sso-exchange-endpoint.php` | Plugin com endpoint de exchange |
| `wordpress/generate-rsa-keys.sh` | Script bash para gerar par de chaves RSA |
| `wordpress/generate-rsa-keys.ps1` | Script PowerShell (Windows) |
| `wp-content/keys/isw-sso-private.pem` | Chave privada RSA (nunca compartilhar!) |

### Backend Node.js (IA)

| Arquivo | Descrição |
|---------|-----------|
| `api/sso-server.js` | **Servidor principal** com rotas SSO |
| `api/keys/isw-sso-public.pem` | Chave pública do Hub (para validar JWT) |
| `api/sso.env.example` | Template de variáveis de ambiente |

### Frontend React (IA)

| Arquivo | Descrição |
|---------|-----------|
| `src/components/auth/SSORedirect.tsx` | Detecta SSO e redireciona para backend |
| `src/components/auth/ProtectedRouteSSO.tsx` | Proteção de rotas via cookie |
| `src/hooks/useAuth.ts` | Hook para verificar autenticação |
| `src/pages/LoginSSO.tsx` | Página de login com CTA para o Hub |

## 🔐 Segurança

### Chaves Criptográficas

**Hub (WordPress):**
- **Chave Privada RSA**: Assina JWT (10 min de validade)
- **Localização**: `wp-content/keys/isw-sso-private.pem`
- **⚠️ NUNCA commitar ou compartilhar**

**IA (Node.js):**
- **Chave Pública RSA**: Valida assinatura do JWT do Hub
- **Localização**: `api/keys/isw-sso-public.pem`
- **✅ Pode ser compartilhada (é pública)**

- **Secret HS256**: Assina cookie de sessão próprio (2h)
- **Variável**: `APP_JWT_SECRET`
- **⚠️ Mínimo 32 caracteres aleatórios**

### Cookies

```
vs_session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...;
  Path=/;
  HttpOnly;           ← JavaScript não consegue ler
  Secure;             ← Apenas HTTPS (produção)
  SameSite=Lax;       ← Proteção CSRF
  Max-Age=7200        ← 2 horas
```

### TTLs (Time To Live)

| Item | Duração | Motivo |
|------|---------|--------|
| Token criptografado (Hub) | 3 horas | Tabela `ISW_sso` |
| JWT do Hub (exchange) | 10 minutos | Janela curta para exchange |
| Cookie vs_session (IA) | 2 horas | Sessão ativa do usuário |

### CORS

```javascript
Access-Control-Allow-Origin: https://ia.vendaseguro.com.br
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, OPTIONS
```

## 🚀 Setup e Deploy

### 1. Gerar Par de Chaves RSA

**Linux/Mac:**
```bash
cd wordpress
bash generate-rsa-keys.sh
```

**Windows (PowerShell):**
```powershell
cd wordpress
.\generate-rsa-keys.ps1
```

Serão criados:
- `isw-sso-private.pem` → Copiar para `wp-content/keys/` no Hub
- `isw-sso-public.pem` → Copiar para `api/keys/` na IA

### 2. Configurar WordPress (Hub)

```bash
# 1. Copiar plugin
cp wordpress/isw-sso-exchange-endpoint.php /caminho/do/wordpress/wp-content/plugins/

# 2. Ativar plugin via WP Admin

# 3. Criar pasta de chaves
mkdir wp-content/keys
chmod 700 wp-content/keys

# 4. Copiar chave privada
cp isw-sso-private.pem wp-content/keys/
chmod 600 wp-content/keys/isw-sso-private.pem

# 5. Ou adicionar no wp-config.php:
# define('ISW_SSO_PRIVATE_KEY', file_get_contents(__DIR__ . '/keys/isw-sso-private.pem'));
```

### 3. Configurar Backend Node.js (IA)

```bash
cd api

# 1. Criar pasta de chaves
mkdir keys

# 2. Copiar chave pública do Hub
cp ../wordpress/isw-sso-public.pem keys/

# 3. Configurar variáveis de ambiente
cp sso.env.example .env.sso

# 4. Editar .env.sso
nano .env.sso

# 5. Instalar dependências
npm install

# 6. Iniciar servidor
npm run start:sso
```

**Variáveis obrigatórias em `.env.sso`:**
```env
PORT=3002
HUB_EXCHANGE_URL=https://hub.vendaseguro.com.br/wp-json/isw-sso/v1/exchange
HUB_JWT_PUBLIC_KEY_PATH=./keys/isw-sso-public.pem
APP_BASE_URL=http://localhost:8080
APP_JWT_SECRET=<GERAR_COM: openssl rand -base64 32>
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=<SERVICE_ROLE_KEY>
NODE_ENV=development
```

### 4. Configurar Frontend React (IA)

```bash
# 1. Atualizar .env
echo "VITE_SSO_API_URL=http://localhost:3002" >> .env

# 2. Iniciar dev server
npm run dev
```

## 🧪 Testando o Fluxo

### Teste 1: Exchange Endpoint (Hub)

```bash
# Obter token criptografado do Hub (fazer login e inspecionar URL do card)
TOKEN="<TOKEN_DO_HUB>"

# Testar endpoint de exchange
curl -X POST https://hub.vendaseguro.com.br/wp-json/isw-sso/v1/exchange \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}"

# Resposta esperada:
# { "ok": true, "jwt": "eyJhbGc..." }
```

### Teste 2: Callback SSO (IA Backend)

```bash
# Com token real do Hub
TOKEN="<TOKEN_DO_HUB>"

# Acessar no navegador (para testar redirect e cookie):
http://localhost:3002/sso/callback?sso=1&token=$TOKEN&ts=1234567890

# Deve:
# 1. Fazer exchange com Hub
# 2. Validar JWT
# 3. Criar usuário no Supabase (se não existir)
# 4. Criar cookie vs_session
# 5. Redirecionar para http://localhost:8080/chat
```

### Teste 3: API /me (IA Backend)

```bash
# Após ter feito login via callback (com cookie)
curl -X GET http://localhost:3002/api/me \
  --cookie "vs_session=<COOKIE_VALOR>"

# Resposta esperada:
# { "ok": true, "user": { "id": "...", "email": "...", "nickname": "..." } }
```

### Teste 4: Fluxo Completo

1. Fazer login no Hub: https://hub.vendaseguro.com.br
2. Clicar no card da IA Experta
3. Verificar redirect para: `https://ia.vendaseguro.com.br/?sso=1&token=...`
4. Frontend redireciona para: `http://localhost:3002/sso/callback?sso=1&token=...`
5. Backend processa e redireciona para: `http://localhost:8080/chat`
6. Frontend chama `/api/me` automaticamente
7. ✅ Usuário logado na IA!

## 📊 Contratos de API

### Exchange (Hub → IA)

**Request:**
```http
POST /wp-json/isw-sso/v1/exchange HTTP/1.1
Host: hub.vendaseguro.com.br
Content-Type: application/json

{
  "token": "<ENCRYPTED_TOKEN>"
}
```

**Response (Sucesso):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "ok": true,
  "jwt": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodWIudmVuZGFzZWd1cm8uY29tLmJyIiwiYXVkIjoiaWEudmVuZGFzZWd1cm8uY29tLmJyIiwic3ViIjoiMTIzIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwibmlja25hbWUiOiJ1c2VybmFtZSIsImlhdCI6MTIzNDU2Nzg5MCwiZXhwIjoxMjM0NTY4NDkwfQ.signature"
}
```

**Response (Erro):**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "ok": false,
  "error": "invalid_or_expired"
}
```

### Callback SSO (Frontend → Backend IA)

**Request:**
```http
GET /sso/callback?sso=1&token=<ENCRYPTED>&ts=<TIMESTAMP> HTTP/1.1
Host: localhost:3002
```

**Response:**
```http
HTTP/1.1 302 Found
Location: http://localhost:8080/chat
Set-Cookie: vs_session=eyJ...; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7200
```

### /api/me (Frontend → Backend IA)

**Request:**
```http
GET /api/me HTTP/1.1
Host: localhost:3002
Cookie: vs_session=eyJ...
```

**Response (Autenticado):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "ok": true,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "nickname": "username"
  }
}
```

**Response (Não Autenticado):**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "ok": false,
  "error": "not_authenticated"
}
```

## 🔧 Troubleshooting

### "Invalid JWT signature"

**Causa**: Chave pública não corresponde à chave privada usada pelo Hub

**Solução**:
1. Verificar se você copiou a chave pública correta
2. Regenerar par de chaves e atualizar em ambos os lados
3. Verificar se não há quebras de linha ou espaços extras

### "Token validation failed with Hub"

**Causa**: Hub rejeitou o token (expirado ou inválido)

**Solução**:
1. Verificar se token tem menos de 3 horas
2. Confirmar que token está na tabela `ISW_sso` do Hub
3. Testar endpoint de exchange diretamente (curl)

### "User not created"

**Causa**: `SUPABASE_SERVICE_KEY` incorreta ou sem permissões

**Solução**:
1. Confirmar que está usando `service_role` key, não `anon` key
2. Verificar permissões da tabela `profiles`
3. Checar logs do Supabase

### Cookie não é enviado

**Causa**: Problema com CORS ou SameSite

**Solução**:
1. Confirmar `credentials: 'include'` no fetch do React
2. Verificar CORS headers no backend
3. Em desenvolvimento, usar `NODE_ENV=development` (desabilita Secure flag)

## 📚 Documentação Adicional

- **Setup Rápido**: `SSO_TOKEN_EXCHANGE_QUICKSTART.md`
- **Diagramas**: `SSO_ARCHITECTURE.txt`
- **Variáveis de Ambiente**: `api/sso.env.example`

## ✅ Checklist de Deploy

- [ ] Par de chaves RSA gerado
- [ ] Plugin instalado no WordPress
- [ ] Chave privada configurada no Hub
- [ ] Endpoint `/wp-json/isw-sso/v1/exchange` acessível
- [ ] Backend Node.js configurado com chave pública
- [ ] Variáveis de ambiente configuradas
- [ ] Frontend configurado com `VITE_SSO_API_URL`
- [ ] Teste de exchange bem-sucedido
- [ ] Teste de callback bem-sucedido
- [ ] Teste de `/api/me` bem-sucedido
- [ ] Fluxo completo testado

---

**Versão**: 2.0.0 (Token Exchange)
**Data**: 2025-10-23
**Status**: Pronto para testes
