# ⚠️ IMPORTANTE: Limitações de Segurança no Frontend

## 🔍 Por Que Ainda Vejo as Credenciais no Código?

Se você está vendo as credenciais ao inspecionar o código no navegador ou no arquivo de build, **isso é NORMAL e ESPERADO**.

### A Realidade do JavaScript Frontend

**REGRA DE OURO:**
> **Qualquer código JavaScript que roda no navegador é PÚBLICO.**
> Não existe forma de esconder completamente código ou URLs no frontend.

---

## 🤔 Mas Por Que Usar .env Então?

### Benefícios do .env (mesmo com limitações)

| Benefício | Descrição |
|-----------|-----------|
| **Não commitar credenciais** | `.env` no `.gitignore` evita credenciais no GitHub |
| **Ambientes separados** | Fácil ter `.env.dev` e `.env.prod` |
| **Rotação de credenciais** | Trocar chaves sem alterar código |
| **Onboarding de devs** | `cp .env.example .env` |
| **Auditoria** | Histórico do Git não mostra credenciais |

---

## 🔬 Como o Vite Funciona

### Durante o Build

Quando você roda `npm run build`, o Vite faz isso:

**Código Original (src/supabase/client.ts):**
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

**Código Após Build (dist/assets/index-abc123.js):**
```javascript
const supabaseUrl = "https://supabase.vendaseguro.tech";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

### Por Que Isso Acontece?

O Vite **substitui** as variáveis de ambiente em tempo de build porque:
1. O código JavaScript roda no navegador (não no servidor)
2. O navegador não tem acesso a arquivos `.env` do servidor
3. A única forma é "embutir" os valores no código

---

## ✅ Isso é um Problema de Segurança?

### Para a ANON_KEY do Supabase: **NÃO!**

**A `VITE_SUPABASE_ANON_KEY` é PÚBLICA por design.**

```
┌─────────────────────────────────────────────┐
│  SUPABASE ANON KEY É PÚBLICA                │
│                                              │
│  ✅ Pode ser exposta no frontend             │
│  ✅ Qualquer um pode ver                     │
│  ✅ Isso é ESPERADO pelo Supabase            │
│                                              │
│  🛡️ SEGURANÇA VEM DO RLS                     │
│     (Row Level Security no banco)           │
└─────────────────────────────────────────────┘
```

#### Como o Supabase Protege?

**Camadas de Segurança:**

1. **ANON KEY** - Pública, permite conexão ao Supabase
2. **JWT TOKEN** - Gerado após login, identifica usuário
3. **RLS (Row Level Security)** - Políticas no banco que filtram dados

**Exemplo:**
```sql
-- Política RLS na tabela profiles
CREATE POLICY "Users can only see their own data"
ON profiles
FOR SELECT
USING (auth.uid() = id);
```

**Resultado:**
- ✅ User A vê apenas dados do User A
- ✅ User B vê apenas dados do User B
- ❌ Mesmo com a ANON_KEY, User A não consegue ver dados do User B

---

### Para o Webhook N8N: **SIM, é um problema!**

**A URL do webhook sendo pública PODE ser um problema SE:**
- ❌ Não houver validação de `userId` no N8N
- ❌ Não houver rate limiting
- ❌ Qualquer um pode enviar mensagens e consumir créditos da IA

**Solução:** Implementar validações no N8N (ver `SEGURANCA_RATE_LIMITING.md`)

---

## 🛡️ Como Proteger de Verdade?

### A Segurança REAL Está no Backend

```
┌─────────────┐
│  Frontend   │ ← Código público (qualquer um vê)
└──────┬──────┘
       │ HTTP Request
       ↓
┌─────────────────────────────────────────┐
│  Backend (N8N, Supabase)                │
│  ┌─────────────────────────────────┐   │
│  │ ✅ VALIDA USERID                │   │ ← SEGURANÇA AQUI!
│  │ ✅ VALIDA TOKEN JWT             │   │
│  │ ✅ VERIFICA RLS                 │   │
│  │ ✅ APLICA RATE LIMITING         │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 📊 Níveis de Segurança

### Nível 1: Segurança do Supabase (Atual ✅)

**O que temos:**
- ✅ RLS habilitado em todas as tabelas
- ✅ Políticas que filtram dados por `auth.uid()`
- ✅ JWT token valida usuário

**O que está protegido:**
- ✅ Dados de usuários (profiles)
- ✅ Conversas (n8n_chat_histories)
- ✅ Modelos privados

**O que NÃO está protegido:**
- ❌ Webhook N8N (qualquer um pode chamar)
- ❌ Consumo de créditos da IA
- ❌ Spam de mensagens

---

### Nível 2: Segurança do Webhook (Recomendado 🟡)

**O que precisamos implementar:**
- 🟡 Validação de `userId` no N8N
- 🟡 Validação de `sessionId` no N8N
- 🟡 Rate limiting (10 msgs/min)

**Quando implementado:**
- ✅ Apenas usuários reais podem enviar mensagens
- ✅ Protegido contra spam e ataques
- ✅ Custos de IA controlados

**Como implementar:**
Ver documentação completa em `SEGURANCA_RATE_LIMITING.md`

---

## 🎯 Checklist de Segurança

### Frontend (Atual)
- [x] Credenciais em `.env` (não hardcoded)
- [x] `.env` no `.gitignore`
- [x] `.env.example` para novos devs
- [x] Validação se variáveis existem
- [x] RLS habilitado no Supabase

### Backend (Pendente - Alta Prioridade)
- [ ] Validação de `userId` no N8N
- [ ] Validação de `sessionId` no N8N
- [ ] Rate limiting no N8N
- [ ] Logs de tentativas bloqueadas
- [ ] Alertas de segurança

---

## ❓ Perguntas Frequentes

### Q: "Não consigo esconder a URL do webhook?"

**A:** Não, não é possível esconder completamente. Qualquer URL que o JavaScript do navegador chama pode ser vista no código ou no Network tab das DevTools.

**Solução:** Validar requisições no backend, não tentar esconder a URL.

---

### Q: "E se eu usar um proxy?"

**A:** Você pode criar um endpoint no seu próprio backend que redireciona para o N8N:

```
Frontend → Seu Backend (api.seusite.com/chat) → N8N
```

**Vantagens:**
- ✅ URL do N8N fica privada
- ✅ Validação mais fácil (seu backend controla)

**Desvantagens:**
- ❌ Mais complexo de manter
- ❌ Mais latência (um hop extra)
- ❌ Ainda precisa validar no seu backend

---

### Q: "Posso usar variáveis de ambiente do servidor?"

**A:** Sim, mas precisaria de um backend. Atualmente você está usando:
- Frontend: React (roda no navegador)
- Backend: Supabase + N8N (separados)

Para usar variáveis de ambiente do servidor, você precisaria:
1. Criar uma API própria (Node.js, Python, etc)
2. Frontend chama sua API
3. Sua API chama N8N com credenciais do servidor

---

### Q: "Outras aplicações também expõem URLs?"

**A:** Sim! Praticamente todas as aplicações web modernas expõem URLs de API no frontend:

**Exemplos:**
- **ChatGPT**: URLs da API visíveis no Network tab
- **Gmail**: Endpoints do Google APIs visíveis
- **Twitter**: URLs da API pública

**A segurança deles vem de:**
- Tokens de autenticação
- Rate limiting
- Validação de requisições
- Não de esconder URLs

---

## 🎓 Conclusão

### O Que Aprendemos

1. **Código frontend é sempre público** - Não tente esconder, proteja no backend
2. **ANON_KEY pode ser exposta** - Supabase foi feito para isso
3. **Webhook precisa validação** - Implementar no N8N (prioridade!)
4. **`.env` ainda é útil** - Evita commit de credenciais, facilita deploys
5. **Segurança real é no backend** - RLS, validação, rate limiting

---

### Próximos Passos

**Prioridade ALTA (Faça agora! 🔴):**
1. Implementar validação de `userId` no N8N
2. Implementar rate limiting no N8N
3. Testar com tentativas de ataque

**Documentação:**
- `SEGURANCA_RATE_LIMITING.md` - Guia completo de implementação
- `SEGURANCA_IMPLEMENTACAO.md` - O que já foi feito

---

## 📚 Recursos Adicionais

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP - Client-Side Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [Why You Can't Hide API Keys in Frontend](https://stackoverflow.com/questions/48699820/how-do-i-hide-an-api-key-in-create-react-app)

---

**Última atualização:** 26 de Novembro de 2025
**Versão:** 1.0
**Status:** Documentação de limitações e soluções
