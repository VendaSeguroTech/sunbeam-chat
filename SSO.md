# 🔐 SSO - Single Sign-On com Hub VendaSeguro

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Fluxo de Autenticação](#fluxo-de-autenticação)
4. [Componentes](#componentes)
5. [Configuração](#configuração)
6. [Deploy](#deploy)
7. [Troubleshooting](#troubleshooting)
8. [Segurança](#segurança)

---

## 🎯 Visão Geral

O sistema de autenticação da **IA Experta** utiliza **SSO (Single Sign-On)** integrado com o **Hub VendaSeguro** e **Supabase Auth**.

### Requisitos

- ✅ Usuários fazem login no Hub VendaSeguro
- ✅ Clicam no card "IA Experta" para acessar a aplicação
- ✅ Token SSO é validado e usuário é autenticado automaticamente
- ✅ Sessão Supabase é criada sem necessidade de senha
- ✅ Usuários não cadastrados são redirecionados de volta ao Hub
- ✅ Acesso direto sem autenticação redireciona para o Hub
- ✅ Rota `/login` mantida para uso interno/dev

---

## 🏗️ Arquitetura

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────┐
│                    Hub VendaSeguro                          │
│  - Gerencia usuários (WordPress)                            │
│  - Gera tokens SSO criptografados (AES-256-CBC)             │
│  - Valida tokens via isw_validar_usuario.php                │
└──────────────────┬──────────────────────────────────────────┘
                   │ Token SSO (encrypted)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend SSO (Node.js - Port 3002)              │
│  - Valida token com Hub                                     │
│  - Descriptografa token para obter email                    │
│  - Busca usuário no Supabase Auth                           │
│  - Cria sessão Supabase (recovery token)                    │
│  - Cria cookies HttpOnly (vs_session, sb-access-token)      │
└──────────────────┬──────────────────────────────────────────┘
                   │ Recovery Token + Cookies
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend React (Vite + TypeScript)             │
│  - Processa recovery token via verifyOtp()                  │
│  - Cria sessão Supabase no cliente                          │
│  - Carrega perfil do usuário                                │
│  - Redireciona para /chat                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Autenticação

### 1. Usuário clica no card da IA no Hub

**URL gerada pelo Hub:**
```
https://experta.vendaseguro.com.br/?sso=1&token=<TOKEN_ENCRYPTED>&ts=<TIMESTAMP>
```

**Formato do token descriptografado:**
```
md5_hash|user_id|email@exemplo.com
```

---

### 2. Frontend detecta parâmetros SSO

**Componente:** `src/components/auth/SSORedirect.tsx`

```typescript
// Detecta parâmetros ?sso=1&token=XXX
if (sso && token) {
  // Redireciona para backend
  window.location.href = `${API_URL}/sso/callback?sso=${sso}&token=${token}&ts=${ts}`;
}
```

**Redireciona para:**
```
https://experta.vendaseguro.com.br/sso/callback?sso=1&token=XXX&ts=123
```

> **Nota:** Em produção, o Nginx faz proxy de `/sso/*` para `http://localhost:3002`

---

### 3. Backend valida token e cria sessão

**Arquivo:** `api/sso-server-simple.js`

**Rota:** `GET /sso/callback`

#### Passo a passo:

1. **Valida token com Hub**
   ```javascript
   POST https://hub.vendaseguro.com.br/isw_api/isw_validar_usuario.php
   Body: token=<ENCRYPTED_TOKEN>
   Response: "liberado" ou "negado"
   ```

2. **Descriptografa token**
   ```javascript
   // AES-256-CBC com chave 'isw_venda_seguro'
   const decrypted = decryptToken(token, 'isw_venda_seguro');
   // Resultado: "md5|67|andrezera.dev@gmail.com"
   const [md5, userId, email] = decrypted.split('|');
   ```

3. **Busca usuário no Supabase Auth**
   ```javascript
   const { data: { users } } = await supabase.auth.admin.listUsers();
   const user = users.find(u => u.email === email);
   ```

4. **Usuário não encontrado? → Redireciona para Hub**
   ```javascript
   if (!user) {
     res.writeHead(302, {
       'Location': 'https://hub.vendaseguro.com.br/?error=not_registered&app=experta'
     });
     res.end();
     return;
   }
   ```

5. **Cria sessão Supabase sem senha**
   ```javascript
   const { data } = await supabase.auth.admin.generateLink({
     type: 'recovery',
     email: user.email
   });
   // Extrai recovery token da URL gerada
   ```

6. **Cria cookies HttpOnly**
   ```javascript
   Set-Cookie: sb-access-token=XXX; HttpOnly; Secure; SameSite=Lax; Max-Age=7200
   Set-Cookie: sb-refresh-token=YYY; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
   Set-Cookie: vs_session=ZZZ; HttpOnly; Secure; SameSite=Lax; Max-Age=7200
   ```

7. **Redireciona para frontend com recovery token**
   ```
   Location: https://experta.vendaseguro.com.br/chat#recovery_token=XXX&type=recovery
   ```

---

### 4. Frontend processa recovery token

**Componente:** `src/components/auth/SupabaseAuthHandler.tsx`

```typescript
// Detecta hash na URL
const hash = window.location.hash; // #recovery_token=XXX&type=recovery
const params = new URLSearchParams(hash.substring(1));
const recoveryToken = params.get('recovery_token');

// Verifica token com Supabase
const { data, error } = await supabase.auth.verifyOtp({
  token_hash: recoveryToken,
  type: 'recovery'
});

// Limpa hash da URL
window.history.replaceState(null, '', location.pathname);
```

**Resultado:**
- ✅ Sessão Supabase criada no cliente
- ✅ `supabase.auth.getSession()` retorna usuário autenticado
- ✅ Perfil carregado da tabela `profiles`

---

### 5. Hook useAuth verifica autenticação

**Arquivo:** `src/hooks/useAuth.ts`

**Ordem de verificação:**

1. **Primeiro: Sessão Supabase**
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   if (session) {
     return { user: session.user, isAuthenticated: true };
   }
   ```

2. **Fallback: Cookie SSO**
   ```typescript
   const response = await fetch('/api/me', { credentials: 'include' });
   if (response.ok && data.user) {
     return { user: data.user, isAuthenticated: true };
   }
   ```

---

### 6. Rotas protegidas verificam autenticação

**Componente:** `src/components/auth/ProtectedRouteSSO.tsx`

```typescript
const { user, loading, isAuthenticated } = useAuth();

if (loading) {
  return <LoadingSpinner />;
}

if (!isAuthenticated) {
  // Redireciona para Hub para autenticação
  window.location.href = 'https://hub.vendaseguro.com.br';
  return null;
}

return children; // Renderiza ChatLayout
```

---

## 🧩 Componentes

### Backend

#### `api/sso-server-simple.js`

**Rotas:**

| Rota | Método | Descrição |
|------|--------|-----------|
| `/sso/callback` | GET | Valida token SSO, cria sessão Supabase, redireciona |
| `/api/me` | GET | Verifica sessão via cookie `vs_session` |
| `/api/logout` | POST | Invalida cookie de sessão |

**Funções principais:**

```javascript
// Descriptografar token do Hub (AES-256-CBC)
function decryptToken(data, key)

// Validar token com Hub
function callHubValidate(token)

// Buscar usuário no Supabase Auth
async function findAuthUserByEmail(email)

// Criar sessão Supabase sem senha
async function createSupabaseSession(userId)

// Criar JWT para cookie vs_session
function createJWT(payload, secret)

// Validar JWT do cookie
function verifySessionJWT(token, secret)
```

---

### Frontend

#### `src/components/auth/SSORedirect.tsx`

**Responsabilidade:** Detectar parâmetros SSO e redirecionar para backend

```typescript
// URL de entrada: /?sso=1&token=XXX&ts=123
// Redireciona para: /sso/callback?sso=1&token=XXX&ts=123
```

---

#### `src/components/auth/SupabaseAuthHandler.tsx`

**Responsabilidade:** Processar tokens Supabase do hash da URL

**Suporta dois formatos:**

1. **Recovery Token:**
   ```
   #recovery_token=XXX&type=recovery
   → supabase.auth.verifyOtp({ token_hash, type: 'recovery' })
   ```

2. **Access/Refresh Tokens diretos:**
   ```
   #access_token=XXX&refresh_token=YYY&type=recovery
   → supabase.auth.setSession({ access_token, refresh_token })
   ```

---

#### `src/hooks/useAuth.ts`

**Responsabilidade:** Hook centralizado de autenticação

**Retorna:**
```typescript
{
  user: User | null,
  loading: boolean,
  error: string | null,
  isAuthenticated: boolean,
  logout: () => Promise<void>
}
```

**Estratégia híbrida:**
1. Verifica sessão Supabase primeiro
2. Se não houver, verifica cookie SSO via `/api/me`

---

#### `src/components/auth/ProtectedRouteSSO.tsx`

**Responsabilidade:** Proteger rotas que requerem autenticação

```typescript
// Rotas protegidas:
/chat       → Requer autenticação SSO
/admin      → Requer autenticação + role admin
```

**Se não autenticado:**
```typescript
window.location.href = 'https://hub.vendaseguro.com.br';
```

---

#### `src/App.tsx` - Componente `Root`

**Responsabilidade:** Decidir rota inicial baseado em autenticação

```typescript
// Cenário 1: Parâmetros SSO presentes
if (sso && token) → /sso/redirect

// Cenário 2: Usuário autenticado
if (isAuthenticated) → /chat

// Cenário 3: Não autenticado
else → Redireciona para Hub
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

#### Backend (`api/.env.sso`)

```env
# Server Port
PORT=3002

# Hub Configuration
HUB_VALIDATE_URL=https://hub.vendaseguro.com.br/isw_api/isw_validar_usuario.php

# App Configuration
APP_BASE_URL=https://experta.vendaseguro.com.br

# JWT Secret para cookie vs_session
APP_JWT_SECRET=<GERAR_SECRET_ALEATORIO>

# Supabase Configuration
SUPABASE_URL=https://supabase.vendaseguro.tech
SUPABASE_SERVICE_KEY=<SERVICE_ROLE_KEY>

# Environment
NODE_ENV=production
```

**Gerar `APP_JWT_SECRET`:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

#### Frontend (`.env` ou Vite config)

```env
# SSO API URL (vazio em produção = mesmo domínio)
VITE_SSO_API_URL=

# Supabase (público)
VITE_SUPABASE_URL=https://supabase.vendaseguro.tech
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
```

---

### Nginx Configuração

**Arquivo:** `/etc/nginx/sites-available/experta.vendaseguro.com.br`

```nginx
server {
  server_name experta.vendaseguro.com.br;

  root /var/www/html/experta.vendaseguro.com.br/dist;
  index index.html;

  # Frontend React (arquivos estáticos)
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Backend SSO (proxy para Node.js porta 3002)
  location /sso/ {
    proxy_pass http://localhost:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }

  # Backend API (proxy para Node.js porta 3002)
  location /api/ {
    proxy_pass http://localhost:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }

  listen 443 ssl;
  ssl_certificate /etc/letsencrypt/live/experta.vendaseguro.com.br/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/experta.vendaseguro.com.br/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
  if ($host = experta.vendaseguro.com.br) {
    return 301 https://$host$request_uri;
  }

  listen 80;
  server_name experta.vendaseguro.com.br;
  return 404;
}
```

**Comandos:**

```bash
# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

---

## 🚀 Deploy

### 1. Build do Frontend

```bash
cd /path/to/sunbeam-chat
npm run build
```

**Resultado:** Arquivos gerados em `dist/`

---

### 2. Deploy Backend SSO

```bash
# Copiar backend para VPS
scp api/sso-server-simple.js root@38.242.138.127:/var/www/html/experta.vendaseguro.com.br/experta_backend/

# Copiar .env
scp api/.env.sso root@38.242.138.127:/var/www/html/experta.vendaseguro.com.br/experta_backend/

# Conectar na VPS
ssh root@38.242.138.127

# Instalar dependências (primeira vez)
cd /var/www/html/experta.vendaseguro.com.br/experta_backend
npm install dotenv @supabase/supabase-js

# Iniciar com PM2 (primeira vez)
pm2 start sso-server-simple.js --name sso-server-simple

# Ou reiniciar se já estiver rodando
pm2 restart sso-server-simple

# Verificar logs
pm2 logs sso-server-simple --lines 50

# Salvar configuração PM2
pm2 save
```

---

### 3. Deploy Frontend

```bash
# Copiar dist/ para VPS
scp -r dist/* root@38.242.138.127:/var/www/html/experta.vendaseguro.com.br/dist/

# Verificar permissões
ssh root@38.242.138.127 "chown -R www-data:www-data /var/www/html/experta.vendaseguro.com.br/dist"
```

---

### 4. Verificar Deploy

```bash
# Testar backend
curl https://experta.vendaseguro.com.br/api/me

# Deve retornar:
# {"ok":false,"error":"no_session"}
```

**Testar SSO:**
1. Acesse: https://hub.vendaseguro.com.br
2. Faça login
3. Clique no card "IA Experta"
4. Verifique se é redirecionado para `/chat` autenticado

---

## 🐛 Troubleshooting

### Problema: Usuário não autenticado após clicar no card

**Verificar:**

1. **Backend está rodando?**
   ```bash
   pm2 list
   # Deve mostrar sso-server-simple online
   ```

2. **Logs do backend:**
   ```bash
   pm2 logs sso-server-simple --lines 100
   ```

   **Procure por:**
   - `[SSO] Token validado pelo Hub` ✅
   - `[SUPABASE AUTH] ✅ Usuário encontrado` ✅
   - `[SUPABASE SESSION] ✅ Tokens gerados` ✅

3. **Console do navegador (F12):**
   ```
   [SupabaseAuthHandler] ✅ Sessão criada via recovery token!
   [AUTH] ✅ Sessão Supabase encontrada: email@exemplo.com
   ```

---

### Problema: Token expirado

**Sintoma:** Backend retorna 401 ou redireciona para Hub

**Causa:** Token SSO tem validade de 3 horas

**Solução:**
1. Fazer logout no Hub
2. Fazer login novamente
3. Clicar no card da IA

---

### Problema: "Usuário não cadastrado"

**Sintoma:** Redirecionado de volta ao Hub com `?error=not_registered`

**Causa:** Email do Hub não existe no Supabase Auth

**Solução:**
1. Criar usuário no Supabase Dashboard
2. Ou criar via API usando `supabase.auth.admin.createUser()`

```sql
-- Verificar se usuário existe
SELECT * FROM auth.users WHERE email = 'usuario@exemplo.com';

-- Se não existir, criar via Dashboard ou API
```

---

### Problema: Recovery token inválido

**Sintoma:** Erro no console: `[SupabaseAuthHandler] ❌ Erro ao verificar recovery token`

**Causa:** Token expirou ou formato inválido

**Debug:**
```bash
# Ver logs do backend
pm2 logs sso-server-simple --lines 50

# Procurar por:
[SUPABASE SESSION] Link gerado: http://...
```

**Solução:**
1. Verificar se `generateLink` está retornando token válido
2. Testar fluxo novamente com token fresh

---

### Problema: CORS errors

**Sintoma:** `Access-Control-Allow-Origin` error no console

**Verificar:**

1. **Backend CORS config (`sso-server-simple.js`):**
   ```javascript
   res.setHeader('Access-Control-Allow-Origin', APP_BASE_URL);
   res.setHeader('Access-Control-Allow-Credentials', 'true');
   ```

2. **APP_BASE_URL correto em `.env.sso`:**
   ```env
   APP_BASE_URL=https://experta.vendaseguro.com.br
   ```

---

### Problema: Cookies não sendo enviados

**Sintoma:** `/api/me` retorna `no_session` mas usuário deveria estar autenticado

**Verificar:**

1. **Cookies no DevTools (F12 → Application → Cookies):**
   - `vs_session` ✅
   - `sb-access-token` ✅
   - `sb-refresh-token` ✅

2. **SameSite e Secure flags:**
   ```javascript
   // Produção: HttpOnly; Secure; SameSite=Lax
   // Dev: HttpOnly; SameSite=Lax (sem Secure)
   ```

3. **Domínio do cookie:**
   - Cookie deve ser do domínio `experta.vendaseguro.com.br`
   - Não pode ser `localhost` em produção

---

## 🔒 Segurança

### Medidas Implementadas

1. **✅ Tokens criptografados (AES-256-CBC)**
   - Token nunca trafega em texto plano
   - Chave compartilhada entre Hub e IA

2. **✅ Cookies HttpOnly**
   - JavaScript não pode acessar cookies
   - Proteção contra XSS

3. **✅ Cookies Secure (HTTPS only)**
   - Cookies só enviados em conexões HTTPS
   - Proteção contra man-in-the-middle

4. **✅ SameSite=Lax**
   - Proteção contra CSRF
   - Cookies não enviados em requisições cross-site

5. **✅ Validação dupla de tokens**
   - Backend valida com Hub (`isw_validar_usuario.php`)
   - Supabase valida recovery token

6. **✅ Sessões com expiração**
   - Access token: 2 horas
   - Refresh token: 7 dias
   - Cookie vs_session: 2 horas

7. **✅ Usuários não cadastrados rejeitados**
   - Whitelist de emails no Supabase Auth
   - Redirecionamento automático para Hub

---

### Boas Práticas

#### ❌ NUNCA faça:

- Expor `SUPABASE_SERVICE_KEY` no frontend
- Processar tokens no JavaScript do cliente
- Enviar senhas via SSO
- Logar tokens completos em produção
- Usar HTTP em produção (sempre HTTPS)

#### ✅ SEMPRE faça:

- Validar tokens no backend
- Usar cookies HttpOnly para sessões
- Verificar origem das requisições (CORS)
- Implementar rate limiting no backend SSO
- Monitorar logs de autenticação falha
- Rotacionar `APP_JWT_SECRET` periodicamente

---

### Auditoria de Segurança

**Checklist:**

- [ ] Todos os tokens trafegam criptografados?
- [ ] Cookies têm flags HttpOnly + Secure + SameSite?
- [ ] HTTPS ativo com certificado válido?
- [ ] Service keys não expostas no frontend?
- [ ] Rate limiting configurado no backend?
- [ ] Logs de autenticação sendo monitorados?
- [ ] Usuários não cadastrados bloqueados?
- [ ] CORS configurado corretamente?
- [ ] Tokens expiram corretamente?
- [ ] Logout invalida todas as sessões?

---

## 📊 Monitoramento

### Logs do Backend

```bash
# Ver logs em tempo real
pm2 logs sso-server-simple

# Ver últimas 100 linhas
pm2 logs sso-server-simple --lines 100

# Filtrar apenas erros
pm2 logs sso-server-simple --err
```

**Logs importantes:**

```
[SSO] ✅ Token validado pelo Hub
[SUPABASE AUTH] ✅ Usuário encontrado: email@exemplo.com
[SUPABASE SESSION] ✅ Tokens gerados via recovery link
[SSO] Redirecionando para /chat...
[API /me] ✅ Usuário autenticado: email@exemplo.com
```

---

### Métricas para Monitorar

1. **Taxa de autenticação bem-sucedida**
   - Meta: >95%
   - Alerta: <90%

2. **Tempo médio de autenticação**
   - Meta: <2s
   - Alerta: >5s

3. **Taxa de tokens expirados**
   - Meta: <5%
   - Alerta: >10%

4. **Usuários não cadastrados rejeitados**
   - Monitorar crescimento
   - Alertar suporte se >10/dia

---

## 📝 Changelog

### v2.0.0 - 2025-01-27
- ✅ Implementado SSO com Supabase Auth
- ✅ Recovery tokens via `generateLink`
- ✅ Auto-redirect para Hub se não autenticado
- ✅ Cookies HttpOnly + Secure
- ✅ Documentação completa

### v1.0.0 - 2025-01-20
- ✅ SSO básico com cookie `vs_session`
- ✅ Validação de token com Hub
- ✅ Descriptografia AES-256-CBC

---

## 🆘 Suporte

**Problemas com SSO?**

1. Verificar logs do backend: `pm2 logs sso-server-simple`
2. Verificar console do navegador (F12)
3. Testar com Ctrl+Shift+R (hard reload)
4. Verificar se usuário existe no Supabase
5. Contatar equipe de desenvolvimento

**Contatos:**

- Dev: André Zera (@andrezera)
- Infra: [email do responsável]
- Suporte: suporte@vendaseguro.com.br

---

## 📚 Referências

- [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-api)
- [WordPress SSO Plugin](https://hub.vendaseguro.com.br/wp-content/plugins/plugin-sso/)
- [Node.js Crypto (AES-256-CBC)](https://nodejs.org/api/crypto.html)
- [MDN Web Docs - Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)

---

**Última atualização:** 2025-01-27
**Versão:** 2.0.0
**Autor:** Claude Code + André Zera
