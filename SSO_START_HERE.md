# SSO - Por Onde Começar? 🚀

## 👋 Bem-vindo!

Este projeto possui **dois sistemas SSO** implementados. Este guia te ajuda a escolher e começar.

---

## 🤔 Qual Arquitetura Usar?

### ⚡ Precisa de algo rápido para testar?
👉 **[ARQUITETURA 1: Descriptografia Direta](SSO_SETUP.md)**

**Tempo de setup**: ~5 minutos
**Complexidade**: Baixa
**Ideal para**: MVP, desenvolvimento, projetos pequenos

**Começar:**
1. Ler: [`SSO_SETUP.md`](SSO_SETUP.md)
2. Seguir: [`api/QUICK_START.md`](api/QUICK_START.md)

---

### 🔐 Quer a solução mais segura e escalável?
👉 **[ARQUITETURA 2: Token Exchange (JWT RS256)](SSO_TOKEN_EXCHANGE.md)**

**Tempo de setup**: ~10 minutos
**Complexidade**: Moderada
**Ideal para**: Produção, múltiplos apps, auditoria

**Começar:**
1. Ler: [`SSO_TOKEN_EXCHANGE_QUICKSTART.md`](SSO_TOKEN_EXCHANGE_QUICKSTART.md)
2. Detalhes: [`SSO_TOKEN_EXCHANGE.md`](SSO_TOKEN_EXCHANGE.md)

---

## 📚 Guia de Leitura por Perfil

### 👨‍💻 Desenvolvedor Iniciante

```
1. SSO_COMPARISON.md         ← Entender as diferenças
2. SSO_IMPLEMENTATION_SUMMARY.md  ← Visão geral
3. api/QUICK_START.md         ← Começar com Arq. 1
4. SSO_SETUP.md              ← Detalhes da Arq. 1
```

### 👨‍🔧 DevOps / Deploy

```
1. SSO_COMPARISON.md          ← Escolher arquitetura
2. SSO_TOKEN_EXCHANGE_QUICKSTART.md  ← Setup rápido (Arq. 2)
3. SSO_TOKEN_EXCHANGE.md      ← Detalhes completos
4. DEPLOYMENT_CHECKLIST.md    ← Checklist de produção
```

### 🏗️ Arquiteto de Soluções

```
1. SSO_COMPARISON.md          ← Comparação técnica
2. SSO_ARCHITECTURE.txt       ← Diagramas de fluxo
3. SSO_TOKEN_EXCHANGE.md      ← Arq. recomendada
4. SSO_SETUP.md              ← Arq. alternativa
```

### 🔒 Segurança / Compliance

```
1. SSO_TOKEN_EXCHANGE.md      ← Arq. mais segura
   - Seção "Segurança"
   - Contratos de API
2. SSO_COMPARISON.md          ← Análise de riscos
3. wordpress/isw-sso-exchange-endpoint.php  ← Código do Hub
4. api/sso-server.js          ← Código da IA
```

---

## 🎯 Quick Start (Escolha Um)

### Opção A: Descriptografia Direta (Rápido)

```bash
# 1. Backend
cd api
npm install
cp .env.example .env
# Editar .env com credenciais do Supabase
npm start

# 2. Frontend
cd ..
npm run dev

# 3. Testar
# Obter token do Hub e acessar:
# http://localhost:8080/?token=TOKEN_DO_HUB
```

**Documentação**: [`api/QUICK_START.md`](api/QUICK_START.md)

---

### Opção B: Token Exchange (Recomendado)

```bash
# 1. Gerar chaves RSA
cd wordpress
.\generate-rsa-keys.ps1  # Windows
# ou: bash generate-rsa-keys.sh  # Linux/Mac

# 2. Configurar Hub WordPress
# Copiar isw-sso-private.pem para wp-content/keys/
# Instalar plugin: wordpress/isw-sso-exchange-endpoint.php

# 3. Configurar Backend IA
cd ../api
mkdir keys
cp ../wordpress/isw-sso-public.pem keys/
cp sso.env.example .env.sso
# Editar .env.sso
npm run start:sso

# 4. Configurar Frontend
cd ..
echo "VITE_SSO_API_URL=http://localhost:3002" >> .env
npm run dev

# 5. Testar no navegador
# Login no Hub → Clicar card da IA
```

**Documentação**: [`SSO_TOKEN_EXCHANGE_QUICKSTART.md`](SSO_TOKEN_EXCHANGE_QUICKSTART.md)

---

## 📂 Índice de Arquivos

### Documentação Geral
- `SSO_START_HERE.md` ← **Você está aqui!**
- `SSO_COMPARISON.md` - Comparação das duas arquiteturas
- `SSO_ARCHITECTURE.txt` - Diagramas visuais

### Arquitetura 1 (Descriptografia Direta)
- `SSO_SETUP.md` - Setup completo
- `SSO_IMPLEMENTATION_SUMMARY.md` - Resumo técnico
- `SSO_README.md` - README geral
- `api/README.md` - Docs da API
- `api/QUICK_START.md` - Início rápido
- `api/validate-token.js` - **Código principal**

### Arquitetura 2 (Token Exchange)
- `SSO_TOKEN_EXCHANGE.md` - **Documentação principal**
- `SSO_TOKEN_EXCHANGE_QUICKSTART.md` - Setup rápido
- `wordpress/isw-sso-exchange-endpoint.php` - **Plugin do Hub**
- `wordpress/generate-rsa-keys.sh` - Gerar chaves (Linux/Mac)
- `wordpress/generate-rsa-keys.ps1` - Gerar chaves (Windows)
- `api/sso-server.js` - **Servidor principal**
- `api/sso.env.example` - Variáveis de ambiente
- `src/hooks/useAuth.ts` - Hook React
- `src/components/auth/SSORedirect.tsx` - Redirect SSO
- `src/pages/LoginSSO.tsx` - Página de login

### Deploy
- `DEPLOYMENT_CHECKLIST.md` - Checklist completo

---

## ❓ FAQ

### Qual a diferença principal entre as duas arquiteturas?

**Arq. 1**: IA descriptografa o token diretamente e valida com Hub
**Arq. 2**: IA troca token por JWT com Hub (nunca descriptografa)

### Posso usar ambas ao mesmo tempo?

Sim! Elas rodam em portas diferentes (3001 e 3002) e não conflitam.

### Qual é mais segura?

**Arq. 2** (Token Exchange) é mais segura porque:
- IA nunca vê dados criptografados
- Validação criptográfica (JWT RS256)
- Auditoria centralizada no Hub

### Qual é mais fácil de implementar?

**Arq. 1** é mais simples (menos componentes, setup mais rápido).

### Posso migrar de 1 para 2 depois?

Sim! Você pode rodar ambas em paralelo e migrar gradualmente.

---

## 🆘 Precisa de Ajuda?

### Problemas Comuns

**"Token inválido"**
→ Ver troubleshooting em [`SSO_SETUP.md`](SSO_SETUP.md) ou [`SSO_TOKEN_EXCHANGE.md`](SSO_TOKEN_EXCHANGE.md)

**"Chave não encontrada"**
→ Verificar paths em `.env` ou `.env.sso`

**"CORS error"**
→ Configurar `allowed_origins` no código

### Onde Buscar

| Problema | Arquivo |
|----------|---------|
| Setup inicial | `*_QUICKSTART.md` |
| Erro de token | Seção "Troubleshooting" dos docs |
| Erro de JWT | `SSO_TOKEN_EXCHANGE.md` seção "Segurança" |
| Deploy | `DEPLOYMENT_CHECKLIST.md` |
| Fluxo completo | `SSO_ARCHITECTURE.txt` |

---

## ✅ Próximos Passos

1. **Escolher arquitetura** (ver comparação acima)
2. **Ler documentação** correspondente
3. **Seguir quick start** respectivo
4. **Testar localmente**
5. **Seguir checklist de deploy** quando pronto

---

**Boa implementação!** 🚀

**Dúvidas?** Consulte o índice de arquivos acima para encontrar a documentação específica.
