# CLAUDE.md

Este arquivo fornece orientações para o Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Comandos de Desenvolvimento

```bash
# Servidor de desenvolvimento (roda na porta 8080)
npm run dev

# Build de produção
npm run build

# Build de desenvolvimento (com modo dev ativado)
npm run build:dev

# Linting
npm run lint

# Preview do build de produção
npm run preview
```

## Arquitetura Principal

Esta é uma aplicação de chat React + TypeScript construída em uma **arquitetura de três camadas**:

1. **Frontend (React/Vite)** - Camada de UI com interface de chat em tempo real
2. **Camada de Orquestração N8N** - Automação de workflow que processa mensagens do chat, chama modelos de IA e implementa RAG
3. **Backend Supabase** - Autenticação, banco PostgreSQL, armazenamento de vetores para RAG e assinaturas realtime

### Integração Crítica do Webhook

Todas as mensagens do chat fluem através de um único endpoint webhook N8N definido em `src/components/chat/ChatInterface.tsx:63`:

```typescript
const WEBHOOK_URL = "https://n8n.vendaseguro.tech/webhook-test/0fc3496c-5dfa-4772-8661-da71da6353c7";
```

**Estrutura do payload para mensagens de texto:**
```typescript
{
  message: string,
  timestamp: string (ISO),
  messageId: string,
  sessionId: string,
  userId: string,
  type: 'text',
  model: string  // Valor do seletor de modelo (ex: 'basic', 'advanced')
}
```

**Estrutura do payload para upload de arquivos:**
```typescript
FormData {
  file: File,
  sessionId: string,
  userId: string,
  type: string (mime type),
  message: string,
  model: string
}
```

O workflow do N8N lida com toda orquestração de IA, buscas RAG no banco de vetores e persistência na tabela `n8n_chat_histories`.

## Fluxo de Mensagens do Chat

1. Usuário envia mensagem via `ChatInterface.tsx`
2. Frontend faz POST para webhook N8N com `sessionId`, `userId`, `message` e `model` opcional
3. Workflow N8N:
   - Realiza busca RAG na tabela `documents` do Supabase (busca por similaridade de vetores)
   - Chama LLM com contexto dos resultados RAG
   - Salva tanto mensagem do usuário quanto resposta da IA na tabela `n8n_chat_histories`
   - Retorna resposta da IA no corpo da resposta do webhook
4. Frontend recebe resposta, faz streaming caractere por caractere com efeito de digitação (`streamResponseAsSeparateMessages`)
5. Mensagens são auto-salvas no histórico local do Supabase (tabela `conversation_history`) na segunda mensagem

## Sistema Duplo de Histórico

A aplicação mantém **dois sistemas separados de histórico de conversas**:

### 1. Histórico persistido pelo N8N (tabela `n8n_chat_histories`)
- **Fonte**: Escrito pelo workflow N8N após cada troca
- **Estrutura**: Cada linha é uma mensagem (usuário ou assistente)
- **Hook**: `useN8nChatHistory` - busca e agrupa por `session_id`
- **Propósito**: Fonte da verdade para conversas gerenciadas pelo N8N
- **Exibição**: Mostra na sidebar como sessões de conversa

### 2. Histórico persistido pelo frontend (tabela `conversation_history`)
- **Fonte**: Escrito pelo frontend (hook `useConversationHistory`)
- **Estrutura**: Cada linha é uma conversa completa com mensagens como array JSON
- **Propósito**: Sistema de histórico backup/alternativo para persistência apenas do frontend
- **Nota**: Menos ativamente usado, histórico N8N é primário

Ao carregar uma conversa da sidebar, a aplicação usa `fetchSessionMessages` para puxar todas as mensagens daquele `session_id` da `n8n_chat_histories`.

## Geração de Session ID

Session IDs são gerados no lado do cliente na montagem do componente:

```typescript
// ChatInterface.tsx:71
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
```

Este ID é usado durante todo o ciclo de vida da conversa para agrupar mensagens no workflow N8N e no banco de dados.

## Autenticação e Autorização

- **Provedor de Auth**: Supabase Auth
- **Perfis de Usuário**: Armazenados na tabela `profiles` com campo `role` (`admin` | `default`)
- **Proteção de Rotas**:
  - `RouteGuard.tsx` - Verifica modo de manutenção e redireciona se ativo
  - `AdminRoute.tsx` - Verifica se usuário tem `role = 'admin'` via hook `useUserRole`
  - Componente `ProtectedRoute` - Verifica sessão autenticada

### Funcionalidades de Admin
- Acesso à rota `/admin`
- Pode alternar modo de manutenção via `MaintenanceContext`
- Ver usuários online via sistema `usePresence`

## Contextos e Hooks Principais

### MaintenanceContext
- Gerencia estado global do modo de manutenção
- Lê da tabela `maintenance` (linha única com boolean `is_active`)
- Usa assinatura realtime do Supabase para sincronizar estado entre todos os clientes
- Quando ativo, `RouteGuard` redireciona usuários não-admin para página `/maintenance`

### PresenceContext
- Rastreia usuários online via hook `usePresence`
- Atualiza timestamp `profiles.last_seen` a cada 30 segundos
- Usado no painel admin para mostrar usuários ativos

### useN8nChatHistory
- Hook primário para histórico do chat
- Agrupa mensagens por `session_id` da tabela `n8n_chat_histories`
- `fetchSessionMessages(sessionId)` retorna todas mensagens de uma conversa
- `deleteSession(sessionId)` remove todas mensagens daquela sessão

### useConversationHistory
- Sistema de histórico alternativo (menos ativamente usado)
- Armazena conversas como arrays JSON na tabela `conversation_history`
- Auto-gera títulos de conversa a partir da primeira mensagem

## Detalhes Importantes de Implementação

### Limites de Mensagens
- Limite rígido: 50 mensagens por conversa (`MESSAGE_LIMIT = 50`)
- Limite de aviso: 45 mensagens (`MESSAGE_WARNING_THRESHOLD = 45`)
- Quando limite é atingido, usuário deve iniciar nova conversa

### Efeito de Digitação
Mensagens da IA são divididas por `\n\n` e transmitidas caractere por caractere:
- Cada pedaço separado por `\n\n` se torna uma bolha de mensagem separada
- Velocidade de digitação: 20ms por caractere, limitado a 3000ms total por pedaço
- Ver `streamResponseAsSeparateMessages()` em `ChatInterface.tsx:321`

### Seleção de Modelo
- Usuário pode selecionar modelo de IA via componente `ModelSelector`
- Modelo selecionado é passado para webhook N8N no campo `model`
- Workflow N8N usa isso para rotear para o LLM apropriado

### Sistema de Feedback
- Usuários podem dar thumbs up/down nas respostas da IA
- Feedback enviado para o mesmo webhook com payload contendo pergunta, resposta, avaliação
- Usado para monitorar e melhorar respostas da IA

### Estados de Carregamento
- Mensagens de carregamento dinâmicas rotacionam a cada 3s enquanto aguarda resposta da IA
- Frases: "pensando...", "realizando busca", "Já sei", "hmmm", "Estruturando a resposta..."
- Frase especial "o que a Thabata responderia?" mostrada uma vez por ciclo de carregamento

### Suporte a Upload de Arquivos
- Aceita: PNG, JPEG, GIF, PDF
- Tamanho máximo: 10MB
- Arquivos enviados como FormData para webhook
- N8N extrai conteúdo, gera embeddings, realiza busca RAG

## Schema do Banco de Dados (Tabelas Principais)

### `profiles`
- `id` (FK para auth.users)
- `email`, `name`
- `role` ('admin' | 'default')
- `last_seen` (para rastreamento de presença)
- `tokens` (integer - contagem de tokens para usuários não-admin)
- `unlimited_tokens` (boolean - flag de tokens ilimitados)

### `models`
- `id` (UUID, chave primária)
- `name` (TEXT, único - identificador técnico enviado ao N8N)
- `display_name` (TEXT - nome voltado ao usuário)
- `description` (TEXT, nullable - descrição do modelo)
- `is_public` (BOOLEAN - controle de visibilidade)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- **RLS habilitado**: Modelos públicos visíveis para todos, modelos privados apenas para admins

### `n8n_chat_histories`
- `id`, `session_id`
- `message` (JSONB - pode ser string ou objeto com content/type)
- `user_id`
- `created_at`

### `documents`
- `content` (text)
- `metadata` (JSONB)
- `embedding` (vector - para busca de similaridade RAG)

### `maintenance`
- `id`, `is_active` (boolean)

## Configuração do Supabase

O cliente Supabase é inicializado em `src/supabase/client.ts` com variáveis de ambiente:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**NOTA**: O `client.ts` atual contém credenciais hardcoded. Para deploys de produção, estas devem ser movidas para variáveis de ambiente.

## Alias de Caminho

O projeto usa `@` como alias para `src/`:
```typescript
import { Component } from "@/components/Component"
```

Configurado em `vite.config.ts` e `tsconfig.json`.

## Sistema de Seleção de Modelos

### Visão Geral
A aplicação usa um **sistema dinâmico de gerenciamento de modelos** onde cada modelo representa uma **base de conhecimento** (knowledge base). Modelos são armazenados no banco de dados e podem ser gerenciados através do painel admin com controles de visibilidade baseados nas roles dos usuários.

**Conceito Importante**: Cada modelo no sistema corresponde a um conjunto específico de documentos/conteúdo armazenado no banco de dados. Quando um usuário seleciona um modelo e faz uma pergunta, o sistema realiza busca RAG (Retrieval Augmented Generation) APENAS naquela base de conhecimento do modelo. Isso permite segregar informações da empresa por contexto, produto, departamento ou qualquer outro critério.

### Estrutura do Banco de Dados

#### Tabela `models`
```sql
- id: UUID (chave primária)
- name: TEXT (único, identificador técnico usado no N8N)
- display_name: TEXT (nome voltado ao usuário mostrado na UI)
- description: TEXT (descrição opcional)
- is_public: BOOLEAN (controle de visibilidade)
- created_at, updated_at: TIMESTAMPTZ
```

**Políticas de Row Level Security (RLS):**
- **Modelos públicos** (`is_public = true`): Visíveis para todos os usuários
- **Modelos privados** (`is_public = false`): Visíveis apenas para admins
- Apenas admins podem inserir, atualizar ou deletar modelos

### Componentes

#### Componente ModelSelector (`src/components/chat/ModelSelector.tsx`)
- Busca modelos do banco dinamicamente via hook `useModels`
- Filtra modelos automaticamente baseado na role do usuário (via RLS)
- Exibe badge "private" ao lado de modelos privados (visão apenas para admin)
- Auto-seleciona primeiro modelo disponível se seleção atual se tornar indisponível
- Estado gerenciado em `ChatLayout.tsx` e passado para `ChatInterface`
- Campo `name` do modelo é enviado com cada mensagem para webhook N8N

#### Componente ModelManagement (`src/components/admin/ModelManagement.tsx`)
Componente do painel admin para gerenciar modelos de IA:
- Visualizar todos os modelos em uma tabela
- Alternar visibilidade do modelo (público/privado) com switch
- Criar novos modelos com diálogo de formulário
- Deletar modelos existentes
- Indicadores de badge: verde "Público" ou cinza "Privado"

#### Hook useModels (`src/hooks/useModels.ts`)
Hook customizado para operações de modelo:
- `models`: Array de modelos disponíveis (filtrados por RLS)
- `loading`: Estado de carregamento
- `toggleModelVisibility(modelId, isPublic)`: Mudar visibilidade
- `addModel(name, displayName, description, isPublic)`: Criar novo modelo
- `deleteModel(modelId)`: Remover modelo
- `refreshModels()`: Recarregar lista de modelos

### Fluxo do Modelo (Seleção de Base de Conhecimento + RAG)
1. Usuário seleciona modelo no `ModelSelector` → dispara `onValueChange`
2. `ChatLayout` atualiza estado `selectedModel` via `handleModelChange`
3. Estado passado como prop para `ChatInterface`
4. Usuário submete uma pergunta
5. Campo `name` do modelo incluído no payload do webhook em três pontos:
   - Mensagens de texto (`ChatInterface.tsx:551`)
   - Uploads de arquivos (`ChatInterface.tsx:508`)
   - Sugestões de perguntas (`ChatInterface.tsx:649`)
6. **Workflow N8N recebe o nome do modelo como uma TAG**:
   - Usa campo `model` para identificar qual base de conhecimento consultar
   - Realiza busca RAG na tabela/coleção de documentos correspondente
   - Exemplo: `model: "basic"` → consulta documentos na base de conhecimento "basic"
   - Exemplo: `model: "pro"` → consulta documentos na base de conhecimento "pro"
7. N8N recupera documentos relevantes da base de conhecimento selecionada
8. LLM gera resposta baseada APENAS em documentos daquela base de conhecimento específica do modelo
9. Resposta enviada de volta ao frontend e exibida ao usuário

**Compreensão Crítica**: O campo `model` atua como um **filtro/tag** para o sistema RAG, garantindo que usuários apenas obtenham respostas da base de conhecimento específica que selecionaram.

### Adicionando Novos Modelos (Bases de Conhecimento)

**IMPORTANTE**: Antes de registrar um novo modelo, certifique-se de que você já populou sua base de conhecimento com conteúdo. Cada modelo precisa de documentos/dados no banco de dados que o sistema RAG possa consultar.

#### Workflow Completo para Adicionar um Novo Modelo:

**Passo 1: Preparar o Conteúdo da Base de Conhecimento**

Primeiro, popule seu banco de dados com os documentos/conteúdo para esta base de conhecimento. Isso pode ser feito de várias maneiras dependendo da sua configuração:

**Opção A** - Tabela separada por modelo:
```sql
-- Criar uma nova tabela para os documentos do modelo
CREATE TABLE documents_pro_v2 (
  id UUID PRIMARY KEY,
  content TEXT,
  embedding VECTOR(1536),
  metadata JSONB
);

-- Inserir documentos
INSERT INTO documents_pro_v2 (content, metadata) VALUES
  ('Conteúdo específico do Pro-v2...', '{"source": "manual.pdf"}'),
  ('Mais informações sobre Pro-v2...', '{"source": "faq.txt"}');
```

**Opção B** - Tabela única de documents com tag do modelo em metadata:
```sql
-- Usar tabela 'documents' existente com identificador do modelo em metadata
INSERT INTO documents (content, metadata, embedding) VALUES
  ('Conteúdo do Pro-v2...', '{"model": "pro-v2", "source": "manual"}', embedding_vector),
  ('Informações Pro-v2...', '{"model": "pro-v2", "source": "faq"}', embedding_vector);
```

**Passo 2: Configurar N8N para Consultar a Base de Conhecimento Correta**

No seu workflow N8N, adicione lógica para rotear consultas baseadas no campo `model`:

```javascript
// Exemplo: Nó Switch do N8N ou código
const model = $input.json.model; // Recebe "pro-v2"

// Consultar a tabela/filtro correto
if (model === 'pro-v2') {
  // Consultar tabela documents_pro_v2
  // OU filtrar documents WHERE metadata->>'model' = 'pro-v2'
}
```

**Passo 3: Registrar Modelo no Sistema**

**Opção A - Via Interface Admin (Recomendado)**:
1. Navegue para `/admin` como administrador
2. Role até a seção **"Gerenciamento de Modelos"**
3. Clique no botão **"Novo Modelo"**
4. Preencha o formulário:
   - **Nome Técnico**: `pro-v2` (deve corresponder ao que N8N espera como TAG)
     - Este valor EXATO será enviado ao N8N no webhook
     - Deve ser único, sem espaços, minúsculas recomendadas
   - **Nome de Exibição**: `Pro-v2` (nome amigável ao usuário)
   - **Descrição**: "Modelo Pro versão 2 - Base de conhecimento avançada"
   - **Visibilidade Pública**: Ative se todos os usuários devem acessar esta base de conhecimento
5. Clique em **"Criar Modelo"**
6. Modelo aparece imediatamente no `ModelSelector` para usuários autorizados

**Opção B - Via SQL (Banco de Dados Direto)**:
```sql
INSERT INTO public.models (name, display_name, description, is_public)
VALUES ('pro-v2', 'Pro-v2', 'Base de conhecimento Pro versão 2', true);
```

**Passo 4: Testar a Integração**
1. Faça login na interface do chat
2. Selecione o novo modelo no `ModelSelector`
3. Faça uma pergunta relacionada ao conteúdo que você adicionou
4. Verifique que o N8N consulta a base de conhecimento correta e retorna resultados relevantes

**Diretrizes de Campos:**
- `name`: **CRÍTICO** - Deve corresponder exatamente ao que N8N usa para identificar a base de conhecimento
  - Esta é a TAG enviada no payload do webhook
  - Deve corresponder à sua lógica de roteamento do N8N
- `display_name`: Nome amigável ao usuário exibido no dropdown
- `description`: Explique que tipo de informação esta base de conhecimento contém
- `is_public`:
  - `true` = Todos os usuários podem consultar esta base de conhecimento
  - `false` = Apenas admins podem consultar esta base de conhecimento

### Gerenciando Visibilidade de Modelos

**Para tornar um modelo privado (apenas admin):**
1. Vá para `/admin` → "Gerenciamento de Modelos"
2. Encontre o modelo na tabela
3. Alterne o **switch** para OFF (ou clique dropdown → "Tornar Privado")
4. Modelo se torna invisível para usuários não-admin imediatamente

**Para tornar um modelo público (visível para todos):**
1. Vá para `/admin` → "Gerenciamento de Modelos"
2. Encontre o modelo na tabela
3. Alterne o **switch** para ON (ou clique dropdown → "Tornar Público")
4. Modelo se torna visível para todos os usuários imediatamente

**Indicadores Visuais:**
- Admins veem um badge **"private"** ao lado de modelos privados no `ModelSelector`
- Usuários regulares não veem modelos privados de forma alguma
- No painel admin: badge verde "Público" ou badge cinza "Privado"

### Notas Importantes

- **Modelos = Bases de Conhecimento**: Cada modelo representa uma base de conhecimento separada com seus próprios documentos/conteúdo no banco de dados
- **Segregação RAG**: O sistema RAG usa o nome do modelo como um filtro/tag para consultar apenas a base de conhecimento correspondente
- **Configuração N8N Necessária**: Você deve configurar o N8N para reconhecer o nome do modelo e rotear consultas para a coleção de documentos correta
- **Conteúdo Primeiro, Registro Depois**: Sempre popule a base de conhecimento com conteúdo ANTES de registrar o modelo no painel admin
- **Campo Name é Crítico**: O campo `name` é enviado ao N8N como está e deve corresponder exatamente ao que seu workflow espera
- **Nenhuma Mudança de Código Necessária**: Modelos são totalmente dinâmicos, não são necessárias atualizações de código do frontend
- **Filtragem Automática**: Políticas RLS garantem que usuários vejam apenas bases de conhecimento autorizadas
- **Tratamento de Fallback**: Se o modelo selecionado de um usuário se tornar indisponível (deletado ou tornado privado), o sistema auto-seleciona o primeiro modelo disponível
- **Atualizações em Tempo Real**: Mudanças no painel admin refletem imediatamente em sessões de usuários (pode requerer atualização de página)
- **Casos de Uso**: Segregar conteúdo por produto, departamento, nível de acesso, versão ou qualquer critério de negócio

## Painel Administrativo

### Visão Geral
O painel administrativo (rota `/admin`) fornece gerenciamento abrangente de usuários e sistema.

### Componentes

#### ImprovedAdminPanel (`src/components/admin/ImprovedAdminPanel.tsx`)
Interface moderna baseada em tabela para gerenciamento de usuários com:
- Cards de estatísticas de usuários (Total de Usuários, Usuários Online)
- Tabela completa de usuários mostrando: nome, email, badge de role, status online, última visualização
- Menu dropdown por usuário com ações:
  - Alternar role Admin
  - Deletar usuário
- Diálogo de criar novo usuário
- Alertas de confirmação de exclusão
- Notificações toast para todas as ações

#### MaintenanceToggle (`src/components/admin/MaintenanceToggle.tsx`)
- Switch para habilitar/desabilitar modo de manutenção
- Atualiza tabela `maintenance` em tempo real
- Quando ativo, usuários não-admin são redirecionados para página `/maintenance`

#### ModelManagement (`src/components/admin/ModelManagement.tsx`)
Interface de gerenciamento de base de conhecimento para controlar disponibilidade de modelo de IA:
- Visualizar todas as bases de conhecimento registradas (modelos) em uma tabela
- Criar novos modelos (referências de base de conhecimento) via formulário de diálogo
- Alternar visibilidade público/privado com controles de switch
- Deletar modelos que não são mais necessários
- Indicadores visuais: badge verde "Público" ou badge cinza "Privado"
- Atualizações em tempo real refletidas nos dropdowns `ModelSelector` do usuário
- Gerencia a tabela `models` que serve como catálogo de bases de conhecimento disponíveis

#### UserActivityCard (`src/components/admin/UserActivityCard.tsx`)
Exibe atividade detalhada do usuário sem requerer Realtime:
- Timestamp de última visualização (formatado: "2 min atrás", "3h atrás")
- Contagem total de mensagens por usuário
- Timestamp da última mensagem
- Auto-atualiza a cada 30 segundos
- Botão de atualização manual

### Funcionalidades de Gerenciamento de Usuários
1. **Criar Usuários**: Formulário de email/senha com validação
2. **Gerenciamento de Role**: Alternância de um clique entre admin/default
3. **Deletar Usuários**: Usa função RPC `delete_user` no banco de dados
4. **Monitoramento de Atividade**: Rastreamento de atividade em tempo real via campo `last_seen`

### Debug de Role
O componente `RoleDebugger` (`src/components/debug/RoleDebugger.tsx`) pode ser temporariamente adicionado a qualquer página para:
- Exibir dados do usuário auth
- Mostrar dados da tabela de perfil
- Verificar atribuições de role
- Gerar scripts SQL de correção automaticamente

## Tratamento de Realtime e WebSocket

### Limitação Conhecida
O serviço Realtime do Supabase (WebSocket) **não está disponível** na configuração self-hosted. Isso afeta:
- `PresenceContext` - Rastreamento de usuários online
- `MaintenanceContext` - Atualizações de modo de manutenção em tempo real

### Degradação Graciosa
Ambos os contextos foram atualizados para lidar com falhas Realtime graciosamente:
- Erros são registrados como avisos (não erros)
- Conexões falhadas não quebram a aplicação
- Tentativa única de retry, então fallback gracioso
- Soluções alternativas baseadas em polling implementadas onde necessário

**PresenceContext.tsx:78-87**: Lida com estados CHANNEL_ERROR, TIMED_OUT e CLOSED
**MaintenanceContext.tsx:49-53**: Registra aviso se Realtime indisponível

## Docker e Rede

### Arquitetura
A aplicação roda em uma configuração Docker multi-container:
- **Stack Supabase**: Supabase self-hosted (PostgreSQL, Auth, Storage, etc.)
- **Stack N8N**: Automação de workflow com containers separados para editor, webhook e worker
- Cada stack tem sua própria instância PostgreSQL

### Detalhes dos Containers

**Containers Supabase:**
- `supabase-db-{INSTANCE_ID}`: PostgreSQL 15.1.1.78
  - Porta interna: 5432
  - Porta externa: 4321 (mapeada via POSTGRES_PORT_EXT)
  - Nome do serviço no docker-compose: `db`

**Containers N8N:**
- `n8n-n8n_editor-1`: UI do N8N (porta 5678)
- `n8n-n8n_webhook-1`: Manipulador de webhook (porta 5679)
- `n8n-n8n_worker-1`: Worker em background
- `n8n-n8n-postgres-1`: PostgreSQL interno do N8N (porta 5434)

### Configuração de Rede Docker

**Rede:** `supabase-{INSTANCE_ID}_default`

Para conectar N8N ao banco de dados Supabase:

```bash
# Conectar todos os containers N8N à rede Supabase
docker network connect supabase-1759154705_default n8n-n8n_editor-1
docker network connect supabase-1759154705_default n8n-n8n_webhook-1
docker network connect supabase-1759154705_default n8n-n8n_worker-1
```

### Configuração do Nó Postgres do N8N

Ao usar o nó Postgres no N8N para acessar o Supabase, você tem **duas opções**:

#### Opção 1: Usando Nome do Serviço Docker Compose (Recomendado)
```yaml
Host: db
Port: 5432
Database: postgres
User: postgres
Password: [do POSTGRES_PASSWORD no .env]
SSL Mode: disable
```

#### Opção 2: Usando Nome Completo do Container
```yaml
Host: supabase-db-1759154705
Port: 5432
Database: postgres
User: postgres
Password: [do POSTGRES_PASSWORD no .env]
SSL Mode: disable
```

**Como encontrar o nome do container:**
```bash
docker ps | grep postgres
# Procurar por: supabase-db-{INSTANCE_ID}
```

**IMPORTANTE**:
- Use porta `5432` (interna) ao conectar de containers Docker
- Use porta `4321` (externa) ao conectar de fora do Docker (DBeaver, psql, etc.)
- Use nome do serviço `db` ou nome completo do container `supabase-db-{INSTANCE_ID}` como host
- Nunca use IP externo `38.242.138.127` de dentro do Docker
- Após conectar redes Docker (veja acima), qualquer hostname funcionará

### Referência de Portas

| Serviço | Porta Interna | Porta Externa | Acesso De |
|---------|--------------|---------------|-----------|
| Supabase Postgres | 5432 | 4321 | Interno: 5432, Externo: 4321 |
| N8N Postgres | 5432 | 5434 | Interno: 5432, Externo: 5434 |
| N8N Editor | 5678 | 5678 | Ambos |
| N8N Webhook | 5678 | 5679 | Ambos |

## Solução de Problemas

### Modelo Não Enviando para Webhook
- Verificar `ChatLayout.tsx:14` - garantir que estado `selectedModel` está inicializado para `"global"`
- Verificar `ModelSelector.tsx:17` - garantir que não há atribuição hardcoded `defaultValue="global"`
- Verificar console do navegador para valor do modelo no payload do webhook

### Botão Admin Não Aparecendo
- Verificar que usuário tem `role = 'admin'` na tabela `profiles`
- Usar componente `RoleDebugger` para diagnosticar
- Verificar console do navegador para logs de `useUserRole.ts`
- Atualizar página após mudança de role

### N8N Não Consegue Conectar ao Supabase
- Verificar conexão de rede Docker (ver Configuração de Rede Docker acima)
- Usar porta interna 5432 (não 4321)
- Usar nome do serviço `db` como host
- Testar com `docker exec -it n8n-n8n_webhook-1 sh` então `nc -zv db 5432`

### Erros de Realtime
- Comportamento esperado na configuração self-hosted
- Verificar console para avisos (não erros)
- Funcionalidades de presença serão desabilitadas mas app continua funcionando
- Usar `UserActivityCard` para monitoramento de usuários ao invés de presença Realtime

## Sistema de Testes de Carga

### Visão Geral
O projeto inclui uma suite abrangente de testes de carga no diretório `load-tests/` para benchmarking de performance do sistema sob várias condições.

### Scripts de Teste Disponíveis

#### 1. `message-load-test-parallel.js`
**Propósito**: Simula usuários concorrentes enviando mensagens simultaneamente (teste de estresse)

**Uso**:
```bash
node load-tests/message-load-test-parallel.js [num-messages] [stagger-delay-ms]
```

**Parâmetros**:
- `num-messages`: Número total de mensagens para enviar concorrentemente
- `stagger-delay-ms`: Atraso em milissegundos entre disparar cada mensagem (previne sobrecarga instantânea)

**Configuração**:
- URL do Webhook: Linha 24
- IDs de Usuários de Teste: Linhas 43-49
- Modelos Disponíveis: Linha 52 (`global`, `rc-profissional`, `rc-geral`, `d&o`)
- **Timeout**: 5 minutos (300000ms) por mensagem (linha 200)

**Comportamento**:
- Dispara todas mensagens com pequenos atrasos entre elas
- Aguarda TODAS as respostas em paralelo usando `Promise.all()`
- Mede tempos de resposta individuais e throughput geral
- Calcula janela de processamento paralelo
- Testa capacidade do sistema sob carga concorrente

**Cenários de Exemplo**:
```bash
# Teste leve (5 mensagens, 500ms de atraso)
node load-tests/message-load-test-parallel.js 5 500

# Teste moderado (10 mensagens, 100ms de atraso)
node load-tests/message-load-test-parallel.js 10 100

# Teste de estresse pesado (50 mensagens, 50ms de atraso)
node load-tests/message-load-test-parallel.js 50 50

# Teste de rajada (30 mensagens, instantâneo)
node load-tests/message-load-test-parallel.js 30 0
```

#### 2. `message-load-test-with-response.js`
**Propósito**: Testa processamento sequencial de mensagens com validação completa de resposta IA

**Uso**:
```bash
node load-tests/message-load-test-with-response.js [num-messages] [interval-ms]
```

**Parâmetros**:
- `num-messages`: Número total de mensagens para enviar sequencialmente
- `interval-ms`: Tempo de espera entre mensagens (recomendado: 5000ms+)

**Configuração**:
- URL do Webhook: Linha 20
- IDs de Usuários de Teste: Linhas 39-45
- Modelos Disponíveis: Linha 48
- **Timeout**: 60 segundos por mensagem (linha 188)

**Comportamento**:
- Envia UMA mensagem por vez
- Aguarda resposta completa da IA antes de enviar próxima
- Mede tempo real de resposta da IA
- Valida qualidade e conteúdo da resposta
- Testa performance sustentada ao longo do tempo

**Cenários de Exemplo**:
```bash
# Teste básico de latência (3 mensagens, intervalo de 15s)
node load-tests/message-load-test-with-response.js 3 15000

# Teste de qualidade (5 mensagens, intervalo de 10s)
node load-tests/message-load-test-with-response.js 5 10000

# Teste de estabilidade (10 mensagens, intervalo de 5s)
node load-tests/message-load-test-with-response.js 10 5000
```

#### 3. `auth-load-test.js`
**Propósito**: Testa sistema de autenticação sob tentativas de login concorrentes

**Uso**:
```bash
node load-tests/auth-load-test.js [num-users] [interval-ms]
```

**Parâmetros**:
- `num-users`: Número de tentativas de login concorrentes
- `interval-ms`: Atraso entre tentativas de login

**Configuração**:
- URL do Supabase: Linha 17
- Chave Anon do Supabase: Linha 18
- Credenciais de Usuários de Teste: Linhas 27-38 (requer usuários pré-criados)

**Comportamento**:
- Simula múltiplos usuários fazendo login simultaneamente
- Testa performance do Supabase Auth
- Mede tempos de resposta de login
- Valida criação de sessão

**Cenários de Exemplo**:
```bash
# Teste básico de auth (5 logins, 500ms de atraso)
node load-tests/auth-load-test.js 5 500

# Carga moderada (20 logins, 100ms de atraso)
node load-tests/auth-load-test.js 20 100

# Teste de estresse (50 logins, 50ms de atraso)
node load-tests/auth-load-test.js 50 50
```

### Geração Automática de Relatórios

Todos os scripts de teste geram automaticamente relatórios detalhados usando o módulo `utils/report-generator.js`:

#### Arquivos Gerados

1. **Resultados JSON Individuais** (`load-tests/results/json/`)
   - Um arquivo JSON por execução de teste
   - Formato de nome do arquivo: `{test-type}_{timestamp}.json`
   - Contém configuração completa do teste, estatísticas, erros e respostas de amostra

2. **Relatório Markdown Consolidado** (`load-tests/results/ALL_TESTS_REPORT.md`)
   - Relatório cumulativo de TODAS as execuções de teste
   - Nunca sobrescreve - sempre adiciona novos resultados
   - Inclui análise automática com classificações de performance
   - Agrupado por tipo de teste com timestamps

3. **Resumo de Índice** (`load-tests/results/INDEX.md`)
   - Tabela de referência rápida de todos os testes
   - Mostra: data, contagem de sucesso, contagem total, taxa de sucesso
   - Agrupado por tipo de teste para fácil comparação

#### Funções do Gerador de Relatórios

Localizado em `load-tests/utils/report-generator.js`:

```javascript
// Salvar resultado individual de teste como JSON
saveTestResultJSON(testType, resultObject)

// Adicionar ao relatório Markdown consolidado
appendToConsolidatedReport(testType, resultObject)

// Atualizar índice com todos os resumos de teste
generateIndexReport()

// Opcional: Limpar resultados antigos (manter últimos N)
cleanOldResults(keepLast = 50)
```

#### Estrutura de Resultado de Teste

```javascript
{
  testType: 'message-parallel' | 'message-sequential' | 'auth-load',
  timestamp: string ISO,
  config: {
    total: number,
    interval: number,
    webhookUrl: string
  },
  total: number,
  success: number,
  failed: number,
  successRate: porcentagem,
  failureRate: porcentagem,
  times: {
    avg: milissegundos,
    min: milissegundos,
    max: milissegundos
  },
  duration: milissegundos,
  throughput: requisições por segundo,
  statusCodes: { code: count },
  errors: array (max 10),
  responses: array (max 5 amostras)
}
```

### Interpretação de Métricas de Performance

#### Taxa de Sucesso
- **100%**: Perfeito - sem falhas
- **≥90%**: Excelente - pronto para produção
- **70-90%**: Bom - aceitável com algumas falhas
- **50-70%**: Regular - precisa otimização
- **<50%**: Crítico - sistema instável

#### Tempo de Resposta
- **<3s**: Rápido - excelente experiência do usuário
- **3-10s**: Normal - performance aceitável
- **10-30s**: Lento - precisa otimização
- **>30s**: Muito Lento - problema crítico

#### Throughput
- Medido em requisições/segundo ou respostas/segundo
- Maior é melhor
- Comparar contra baseline após otimizações

### Melhores Práticas de Teste

1. **Teste Progressivo**: Comece com cargas pequenas e aumente gradualmente
2. **Timing Consistente**: Execute testes em horários similares para comparação justa
3. **Documentar Mudanças**: Anote mudanças de código antes de cada execução de teste
4. **Estabelecer Baselines**: Defina limites de performance aceitáveis
5. **Monitorar Tendências**: Use relatório consolidado para rastrear performance ao longo do tempo

### Workflows Comuns de Teste

#### Diário (Após Deploy)
```bash
node load-tests/message-load-test-parallel.js 10 100
```

#### Semanal (Abrangente)
```bash
node load-tests/auth-load-test.js 10 100
node load-tests/message-load-test-parallel.js 20 100
node load-tests/message-load-test-with-response.js 5 10000
```

#### Mensal (Benchmark Completo)
```bash
node load-tests/auth-load-test.js 20 100
node load-tests/message-load-test-parallel.js 50 100
node load-tests/message-load-test-with-response.js 10 5000
```

#### Pré-Release (Teste de Estresse)
```bash
node load-tests/auth-load-test.js 50 50
node load-tests/message-load-test-parallel.js 100 50
node load-tests/message-load-test-with-response.js 10 5000
```

### Documentação

- **`load-tests/GUIA_DE_USO_BENCHMARKS.md`**: Guia de uso abrangente com todos os cenários
- **`load-tests/GUIA_RAPIDO.md`**: Guia de início rápido para operações comuns
- **`load-tests/README.md`**: Documentação técnica e detalhes de scripts

### Solução de Problemas em Testes de Carga

#### "Cannot find module"
Certifique-se de estar no diretório correto:
```bash
cd load-tests
node message-load-test-parallel.js 10 100
```

#### Alta Taxa de Timeout
- Aumentar intervalo entre mensagens
- Reduzir número total de mensagens concorrentes
- Verificar capacidade do webhook N8N e tempos de resposta do modelo IA
- Verificar limites de conexão do banco de dados

#### Baixa Taxa de Sucesso
- Verificar logs do workflow N8N para erros
- Verificar que URL do webhook está correta e acessível
- Verificar limites de taxa do Supabase
- Garantir que IDs de usuários de teste existem no banco de dados
- Revisar recursos do servidor (CPU, memória, rede)

#### Connection Refused
- Verificar que webhook N8N está rodando e acessível
- Testar webhook manualmente: `curl -X POST {WEBHOOK_URL}`
- Verificar configurações de firewall e rede
