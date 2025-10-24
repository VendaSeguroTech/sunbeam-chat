# SSO Token Exchange - Guia Rápido

## ⚡ Setup em 10 Minutos

### 1️⃣ Gerar Chaves RSA (2 min)

**Windows (PowerShell):**
```powershell
cd wordpress
.\generate-rsa-keys.ps1
```

**Linux/Mac:**
```bash
cd wordpress
bash generate-rsa-keys.sh
```

✅ Você terá:
- `isw-sso-private.pem` (para o Hub)
- `isw-sso-public.pem` (para a IA)

### 2️⃣ Configurar Hub WordPress (3 min)

```bash
# 1. Instalar plugin
cp wordpress/isw-sso-exchange-endpoint.php /var/www/html/wp-content/plugins/

# 2. Ativar plugin no WP Admin

# 3. Copiar chave privada
mkdir -p /var/www/html/wp-content/keys
cp isw-sso-private.pem /var/www/html/wp-content/keys/
chmod 600 /var/www/html/wp-content/keys/isw-sso-private.pem
```

### 3️⃣ Configurar Backend IA (3 min)

```bash
cd api

# 1. Criar pasta de chaves
mkdir keys

# 2. Copiar chave pública
cp ../wordpress/isw-sso-public.pem keys/

# 3. Configurar .env
cp sso.env.example .env.sso

# 4. Editar variáveis (IMPORTANTE!)
nano .env.sso
```

**Editar `.env.sso`:**
```env
PORT=3002
HUB_EXCHANGE_URL=https://hub.vendaseguro.com.br/wp-json/isw-sso/v1/exchange
HUB_JWT_PUBLIC_KEY_PATH=./keys/isw-sso-public.pem
APP_BASE_URL=http://localhost:8080
APP_JWT_SECRET=<GERAR: openssl rand -base64 32>
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=<SUA_SERVICE_ROLE_KEY>
NODE_ENV=development
```

```bash
# 5. Instalar dependências
npm install

# 6. Iniciar servidor
npm run start:sso
```

### 4️⃣ Configurar Frontend (2 min)

```bash
# 1. Adicionar variável de ambiente
echo "VITE_SSO_API_URL=http://localhost:3002" >> .env

# 2. Iniciar dev server
npm run dev
```

## 🧪 Testar (5 min)

### Teste 1: Exchange Endpoint

```bash
# Fazer login no Hub, inspecionar URL do card da IA, copiar token
TOKEN="<TOKEN_DO_HUB>"

curl -X POST https://hub.vendaseguro.com.br/wp-json/isw-sso/v1/exchange \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}"

# Esperado: { "ok": true, "jwt": "eyJ..." }
```

### Teste 2: Fluxo Completo

1. Login no Hub: https://hub.vendaseguro.com.br
2. Clicar no card da IA
3. Verificar redirect automático
4. ✅ Deve estar logado na IA!

## 🎯 Comandos Úteis

```bash
# Gerar secret para cookie de sessão
openssl rand -base64 32

# Ver logs do backend SSO
npm run start:sso

# Testar endpoint /api/me
curl http://localhost:3002/api/me --cookie "vs_session=<COOKIE>"

# Testar callback SSO
# (Usar navegador com token real)
http://localhost:3002/sso/callback?sso=1&token=<TOKEN>&ts=123
```

## ⚠️ Checklist Rápido

- [ ] Chaves RSA geradas ✓
- [ ] Plugin WordPress instalado e ativado ✓
- [ ] Chave privada no Hub (`wp-content/keys/`) ✓
- [ ] Chave pública na IA (`api/keys/`) ✓
- [ ] `.env.sso` configurado ✓
- [ ] `APP_JWT_SECRET` gerado (32+ caracteres) ✓
- [ ] `SUPABASE_SERVICE_KEY` configurada (service_role) ✓
- [ ] Backend rodando (porta 3002) ✓
- [ ] Frontend rodando (porta 8080) ✓
- [ ] Exchange testado com sucesso ✓

## 🔥 Problemas Comuns

| Problema | Solução Rápida |
|----------|----------------|
| "Private key not found" no Hub | Verificar caminho `wp-content/keys/isw-sso-private.pem` |
| "Invalid JWT signature" | Chaves não correspondem, regerar par |
| "Token validation failed" | Token expirado (3h), obter novo do Hub |
| Cookie não funciona | Confirmar `credentials: 'include'` no fetch |
| CORS error | Adicionar domínio em `allowed_origins` (plugin PHP) |

## 📚 Documentação Completa

- **Arquitetura Detalhada**: `SSO_TOKEN_EXCHANGE.md`
- **Fluxos e Diagramas**: `SSO_ARCHITECTURE.txt`

---

**Pronto!** Seu SSO via Token Exchange está configurado! 🎉
