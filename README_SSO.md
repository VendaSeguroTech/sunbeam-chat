# SSO - Single Sign-On Hub VendaSeguro ↔ IA Experta

## 🎯 Duas Arquiteturas Disponíveis

Este projeto implementa **duas soluções completas de SSO**:

### 1. Descriptografia Direta (Simples)
- Setup rápido (~5 min)
- IA descriptografa token AES-256-CBC
- Valida com endpoint do Hub
- Usa Supabase Auth (magic links)

### 2. Token Exchange JWT RS256 (Recomendada)
- Setup moderado (~10 min)
- **IA nunca descriptografa** token
- Exchange: token → JWT RS256
- Cookie HttpOnly próprio
- Padrão de mercado

## 🚀 Começar Agora

### **[👉 CLIQUE AQUI - Guia "Por Onde Começar"](SSO_START_HERE.md)**

Este guia te ajuda a:
- ✅ Escolher a arquitetura certa
- ✅ Encontrar a documentação correta
- ✅ Setup em minutos

## 📚 Documentação Principal

| Arquivo | Descrição |
|---------|-----------|
| **[SSO_START_HERE.md](SSO_START_HERE.md)** | 👈 **COMECE AQUI!** Guia de navegação |
| [SSO_COMPARISON.md](SSO_COMPARISON.md) | Comparação lado a lado das arquiteturas |
| [SSO_TOKEN_EXCHANGE_QUICKSTART.md](SSO_TOKEN_EXCHANGE_QUICKSTART.md) | Setup rápido (Arq. 2) |
| [SSO_TOKEN_EXCHANGE.md](SSO_TOKEN_EXCHANGE.md) | Documentação completa (Arq. 2) |
| [SSO_SETUP.md](SSO_SETUP.md) | Documentação completa (Arq. 1) |
| [api/QUICK_START.md](api/QUICK_START.md) | Setup rápido (Arq. 1) |

## ⚡ Quick Start

### Arquitetura 1 (Descriptografia Direta)

```bash
cd api
npm install
cp .env.example .env
# Editar .env
npm start
```

📖 **Docs**: [`api/QUICK_START.md`](api/QUICK_START.md)

### Arquitetura 2 (Token Exchange - Recomendada)

```bash
# 1. Gerar chaves
cd wordpress && .\generate-rsa-keys.ps1

# 2. Backend
cd ../api
mkdir keys
cp ../wordpress/isw-sso-public.pem keys/
cp sso.env.example .env.sso
# Editar .env.sso
npm run start:sso

# 3. Frontend
cd .. && npm run dev
```

📖 **Docs**: [`SSO_TOKEN_EXCHANGE_QUICKSTART.md`](SSO_TOKEN_EXCHANGE_QUICKSTART.md)

## 🔐 Arquivos de Código Principal

### Arquitetura 1
- Backend: `api/validate-token.js`
- Frontend: `src/components/auth/TokenAutoLogin.tsx`

### Arquitetura 2
- Hub: `wordpress/isw-sso-exchange-endpoint.php`
- Backend: `api/sso-server.js`
- Frontend: `src/hooks/useAuth.ts`, `src/components/auth/SSORedirect.tsx`

## 📊 Comparação Rápida

| Aspecto | Arq. 1 | Arq. 2 |
|---------|--------|--------|
| Complexidade | Simples | Moderada |
| Segurança | Boa | Excelente |
| Escalabilidade | Limitada | Alta |
| Setup | 5 min | 10 min |
| Produção | ⚠️ OK | ✅ Recomendada |

📖 **Detalhes**: [`SSO_COMPARISON.md`](SSO_COMPARISON.md)

## ✅ Status da Implementação

- ✅ Arquitetura 1: Completa e testada
- ✅ Arquitetura 2: Completa e testada
- ✅ Documentação: Completa
- ✅ Scripts de setup: Prontos
- ⏳ Deploy em produção: Pendente

## 🆘 Ajuda

**Primeira vez?** Leia: [`SSO_START_HERE.md`](SSO_START_HERE.md)

**Dúvidas técnicas?** Veja seção "Troubleshooting" nos docs principais.

**Deploy?** Siga: [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md)

---

**Versão**: 2.0.0 (Dual Architecture)
**Data**: 2025-10-23
**Autor**: VendaSeguro
