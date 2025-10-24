# SSO - Comparação de Arquiteturas

## 📊 Duas Implementações Disponíveis

Este projeto oferece **duas arquiteturas diferentes** de SSO. Escolha a que melhor se adequa às suas necessidades.

## 🏗️ Arquitetura 1: Descriptografia Direta (Implementada Primeiro)

### Como Funciona

```
Hub → Token criptografado → IA descriptografa → Valida com Hub → Cria sessão Supabase
```

### Características

- ✅ **Simples**: Menos componentes
- ✅ **Direto**: IA descriptografa token diretamente (AES-256-CBC)
- ✅ **Validação**: Chama endpoint do Hub para confirmar
- ✅ **Integração**: Usa Supabase Auth nativamente (magic links)
- ⚠️ IA precisa conhecer a chave de criptografia do Hub
- ⚠️ IA processa dados sensíveis (token criptografado)

### Arquivos

- `api/validate-token.js` - API Node.js
- `src/components/auth/TokenAutoLogin.tsx` - Frontend React
- `SSO_SETUP.md` - Documentação

### Quando Usar

- Projeto menor ou MVP
- Poucos apps no ecossistema SSO
- Controle total sobre Hub e IA
- Supabase Auth já em uso

---

## 🏗️ Arquitetura 2: Token Exchange com JWT RS256 (Recomendada)

### Como Funciona

```
Hub → Token criptografado → IA envia para Hub (exchange) →
Hub retorna JWT RS256 → IA valida assinatura → Cookie próprio
```

### Características

- ✅ **Segura**: IA nunca descriptografa token
- ✅ **Escalável**: Múltiplos apps podem usar o mesmo endpoint
- ✅ **Padrão**: JWT RS256 (assimétrico)
- ✅ **Auditável**: Hub centraliza validação e revogação
- ✅ **Cookie HttpOnly**: JavaScript não acessa token
- ✅ **Independente**: Não depende de Supabase Auth para sessão
- 📋 Mais componentes (endpoint no Hub, chaves RSA)

### Arquivos

**Hub WordPress:**
- `wordpress/isw-sso-exchange-endpoint.php` - Plugin de exchange
- `wordpress/generate-rsa-keys.sh` - Gerar chaves RSA
- `wp-content/keys/isw-sso-private.pem` - Chave privada

**Backend Node.js:**
- `api/sso-server.js` - Servidor SSO completo
- `api/keys/isw-sso-public.pem` - Chave pública do Hub

**Frontend React:**
- `src/components/auth/SSORedirect.tsx` - Redirect para backend
- `src/hooks/useAuth.ts` - Hook de autenticação
- `src/pages/LoginSSO.tsx` - Página de login

**Documentação:**
- `SSO_TOKEN_EXCHANGE.md` - Guia completo
- `SSO_TOKEN_EXCHANGE_QUICKSTART.md` - Setup rápido

### Quando Usar

- Produção com múltiplos apps
- Ecossistema SSO escalável
- Máxima segurança (auditoria, revogação)
- Independência do Supabase Auth
- Conformidade com padrões (JWT RS256)

---

## 📋 Comparação Lado a Lado

| Aspecto | Descriptografia Direta | Token Exchange (JWT) |
|---------|------------------------|----------------------|
| **Complexidade** | Simples | Moderada |
| **Segurança** | Boa | Excelente |
| **Escalabilidade** | Limitada | Alta |
| **Setup** | Rápido (5 min) | Médio (10 min) |
| **Chaves** | AES-256 simétrica | RSA assimétrica |
| **IA descriptografa?** | ✅ Sim | ❌ Não |
| **JWT** | Magic link do Supabase | RS256 próprio |
| **Cookie** | Session do Supabase | vs_session (HttpOnly) |
| **Validação** | HTTP call para Hub | Criptográfica (RS256) |
| **Revogação** | Remover da tabela ISW_sso | Remover da tabela ISW_sso |
| **Auditoria** | Logs da IA | Logs centralizados no Hub |
| **Depende de Supabase Auth?** | ✅ Sim | ❌ Não |
| **React processa token?** | ✅ Sim (passa para backend) | ❌ Não (só redireciona) |

---

## 🎯 Recomendação

### Para Desenvolvimento / MVP
👉 **Arquitetura 1** (Descriptografia Direta)

- Setup mais rápido
- Menos componentes
- Integração direta com Supabase Auth
- Suficiente para validação de conceito

### Para Produção / Escalabilidade
👉 **Arquitetura 2** (Token Exchange JWT)

- Padrão de mercado
- Mais segura
- Escalável para múltiplos apps
- Melhor auditoria
- Independente de providers (Supabase)

---

## 🔄 Migração

Se você começou com **Arquitetura 1** e quer migrar para **Arquitetura 2**:

### Passo a Passo

1. **Instalar ambos** (rodam em portas diferentes):
   - Arquitetura 1: porta 3001
   - Arquitetura 2: porta 3002

2. **Testar Arquitetura 2** em paralelo

3. **Migrar gradualmente**:
   - Manter Arquitetura 1 ativa
   - Adicionar `SSORedirect.tsx` ao `App.tsx`
   - Configurar variável `VITE_SSO_API_URL=http://localhost:3002`
   - Testar fluxo completo

4. **Desativar Arquitetura 1** quando confiante

### Compatibilidade

✅ **Podem coexistir** sem conflitos
- Portas diferentes (3001 vs 3002)
- Rotas diferentes (`/api/me` vs magic links)
- Componentes React separados

---

## 📚 Documentação por Arquitetura

### Arquitetura 1 (Descriptografia Direta)
- **Setup**: `SSO_SETUP.md`
- **API**: `api/README.md`
- **Resumo**: `SSO_IMPLEMENTATION_SUMMARY.md`

### Arquitetura 2 (Token Exchange)
- **Setup Completo**: `SSO_TOKEN_EXCHANGE.md`
- **Quick Start**: `SSO_TOKEN_EXCHANGE_QUICKSTART.md`
- **Comparação**: Este arquivo

---

## ✅ Checklist de Escolha

**Escolha Arquitetura 1 se:**
- [ ] É seu primeiro projeto SSO
- [ ] Precisa de MVP rápido
- [ ] Usa Supabase Auth ativamente
- [ ] Tem 1-2 apps no ecossistema

**Escolha Arquitetura 2 se:**
- [ ] Vai para produção
- [ ] Planeja escalar (múltiplos apps)
- [ ] Precisa de auditoria centralizada
- [ ] Quer seguir padrões de mercado (JWT RS256)
- [ ] Quer independência de providers

---

**Dúvidas?** Consulte a documentação específica de cada arquitetura!
