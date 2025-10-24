# Sistema SSO - Hub VendaSeguro ↔ IA Experta

## 🎯 O que é?

Sistema de **Single Sign-On (SSO)** que permite usuários logados no **Hub VendaSeguro** acessarem a **IA Experta** automaticamente, sem precisar fazer login novamente.

## ⚡ Quick Start

### 1️⃣ Configurar API

```bash
cd api
npm install
cp .env.example .env
# Editar .env com credenciais do Supabase
npm start
```

### 2️⃣ Testar API

```bash
# Em outro terminal
npm test
```

### 3️⃣ Configurar Frontend

```bash
# Na raiz do projeto
cp .env.example .env
# Adicionar VITE_SSO_API_URL
npm run dev
```

### 4️⃣ Testar SSO

1. Obter token do Hub VendaSeguro
2. Acessar: `http://localhost:8080/?token=SEU_TOKEN`
3. Verificar auto-login funcionando

## 📚 Documentação

### Para Começar
- **[QUICK_START.md](api/QUICK_START.md)** - Instalação em 5 minutos
- **[SSO_IMPLEMENTATION_SUMMARY.md](SSO_IMPLEMENTATION_SUMMARY.md)** - Resumo completo da implementação

### Para Desenvolvedores
- **[api/README.md](api/README.md)** - Documentação técnica completa da API
- **[SSO_SETUP.md](SSO_SETUP.md)** - Guia detalhado de setup e arquitetura

### Para Deploy
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Checklist passo-a-passo para produção

## 🏗️ Como Funciona

```
Hub VendaSeguro → Gera token criptografado
       ↓
Frontend React → Detecta token na URL
       ↓
API Node.js → Valida e cria usuário
       ↓
Supabase Auth → Gera sessão
       ↓
IA Experta → Usuário logado! 🎉
```

## 📁 Estrutura de Arquivos

```
sunbeam-chat/
├── api/                          # Backend Node.js
│   ├── validate-token.js         # ⭐ API principal
│   ├── test-api.js              # Script de teste
│   ├── package.json
│   ├── .env.example
│   ├── README.md                # Docs técnicos
│   └── QUICK_START.md           # Guia rápido
│
├── src/
│   └── components/auth/
│       └── TokenAutoLogin.tsx    # ⭐ Auto-login no frontend
│
├── supabase/functions/
│   └── validate-hub-token/       # Edge Function alternativa
│
├── SSO_SETUP.md                  # Setup completo
├── SSO_IMPLEMENTATION_SUMMARY.md # Resumo da implementação
├── DEPLOYMENT_CHECKLIST.md       # Checklist de deploy
└── SSO_README.md                 # Este arquivo
```

## 🔑 Variáveis de Ambiente

### Backend (`api/.env`)
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua_service_key
PORT=3001
ENCRYPTION_KEY=isw_venda_seguro
```

### Frontend (`.env`)
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key
VITE_SSO_API_URL=http://localhost:3001
```

## 🧪 Testando

### Testar API Isoladamente
```bash
cd api
npm start          # Terminal 1
npm test          # Terminal 2
```

### Testar Integração Completa
```bash
# Terminal 1: API
cd api && npm start

# Terminal 2: Frontend
npm run dev

# Browser: Acessar com token do Hub
http://localhost:8080/?token=TOKEN_DO_HUB
```

## 🚀 Deploy

### 1. Deploy da API
```bash
# Opção 1: VPS com PM2
pm2 start api/validate-token.js --name sso-api

# Opção 2: Heroku
heroku create
git subtree push --prefix api heroku main

# Opção 3: Railway/Render
# Conectar repo e configurar variáveis de ambiente
```

### 2. Deploy do Frontend
```bash
npm run build
# Deploy para Vercel, Netlify, etc.
```

### 3. Configurar Hub
Adicionar card da IA Experta com URL da aplicação deployada.

## 🔒 Segurança

- ✅ Criptografia AES-256-CBC
- ✅ Validação dupla (descriptografia + Hub)
- ✅ Service key apenas no backend
- ✅ Tokens temporários
- ✅ HTTPS obrigatório em produção

## 🆘 Troubleshooting

| Problema | Solução |
|----------|---------|
| **API não inicia** | Verificar `.env`, instalar dependências |
| **Token inválido** | Usar token real do Hub, verificar `ENCRYPTION_KEY` |
| **Port 3001 in use** | Alterar `PORT` no `.env` |
| **CORS error** | Verificar headers (já configurado) |
| **User not created** | Usar `service_role` key, não `anon` |

## 📊 Status

- ✅ API Node.js implementada
- ✅ Frontend integrado
- ✅ Documentação completa
- ✅ Scripts de teste incluídos
- ⏳ Aguardando deploy em produção

## 🎓 Conceitos

- **SSO**: Autenticação única entre múltiplas aplicações
- **AES-256-CBC**: Criptografia simétrica
- **Magic Links**: Autenticação sem senha (Supabase)
- **Token-based Auth**: Tokens temporários para autenticação

## 📖 Leitura Recomendada

1. **Começando**: [api/QUICK_START.md](api/QUICK_START.md)
2. **Entendendo**: [SSO_IMPLEMENTATION_SUMMARY.md](SSO_IMPLEMENTATION_SUMMARY.md)
3. **Detalhes técnicos**: [api/README.md](api/README.md)
4. **Deploy**: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

## 🤝 Suporte

Em caso de dúvidas:
1. Consulte a documentação apropriada acima
2. Verifique logs da API e browser console
3. Use `npm test` para validar a API
4. Revise o checklist de deploy

---

**Versão**: 1.0.0
**Data**: 2025-10-23
**Status**: Pronto para produção
