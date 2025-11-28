# 🔒 Melhorias de Segurança Implementadas

## 📋 Resumo das Mudanças

Este documento descreve as melhorias de segurança implementadas na aplicação Experta Chat em **26 de Novembro de 2025**.

---

## ✅ O Que Foi Implementado

### 1. **Variáveis de Ambiente (.env)**

#### Arquivos Criados:
- ✅ `.env` - Arquivo com credenciais reais (NUNCA commitar!)
- ✅ `.env.example` - Arquivo template para outros desenvolvedores

#### Variáveis Movidas para .env:
```bash
# Supabase
VITE_SUPABASE_URL=https://supabase.vendaseguro.tech
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# N8N Webhook (ativo)
VITE_N8N_WEBHOOK_URL=https://vmi2926235.contaboserver.net/webhook-test/...

# Webhooks alternativos (comentados)
# VITE_N8N_WEBHOOK_URL=https://webhook.vendaseguro.tech/webhook/...
# VITE_N8N_WEBHOOK_URL=https://n8n.vendaseguro.tech/webhook-test/...
# VITE_N8N_WEBHOOK_URL=https://vmi2926235.contaboserver.net/webhook/...
```

---

### 2. **Proteção do .gitignore**

Adicionado ao `.gitignore`:
```gitignore
# Environment variables (SEGURANÇA: nunca commitar!)
.env
.env.local
.env.production
.env.development
```

**Benefício:** O arquivo `.env` com credenciais reais nunca será enviado para o GitHub.

---

### 3. **Atualização do ChatInterface.tsx**

**Antes:**
```typescript
// ❌ URL hardcoded - visível para qualquer um
const WEBHOOK_URL = "https://vmi2926235.contaboserver.net/webhook-test/...";
```

**Depois:**
```typescript
// ✅ URL vem de variável de ambiente
const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
```

**Localização:** `src/components/chat/ChatInterface.tsx:87-89`

---

### 4. **Atualização do Supabase Client**

**Antes:**
```typescript
// ❌ Credenciais hardcoded
const supabaseUrl = 'https://supabase.vendaseguro.tech';
const supabaseAnonKey = 'eyJhbGci...';
```

**Depois:**
```typescript
// ✅ Credenciais de variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas');
}
```

**Localização:** `src/supabase/client.ts:3-10`

---

## 🎯 Benefícios

### Segurança
✅ **Credenciais não expostas no código-fonte**
✅ **Arquivo .env protegido pelo .gitignore**
✅ **Facilita rotação de credenciais** (basta editar .env)
✅ **Impossível commitar credenciais acidentalmente**

### Desenvolvimento
✅ **Fácil trocar entre webhooks** (descomentar linha no .env)
✅ **Ambientes separados** (dev, staging, prod)
✅ **Onboarding simplificado** (copiar .env.example → .env)

---

## 📝 Como Usar

### Para Desenvolvedores Novos

1. **Clone o repositório**
```bash
git clone [repo-url]
cd sunbeam-chat
```

2. **Copie o .env.example**
```bash
cp .env.example .env
```

3. **Preencha as credenciais no .env**
```bash
# Abra o arquivo .env e substitua:
VITE_SUPABASE_ANON_KEY=your_key_here
VITE_N8N_WEBHOOK_URL=https://...
```

4. **Instale dependências e rode**
```bash
npm install
npm run dev
```

---

### Para Trocar de Webhook

**Opção 1 - Editar diretamente:**
```bash
# Abrir .env
VITE_N8N_WEBHOOK_URL=https://novo-webhook.com/...
```

**Opção 2 - Descomentar webhook alternativo:**
```bash
# Comentar o ativo:
# VITE_N8N_WEBHOOK_URL=https://vmi2926235.contaboserver.net/webhook-test/...

# Descomentar o desejado:
VITE_N8N_WEBHOOK_URL=https://n8n.vendaseguro.tech/webhook-test/...
```

**Reiniciar servidor:**
```bash
npm run dev
```

---

## 🚨 ATENÇÃO: O Que AINDA Está Exposto?

### ⚠️ Webhook URL no Build de Produção

**Problema:**
Mesmo usando `.env`, quando você faz o build (`npm run build`), o Vite **substitui** as variáveis de ambiente diretamente no código JavaScript final.

**Resultado:**
```javascript
// dist/assets/index-abc123.js
const WEBHOOK_URL = "https://vmi2926235.contaboserver.net/webhook-test/...";
```

**Ou seja:** A URL do webhook AINDA fica visível se alguém inspecionar o código do site em produção.

---

### 🛡️ Isso é um Problema?

**Resposta:** Depende da sua implementação de segurança no N8N.

| Cenário | Seguro? |
|---------|---------|
| N8N **SEM** validação de userId | ❌ **MUITO PERIGOSO** - Qualquer um pode enviar mensagens |
| N8N **COM** validação de userId | ✅ **Seguro** - Só aceita usuários válidos |
| N8N **COM** validação + rate limiting | ✅✅ **Muito Seguro** - Protegido contra spam |

---

### ✅ Solução Completa: Implementar no N8N

Para **total proteção**, você DEVE implementar no N8N:

1. **Validação de UserID** (ver `SEGURANCA_RATE_LIMITING.md`)
2. **Validação de SessionID** (ver `SEGURANCA_RATE_LIMITING.md`)
3. **Rate Limiting** (10 msgs/min por usuário)

**Com essas proteções:**
- ✅ Mesmo que alguém veja a URL do webhook, não consegue usá-la
- ✅ Requisições com userId falso são bloqueadas (403)
- ✅ Spam é bloqueado após 10 mensagens (429)
- ✅ Custos de IA protegidos

**Ver documentação completa:** `SEGURANCA_RATE_LIMITING.md`

---

## 🔍 Diferença: Antes vs Depois

### Antes (Código Exposto)
```typescript
// src/components/chat/ChatInterface.tsx
const WEBHOOK_URL = "https://vmi2926235.contaboserver.net/webhook-test/0fc3496c...";

// src/supabase/client.ts
const supabaseUrl = 'https://supabase.vendaseguro.tech';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**Problemas:**
- ❌ URL hardcoded no código-fonte
- ❌ Credenciais commitadas no Git
- ❌ Difícil trocar entre ambientes
- ❌ Histórico do Git contém credenciais antigas

---

### Depois (Variáveis de Ambiente)
```typescript
// src/components/chat/ChatInterface.tsx
const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

// src/supabase/client.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

**Benefícios:**
- ✅ Código-fonte limpo (sem credenciais)
- ✅ .env nunca commitado (gitignore)
- ✅ Fácil trocar ambientes
- ✅ Segurança melhorada

---

## 📚 Próximos Passos Recomendados

### Prioridade ALTA 🔴

- [ ] **Implementar Validação de UserID no N8N**
  - Ver: `SEGURANCA_RATE_LIMITING.md` - Passo 1
  - Tempo estimado: 15 minutos
  - Impacto: ⭐⭐⭐⭐⭐

- [ ] **Implementar Rate Limiting no N8N**
  - Ver: `SEGURANCA_RATE_LIMITING.md` - Passo 5
  - Tempo estimado: 20 minutos
  - Impacto: ⭐⭐⭐⭐⭐

### Prioridade MÉDIA 🟡

- [ ] **Implementar Validação de SessionID no N8N**
  - Ver: `SEGURANCA_RATE_LIMITING.md` - Passo 4
  - Tempo estimado: 10 minutos
  - Impacto: ⭐⭐⭐⭐

- [ ] **Criar Tabela de Logs de Segurança**
  - Ver: `SEGURANCA_RATE_LIMITING.md` - Passo 6
  - Tempo estimado: 15 minutos
  - Impacto: ⭐⭐⭐

### Prioridade BAIXA 🟢

- [ ] **Configurar Ambientes Separados**
  - Criar: `.env.development`, `.env.production`
  - Configurar: Scripts npm para cada ambiente
  - Tempo estimado: 30 minutos
  - Impacto: ⭐⭐

- [ ] **Implementar Monitoramento de Ataques**
  - Dashboard para ver tentativas bloqueadas
  - Alertas por email/telegram
  - Tempo estimado: 2 horas
  - Impacto: ⭐⭐

---

## 🧪 Testando as Mudanças

### Teste 1: Verificar Variáveis de Ambiente

```bash
# Rodar servidor de dev
npm run dev

# Abrir console do navegador (F12)
# Se aparecer erro "Variáveis de ambiente não configuradas"
# → Verifique se o arquivo .env existe
```

### Teste 2: Enviar Mensagem

1. Abrir aplicação
2. Fazer login
3. Enviar mensagem no chat
4. Verificar que recebe resposta normal

**Se funcionar:** ✅ Webhook URL carregada corretamente

---

### Teste 3: Verificar Build de Produção

```bash
# Fazer build
npm run build

# Verificar arquivos gerados
ls dist/assets/

# Abrir arquivo JS principal e buscar por "webhook"
# NOTA: Você VAI ver a URL hardcoded - isso é normal
# A proteção vem da validação no N8N, não de esconder a URL
```

---

## ❓ Perguntas Frequentes

### Q: Por que a URL do webhook ainda aparece no build?

**A:** Vite substitui variáveis de ambiente durante o build. É impossível esconder completamente URLs no frontend. A segurança vem de validar requisições no backend (N8N).

---

### Q: Alguém pode roubar minha VITE_SUPABASE_ANON_KEY?

**A:** Sim, mas não é problema. A `ANON_KEY` é **pública por design**. A segurança vem do RLS (Row Level Security) do Supabase, que impede acesso não autorizado aos dados.

---

### Q: E se eu commitar o .env acidentalmente?

**A:**
1. Remova do Git imediatamente:
```bash
git rm .env --cached
git commit -m "Remove .env"
git push
```

2. Troque TODAS as credenciais:
   - Gere nova ANON_KEY no Supabase
   - Troque URL do webhook (ou adicione validação)

3. Limpe histórico do Git (avançado):
```bash
# Usar BFG Repo Cleaner ou git filter-branch
```

---

### Q: Posso usar a mesma .env para dev e prod?

**A:** Pode, mas não é recomendado. Ideal:
- `.env.development` - Webhook de teste, banco local
- `.env.production` - Webhook prod, banco prod

---

## 📁 Estrutura de Arquivos

```
sunbeam-chat/
├── .env                          # ⚠️ CREDENCIAIS REAIS (nunca commitar!)
├── .env.example                  # ✅ Template público (pode commitar)
├── .gitignore                    # ✅ Protege .env
├── src/
│   ├── components/
│   │   └── chat/
│   │       └── ChatInterface.tsx # ✅ Usa import.meta.env
│   └── supabase/
│       └── client.ts             # ✅ Usa import.meta.env
├── SEGURANCA_RATE_LIMITING.md    # 📚 Como implementar validações
└── SEGURANCA_IMPLEMENTACAO.md    # 📚 Este arquivo
```

---

## 🎓 Lições Aprendidas

### ✅ O Que Fizemos Bem
- Mover credenciais para .env
- Proteger .env com .gitignore
- Documentar tudo
- Criar .env.example para novos devs

### 🔄 O Que Ainda Precisa Melhorar
- Implementar validação no N8N (crítico!)
- Separar ambientes (dev/prod)
- Adicionar testes de segurança
- Monitoramento de ataques

### 📖 Recursos de Aprendizado
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## 📞 Contato

**Dúvidas sobre implementação?**
- Consulte: `SEGURANCA_RATE_LIMITING.md`
- Consulte: `CLAUDE.md` (arquitetura geral)

---

**Documentação criada em:** 26 de Novembro de 2025
**Versão:** 1.0
**Status:** ✅ Implementado e testado
