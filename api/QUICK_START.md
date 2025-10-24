# SSO API - Guia Rápido de Instalação

## 📋 Pré-requisitos

- Node.js instalado (v16 ou superior)
- Credenciais do Supabase (URL + Service Key)

## 🚀 Instalação em 5 Passos

### 1. Entre na pasta da API

```bash
cd api
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env
```

Edite o arquivo `.env` e adicione suas credenciais:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua_service_role_key_aqui
PORT=3001
ENCRYPTION_KEY=isw_venda_seguro
```

**Como obter as credenciais do Supabase:**

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** (secret) → `SUPABASE_SERVICE_KEY`

⚠️ **IMPORTANTE**: Use a chave `service_role`, NÃO a `anon` key!

### 4. Inicie o servidor

```bash
npm start
```

Você verá:

```
========================================
🚀 API de Validação SSO rodando!
📍 URL: http://localhost:3001
🔑 Supabase URL: https://seu-projeto.supabase.co
========================================
```

### 5. Teste a API

Abra outro terminal e execute:

```bash
curl -X POST http://localhost:3001 \
  -H "Content-Type: application/json" \
  -d '{"token":"teste"}'
```

Se receber uma resposta JSON (mesmo que erro), a API está funcionando! ✅

## 🔧 Comandos Úteis

```bash
# Iniciar servidor (desenvolvimento)
npm start

# Ver logs em tempo real (se usar PM2)
pm2 logs sso-validation

# Reiniciar servidor (PM2)
pm2 restart sso-validation

# Parar servidor (PM2)
pm2 stop sso-validation
```

## 📝 Próximos Passos

1. Configure o card da IA no Hub VendaSeguro
2. Teste o fluxo completo: Hub → AI Experta
3. Em produção, altere a URL em `TokenAutoLogin.tsx`

## ❓ Problemas Comuns

### "Cannot find module '@supabase/supabase-js'"
```bash
npm install @supabase/supabase-js
```

### "Port 3001 already in use"
Altere a `PORT` no arquivo `.env`:
```env
PORT=3002
```

### "Invalid token format" ao testar
Normal! Você precisa de um token real do Hub VendaSeguro.

### "Failed to create user"
Verifique se a `SUPABASE_SERVICE_KEY` está correta (não use a `anon` key).

## 📚 Documentação Completa

Veja `README.md` para informações detalhadas sobre:
- Deploy em produção
- Configuração de proxy reverso
- Monitoramento e logs
- Segurança

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs do servidor
2. Confirme que todas as variáveis de ambiente estão corretas
3. Teste o endpoint do Hub manualmente
4. Revise a documentação completa em `README.md`
