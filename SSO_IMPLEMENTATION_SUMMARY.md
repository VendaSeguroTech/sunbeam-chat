# SSO Implementation Summary

## 📋 Visão Geral

Este documento resume a implementação completa do sistema de Single Sign-On (SSO) entre o Hub VendaSeguro e a aplicação IA Experta.

## 🎯 Objetivo

Permitir que usuários logados no Hub VendaSeguro acessem a IA Experta automaticamente, sem necessidade de fazer login novamente.

## 🏗️ Arquitetura da Solução

```
┌─────────────────────┐
│  Hub VendaSeguro    │
│  (WordPress + PHP)  │
└──────────┬──────────┘
           │
           │ 1. Gera token criptografado (AES-256-CBC)
           │ 2. Redireciona: https://ia-experta.com/?token=XYZ...
           │
           ▼
┌─────────────────────┐
│   Frontend React    │
│  (TokenAutoLogin)   │
└──────────┬──────────┘
           │
           │ 3. Detecta token na URL
           │ 4. POST para API de validação
           │
           ▼
┌─────────────────────┐
│  API Node.js        │
│  (validate-token)   │
└──────────┬──────────┘
           │
           ├─► 5. Descriptografa token
           │
           ├─► 6. Valida com Hub
           │    POST: hub.vendaseguro.com.br/isw_api/isw_validar_usuario.php
           │
           ├─► 7. Cria/busca usuário no Supabase
           │
           └─► 8. Gera magic link
                   │
                   ▼
           ┌─────────────────────┐
           │   Supabase Auth     │
           └─────────────────────┘
                   │
                   │ 9. Retorna access_token + refresh_token
                   │
                   ▼
           ┌─────────────────────┐
           │  Frontend React     │
           │  (Sessão criada)    │
           └─────────────────────┘
                   │
                   │ 10. Redireciona para /chat
                   │
                   ▼
           ┌─────────────────────┐
           │  Usuário logado!    │
           └─────────────────────┘
```

## 📁 Arquivos Criados/Modificados

### Backend (API Node.js)

| Arquivo | Descrição |
|---------|-----------|
| `api/validate-token.js` | **PRINCIPAL**: Servidor Node.js que valida tokens SSO |
| `api/package.json` | Configuração do projeto Node.js |
| `api/.env.example` | Template de variáveis de ambiente |
| `api/.gitignore` | Proteção de arquivos sensíveis |
| `api/README.md` | Documentação completa da API |
| `api/QUICK_START.md` | Guia rápido de instalação |
| `api/test-api.js` | Script de teste da API |

### Frontend (React)

| Arquivo | Descrição |
|---------|-----------|
| `src/components/auth/TokenAutoLogin.tsx` | **PRINCIPAL**: Componente que detecta token e faz auto-login |
| `src/App.tsx` | Modificado: Adiciona `<TokenAutoLogin />` global |
| `.env.example` | Template com variável `VITE_SSO_API_URL` |

### Documentação

| Arquivo | Descrição |
|---------|-----------|
| `SSO_SETUP.md` | Guia completo de setup e deploy |
| `DEPLOYMENT_CHECKLIST.md` | Checklist passo-a-passo para produção |
| `SSO_IMPLEMENTATION_SUMMARY.md` | Este arquivo (resumo geral) |

### Edge Function (Alternativa - Não obrigatória)

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/validate-hub-token/index.ts` | Edge Function alternativa (TypeScript/Deno) |

## 🔐 Segurança

### Criptografia
- **Algoritmo**: AES-256-CBC
- **Chave**: `isw_venda_seguro` (compartilhada com Hub)
- **IV**: Aleatório, anexado ao token

### Validação
- Token sempre validado com endpoint do Hub
- Dupla verificação: descriptografia + validação HTTP
- Sessões gerenciadas pelo Supabase Auth

### Proteção de Credenciais
- `.env` nunca commitado (via `.gitignore`)
- `SUPABASE_SERVICE_KEY` apenas no backend
- Variáveis de ambiente em produção

## ⚙️ Configuração Mínima Necessária

### 1. API Node.js

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=eyJ...sua_service_key
PORT=3001
ENCRYPTION_KEY=isw_venda_seguro
```

### 2. Frontend React

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...sua_anon_key
VITE_SSO_API_URL=http://localhost:3001  # ou URL de produção
```

### 3. Hub VendaSeguro

Adicionar card com:
- **URL**: `https://ia-experta.com/`
- **Action**: `melhor_produto` (ou criar novo)

## 🚀 Como Testar (Desenvolvimento)

### 1. Iniciar API
```bash
cd api
npm install
cp .env.example .env
# Editar .env com suas credenciais
npm start
```

### 2. Testar API
```bash
# Em outro terminal
npm test
```

### 3. Iniciar Frontend
```bash
# Na raiz do projeto
npm run dev
```

### 4. Obter Token Real
1. Login no Hub VendaSeguro
2. Clicar no card da IA (ou criar temporariamente)
3. Copiar token da URL: `?token=XYZ...`

### 5. Testar Auto-Login
```
http://localhost:8080/?token=TOKEN_COPIADO_DO_HUB
```

Resultado esperado:
- Loading "Autenticando via Hub VendaSeguro..."
- Toast: "Bem-vindo! Login realizado com sucesso..."
- Redirecionamento para `/chat`
- Usuário logado automaticamente

## 📊 Fluxo de Dados

### Token Descriptografado

```
Formato: md5_token|user_id|email_or_nickname
Exemplo: a1b2c3d4e5f6|123|usuario@exemplo.com
```

### Request para API

```json
POST http://localhost:3001
Content-Type: application/json

{
  "token": "SGVsbG8gV29ybGQ-..."
}
```

### Response da API (Sucesso)

```json
{
  "success": true,
  "user": {
    "id": "uuid-do-usuario",
    "email": "usuario@exemplo.com"
  },
  "session_url": "https://...supabase.co/auth/v1/verify?token=..."
}
```

### Response da API (Erro)

```json
{
  "error": "Invalid token format",
  "status": 401
}
```

## 🔍 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| API não inicia | Verificar `.env`, confirmar dependências instaladas |
| Token inválido | Verificar `ENCRYPTION_KEY`, testar com token real do Hub |
| Usuário não criado | Verificar `SUPABASE_SERVICE_KEY` (usar service_role, não anon) |
| CORS error | Configurar headers CORS na API (já incluído) |
| Port 3001 in use | Alterar `PORT` no `.env` |

## 📈 Próximos Passos

### Desenvolvimento ✅
- [x] Implementar API de validação
- [x] Criar componente de auto-login
- [x] Testar localmente

### Deploy 🔄
- [ ] Fazer deploy da API Node.js
- [ ] Configurar variáveis de ambiente em produção
- [ ] Fazer deploy do frontend
- [ ] Configurar card no Hub VendaSeguro
- [ ] Testar fluxo completo em produção

### Monitoramento 📊
- [ ] Configurar logs
- [ ] Configurar alertas de erro
- [ ] Monitorar taxa de sucesso
- [ ] Coletar feedback de usuários

## 📚 Documentação de Referência

1. **Setup Completo**: `SSO_SETUP.md`
2. **API Node.js**: `api/README.md`
3. **Guia Rápido**: `api/QUICK_START.md`
4. **Checklist de Deploy**: `DEPLOYMENT_CHECKLIST.md`

## 🎓 Conceitos Técnicos Utilizados

- **SSO (Single Sign-On)**: Autenticação única entre múltiplas aplicações
- **AES-256-CBC**: Criptografia simétrica de nível militar
- **Magic Links**: Autenticação sem senha via Supabase
- **Token-based Auth**: Autenticação baseada em tokens temporários
- **Cross-origin Integration**: Integração entre domínios diferentes

## ✅ Status da Implementação

- ✅ API Node.js completa e funcional
- ✅ Frontend integrado com auto-login
- ✅ Criptografia compatível com PHP
- ✅ Validação com Hub implementada
- ✅ Criação automática de usuários
- ✅ Documentação completa
- ✅ Scripts de teste incluídos
- ⏳ Aguardando deploy em produção
- ⏳ Aguardando configuração do card no Hub

## 🆘 Suporte

Em caso de dúvidas ou problemas:

1. Consulte a documentação em `SSO_SETUP.md`
2. Verifique os logs da API: `pm2 logs` ou console do servidor
3. Use o script de teste: `npm test` (na pasta api)
4. Verifique o console do browser (F12) no frontend
5. Confirme que todas as variáveis de ambiente estão corretas

## 📝 Notas Finais

Este sistema SSO foi implementado para replicar a funcionalidade existente do Hub VendaSeguro, mantendo compatibilidade total com o sistema PHP de criptografia. A solução usa Node.js no backend por simplicidade de deploy e melhor integração com o ecossistema JavaScript/TypeScript do projeto.

**Data de Implementação**: 2025-10-23
**Versão**: 1.0.0
**Status**: Pronto para deploy em produção
