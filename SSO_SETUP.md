# Configuração do SSO (Single Sign-On) com Hub VendaSeguro

## Visão Geral

Este documento explica como configurar o sistema de autenticação única (SSO) entre o Hub VendaSeguro e a aplicação de IA Experta.

## Arquitetura

1. **Hub VendaSeguro** (https://hub.vendaseguro.com.br)
   - Centraliza autenticação
   - Gera token criptografado com AES-256-CBC
   - Anexa token na URL ao redirecionar para aplicações

2. **Experta IA** (sua aplicação React + Supabase)
   - Detecta token na URL
   - Valida com Edge Function
   - Cria sessão automática

## Componentes Implementados

### 1. Edge Function: `validate-hub-token`
**Localização:** `supabase/functions/validate-hub-token/index.ts`

**Funções:**
- Descriptografa token usando mesma lógica do PHP (`isw_decrypt`)
- Valida token com endpoint do Hub
- Cria/autentica usuário no Supabase
- Retorna session URL para login automático

### 2. Componente React: `TokenAutoLogin`
**Localização:** `src/components/auth/TokenAutoLogin.tsx`

**Funções:**
- Detecta parâmetro `?token=` na URL
- Chama Edge Function para validar
- Estabelece sessão no Supabase
- Redireciona para `/chat`

## Deploy da Validação de Token

Você tem **duas opções** para implementar a validação de tokens:

### Opção 1: API Node.js (Recomendado)

**Vantagens:**
- Não requer Supabase CLI
- Fácil de debugar com logs detalhados
- Roda em qualquer servidor Node.js
- Independente de Edge Functions

**Setup:**

```bash
# 1. Entre na pasta api
cd api

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase

# 4. Inicie o servidor
npm start
```

O servidor iniciará em `http://localhost:3001`.

**Documentação completa:** Veja `api/README.md`

### Opção 2: Edge Function (Avançado)

**Vantagens:**
- Serverless (escalabilidade automática)
- Integrado ao Supabase

**Pré-requisitos:**
```bash
# Instalar Supabase CLI
npm install -g supabase

# Login no Supabase
supabase login
```

**Deploy:**

```bash
# Na raiz do projeto
cd C:\projetos\experta_novo_layout\sunbeam-chat

# Fazer deploy da função
supabase functions deploy validate-hub-token --project-ref <SEU_PROJECT_REF>
```

**Variáveis de Ambiente:**

A Edge Function usa automaticamente as seguintes variáveis do Supabase:
- `SUPABASE_URL` - URL do seu projeto
- `SUPABASE_SERVICE_ROLE_KEY` - Service key (admin)

**⚠️ Nota:** Se usar Edge Function, altere `TokenAutoLogin.tsx` para usar `supabase.functions.invoke()` ao invés de `fetch()`

## Fluxo de Autenticação

### 1. No Hub VendaSeguro
Quando o usuário clica no card da IA:

```html
<a href="https://sua-app.com/?token=XYZ123..." isw_action_link="melhor_produto">
  Acessar IA Experta
</a>
```

O Hub:
1. Gera token criptografado: `md5(uniqid()) | user_id | email`
2. Criptografa com AES-256-CBC usando chave `isw_venda_seguro`
3. Anexa na URL: `?token=...&ts=timestamp`

### 2. Na Experta IA
Ao carregar a página com `?token=`:

1. **TokenAutoLogin** detecta o token
2. Chama Edge Function `validate-hub-token`
3. Edge Function:
   - Descriptografa token
   - Valida com `https://hub.vendaseguro.com.br/isw_api/isw_validar_usuario.php`
   - Cria usuário no Supabase (se não existir)
   - Retorna magic link para autenticação
4. **TokenAutoLogin** usa magic link para criar sessão
5. Usuário é redirecionado para `/chat` já autenticado

## Configuração no Hub

Para adicionar a Experta IA ao Hub, configure um novo card:

```php
// No Hub (plugin_isw_sso.php)
// O token já é gerado automaticamente no login

// Adicione um card no Hub com:
$cards[] = [
    'title' => 'IA Experta',
    'url' => 'https://sua-app.com/',
    'isw_action' => 'melhor_produto', // ou criar novo
    'icon' => 'path/to/icon.png'
];
```

## Testando o SSO

### 1. Teste Local

```bash
# Executar aplicação
npm run dev

# Simular token (obtenha um token real do Hub)
# Acesse: http://localhost:8080/?token=SEU_TOKEN_AQUI
```

### 2. Teste em Produção

1. Deploy da Edge Function
2. Deploy do frontend
3. Configure URL no Hub
4. Faça login no Hub
5. Clique no card da IA Experta
6. Deve ser redirecionado e logado automaticamente

## Segurança

### Criptografia
- **Algoritmo:** AES-256-CBC
- **Chave:** `isw_venda_seguro` (mesma do Hub)
- **IV:** Aleatório, anexado ao token

### Validação
- Token sempre validado com endpoint do Hub
- Sessões temporárias (3 horas no Hub)
- HTTPS obrigatório

### Proteção contra Replay
- Parâmetro `ts` (timestamp) na URL
- Token expira após 3 horas

## Troubleshooting

### Token inválido
**Sintoma:** Usuário redirecionado para login

**Verificar:**
1. Token está correto na URL
2. Edge Function deployada
3. Chave de criptografia igual no Hub e Edge Function
4. Endpoint do Hub acessível

**Logs:**
```bash
# Ver logs da Edge Function
supabase functions logs validate-hub-token --project-ref <SEU_PROJECT_REF>
```

### Usuário não criado
**Sintoma:** Erro ao criar sessão

**Verificar:**
1. Service Role Key configurada
2. Permissões do banco de dados
3. Tabela `profiles` existe e aceita inserções

### Descriptografia falha
**Sintoma:** Token descriptografado vazio

**Verificar:**
1. Formato do token (deve ter `;` separando dados e IV)
2. Chave de descriptografia (`isw_venda_seguro`)
3. Token não foi modificado na URL

## Estrutura do Token

### Formato Descriptografado
```
md5_token|user_id|email_or_nickname
```

**Exemplo:**
```
a1b2c3d4e5f6|123|usuario@exemplo.com
```

### Formato Criptografado (na URL)
```
base64_url_safe(encrypted_data;iv)
```

**Exemplo:**
```
SGVsbG8gV29ybGQ-base64encrypteddata;randomiv
```

## Manutenção

### Atualizar Edge Function
```bash
# Após modificar o código
supabase functions deploy validate-hub-token --project-ref <SEU_PROJECT_REF>
```

### Monitorar Logs
```bash
# Logs em tempo real
supabase functions logs validate-hub-token --follow --project-ref <SEU_PROJECT_REF>
```

### Limpar Sessões Antigas
O Supabase limpa automaticamente sessões expiradas.

## Suporte

Para problemas com SSO:
1. Verificar logs da Edge Function
2. Verificar console do browser (F12)
3. Testar endpoint do Hub diretamente
4. Verificar formato do token

## Referências

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- Plugin Hub: `plugin-sso/plugin_isw_sso.php`
