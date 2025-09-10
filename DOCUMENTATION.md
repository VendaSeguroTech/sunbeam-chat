# Documentação da Aplicação Sunbeam Chat

## 1. Visão Geral

O Sunbeam Chat é uma aplicação web de chat inteligente, projetada para ser uma interface de conversação com um assistente de IA. A aplicação se conecta a um backend de automação (N8N) que orquestra a lógica do chat, incluindo a integração com modelos de linguagem (LLMs) e uma base de conhecimento vetorial (RAG).

A interface é moderna e reativa, construída com React e TypeScript, e utiliza o Supabase para autenticação de usuários, armazenamento de perfis, controle de acesso e persistência do histórico de conversas.

## 2. Stack de Tecnologias

- **Frontend:**
  - **Framework:** React 18+
  - **Linguagem:** TypeScript
  - **Build Tool:** Vite
  - **Estilização:** Tailwind CSS com PostCSS
  - **Componentes UI:** shadcn/ui (Radix UI + Tailwind)
  - **Roteamento:** React Router DOM
  - **Ícones:** Lucide React

- **Backend & Serviços:**
  - **Autenticação e Banco de Dados:** Supabase
    - **Auth:** Gerenciamento de usuários e sessões.
    - **PostgreSQL:** Banco de dados relacional para armazenar perfis, históricos e documentos.
    - **Vector Extension:** Suporte para busca de similaridade em embeddings vetoriais (RAG).
    - **Realtime:** Para funcionalidades de tempo real como presença de usuários e modo de manutenção.
  - **Orquestração da Lógica de IA:** N8N
    - **Webhooks:** Endpoints que recebem as mensagens do frontend e disparam os fluxos de trabalho.

## 3. Arquitetura e Fluxo de Dados

A aplicação opera com uma arquitetura desacoplada, onde o frontend (Sunbeam Chat) é o cliente, e os serviços de backend (Supabase e N8N) lidam com a lógica de negócio e dados.

### Diagrama Simplificado do Fluxo de Chat

```
Usuário -> [1. Frontend] --Envia msg (POST)--> [2. N8N Webhook]
                                                    |
                                                    v
[4. Supabase DB] <--Consulta (RAG)-- [3. Lógica N8N] --Chama LLM--> [IA]
      ^                                     |
      |--(Salva Histórico)------------------|
      |                                     |
      `------------------(Resposta)---------`
                                                    |
                                                    v
Usuário <-- [5. Frontend] <----Recebe Resposta----- [N8N Webhook]
```

### Detalhamento do Fluxo:

1.  **Envio da Mensagem:** O usuário digita uma mensagem na `ChatInterface.tsx`. Ao enviar, uma requisição `POST` é feita para um webhook do N8N. O payload contém a mensagem, `sessionId`, `userId`, e, opcionalmente, um arquivo.
2.  **Processamento no N8N:** O workflow do N8N é ativado.
    - **RAG (Se houver arquivo/necessário):** Se um arquivo foi enviado, o N8N extrai seu conteúdo, gera um *embedding* (vetor numérico) e consulta a tabela `documents` no Supabase para encontrar documentos similares.
    - **Chamada ao LLM:** O N8N formata um prompt para o modelo de linguagem, incluindo a pergunta do usuário e o contexto recuperado (se houver), e chama a API do LLM.
    - **Persistência:** O N8N salva a pergunta do usuário e a resposta da IA na tabela `n8n_chat_histories` do Supabase.
3.  **Resposta ao Frontend:** O N8N finaliza seu fluxo e retorna a resposta gerada pela IA no corpo da resposta da requisição `POST` inicial.
4.  **Exibição no Frontend:** O `ChatInterface.tsx` recebe a resposta, processa o texto e o exibe para o usuário com um efeito de digitação.

## 4. Banco de Dados (Supabase)

O banco de dados é estruturado nas seguintes tabelas principais:

| Tabela | Descrição | Colunas Importantes |
| :--- | :--- | :--- |
| **`profiles`** | Armazena dados dos usuários. | `id` (FK para `auth.users`), `email`, `name`, `role` (`admin` ou `default`), `last_seen` (para presença). |
| **`n8n_chat_histories`** | Guarda o histórico de todas as mensagens trocadas. | `session_id` (agrupa mensagens de uma conversa), `message` (JSON com o conteúdo), `user_id`. |
| **`documents`** | Base de conhecimento para o RAG. | `content` (texto do documento), `metadata` (dados adicionais), `embedding` (vetor para busca). |
| **`maintenance`** | Controla o estado do modo de manutenção. | `is_active` (booleano). |

## 5. Funcionalidades Detalhadas

- **Autenticação:** Gerenciada pelo Supabase Auth. O `RouteGuard.tsx` e `AdminRoute.tsx` protegem as rotas, verificando se o usuário está logado e se tem a permissão necessária (`admin`).
- **Histórico de Chat:** O hook `useN8nChatHistory` busca as conversas do usuário no Supabase e as exibe na barra lateral. Clicar em uma conversa carrega as mensagens antigas.
- **Presença de Usuários:** O hook `usePresence` atualiza a cada 30 segundos a coluna `last_seen` do usuário logado. O painel de admin provavelmente lê essa tabela para mostrar usuários ativos.
- **Painel Administrativo:** Acessível apenas por usuários com `role = 'admin'`. Atualmente, contém o controle do Modo Manutenção.
- **Modo Manutenção:** Quando ativado por um admin, o `RouteGuard.tsx` redireciona todos os usuários (exceto admins na própria página `/admin`) para uma página de "Sistema em Manutenção", bloqueando o uso da aplicação. O estado é controlado pela tabela `maintenance` e distribuído em tempo real pelo `MaintenanceContext`.
- **Feedback de Mensagens:** O usuário pode avaliar as respostas da IA. Essa avaliação é enviada para um webhook específico do N8N para fins de monitoramento e análise.

## 6. Estrutura de Arquivos

```
/src
├── assets/             # Imagens, logos e outros arquivos estáticos.
├── components/         # Componentes React reutilizáveis.
│   ├── admin/          # Componentes específicos do painel de admin.
│   ├── auth/           # Componentes de autenticação (Login, RouteGuard).
│   ├── chat/           # Componentes principais da interface de chat.
│   ├── ui/             # Componentes base da biblioteca shadcn/ui.
│   └── ...
├── contexts/           # Contextos React para gerenciamento de estado global.
│   ├── PresenceContext.tsx # (Não totalmente explorado, mas relacionado à presença).
│   └── MaintenanceContext.tsx # Provê o estado do modo manutenção para a aplicação.
├── hooks/              # Hooks customizados para encapsular lógicas.
│   ├── useN8nChatHistory.ts # Lógica para buscar e gerenciar o histórico de conversas do N8N.
│   ├── useUserRole.ts  # Verifica no Supabase se o usuário é admin.
│   ├── usePresence.ts  # Gerencia a atualização da presença do usuário.
│   └── ...
├── lib/                # Funções utilitárias.
│   └── utils.ts        # Utilitários gerais (ex: `cn` para classes CSS).
├── pages/              # Componentes que representam as páginas da aplicação.
│   ├── Admin.tsx       # Página do painel administrativo.
│   └── maintenance.tsx # Página exibida durante o modo de manutenção.
├── supabase/           # Configuração do cliente Supabase.
│   └── client.ts       # Inicializa e exporta o cliente Supabase.
├── types/              # Definições de tipos TypeScript.
│   ├── chat.ts         # Tipos relacionados ao chat (Message, Session, etc).
│   └── user.ts         # Tipos relacionados ao usuário.
├── App.tsx             # Componente raiz, define as rotas principais.
└── main.tsx            # Ponto de entrada da aplicação, renderiza o App e os providers globais.
```

## 7. Guia de Instalação e Execução

1.  **Clonar o Repositório:**
    ```bash
    git clone <url-do-repositorio>
    cd sunbeam-chat
    ```

2.  **Instalar Dependências:**
    ```bash
    npm install
    ```

3.  **Configurar Variáveis de Ambiente:**
    Crie um arquivo `.env` na raiz do projeto e adicione as credenciais do seu projeto Supabase:
    ```
    VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
    VITE_SUPABASE_ANON_KEY=<sua-chave-anon>
    ```
    *Substitua pelos valores encontrados em "Project Settings" > "API" no seu painel Supabase.*

4.  **Configurar o Banco de Dados Supabase:**
    - Execute os scripts SQL (fornecidos anteriormente) para criar as tabelas `profiles`, `n8n_chat_histories`, `documents` e `maintenance`.
    - Certifique-se de que a Row Level Security (RLS) está configurada corretamente.

5.  **Executar a Aplicação em Modo de Desenvolvimento:**
    ```bash
    npm run dev
    ```
    A aplicação estará disponível em `http://localhost:5173` (ou outra porta, se a 5173 estiver em uso).
