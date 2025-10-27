# Documentação Completa do Fluxo de SSO - Hub VendaSeguro & Experta AI

## Introdução

Este documento detalha o fluxo de autenticação via Single Sign-On (SSO) entre o Hub VendaSeguro (baseado em WordPress) e a aplicação Experta AI (React/Node.js). O objetivo é permitir que um usuário logado no Hub acesse a Experta AI de forma transparente, sem a necessidade de um novo login.

A arquitetura se baseia em um token de uso único, criptografado, que é validado por um serviço de backend antes de criar uma sessão de usuário na aplicação final.

---

## Parte 1: O Hub (WordPress) - Geração e Injeção do Token

O processo começa no ambiente do Hub, que é responsável por gerar a "chave" de acesso para o usuário.

### Arquivos Relevantes:
- `plugin-sso/plugin_isw_sso.php`: O plugin principal do WordPress que gerencia o SSO no Hub.
- `plugin-sso/isw-sso-tokens.js`: Script (ou parte dele) que é injetado nas páginas do Hub.

### Como Funciona:

1.  **Login do Usuário no Hub**: Quando um usuário faz login no WordPress, a função `isw_user_login` no `plugin_isw_sso.php` é acionada.
2.  **Criação do Token**: Um token único é gerado (`md5(uniqid(...))`) e armazenado no banco de dados do WordPress, associado ao e-mail do usuário e com um tempo de expiração (geralmente 3 horas).
3.  **Criptografia**: As informações do usuário (token, ID, e-mail) são concatenadas (ex: `token|id|email`) e criptografadas usando `AES-256-CBC`. O resultado é o **token criptografado** que será usado para o SSO.
4.  **Injeção nos Links**: O `plugin_isw_sso.php` injeta um script JavaScript nas páginas do Hub. Este script:
    *   Contém o token criptografado do usuário logado.
    *   Procura por links específicos na página que levam a outras aplicações, como a Experta AI. Esses links são identificados por um atributo especial, como `isw_action_link="experta"`.
    *   Dinamicamente, o script adiciona o token criptografado e um timestamp (`ts`) como parâmetros na URL do link.

O resultado é que o link para a Experta AI, que originalmente seria `https://experta.vendaseguro.com.br`, transforma-se em algo como `https://experta.vendaseguro.com.br/?sso=1&token=TOKEN_CRIPTOFRAFADO&ts=12345678`.

---

## Parte 2: A Transição - O Clique e o Redirecionamento

Esta é a ponte entre o Hub e a aplicação Experta AI.

1.  **Ação do Usuário**: O usuário clica no link da Experta AI, já modificado pelo script do passo anterior.
2.  **Navegação**: O navegador é direcionado para a URL da Experta AI contendo os parâmetros de SSO.

---

## Parte 3: O Frontend (React) - Captura e Delegação

A aplicação React é a porta de entrada, mas ela não lida diretamente com a lógica de validação. Sua principal função é capturar os parâmetros e delegar a tarefa para o backend.

### Componentes React Envolvidos:
- `src/App.tsx`: Onde a estrutura de rotas da aplicação é definida.
- `src/components/auth/SSORedirect.tsx`: Componente responsável por fazer a "ponte" para o backend.

### Como Funciona:

1.  **Roteador Principal (`App.tsx`)**:
    *   A rota raiz (`/`) da aplicação agora possui um componente (`Root`) que inspeciona a URL da página.
    *   Ele verifica se os parâmetros `sso` e `token` existem.
    *   Se existirem, em vez de carregar a aplicação de chat, ele redireciona o navegador para a rota interna `/sso/redirect`, mantendo os parâmetros da URL.
2.  **Delegação para o Backend (`SSORedirect.tsx`)**:
    *   Este componente é renderizado pela rota `/sso/redirect`.
    *   Sua única função é ler os parâmetros (`sso`, `token`, `ts`) da URL e imediatamente realizar um redirecionamento completo do navegador para o serviço de backend, no endpoint `/sso/callback`.
    *   **Ponto Crítico**: O React nunca descriptografa ou valida o token. Ele atua como um intermediário, passando a responsabilidade para o backend, que é um ambiente mais seguro.

---

## Parte 4: O Backend (Node.js) - Validação e Login

É aqui que a "mágica" da autenticação acontece. Este serviço é o cérebro do processo de SSO no lado da Experta AI.

### Arquivo Principal:
- `api/sso-server-simple.js`

### Como Funciona:

1.  **Recebimento do Token**: O endpoint `/sso/callback` recebe a requisição do frontend com os parâmetros de SSO.
2.  **Validação Externa**: O backend faz uma chamada para a API do Hub (`/isw_api/isw_validar_usuario.php`), enviando o token original. O Hub verifica se o token é válido e responde "liberado" ou "negado". Se for negado, o processo para.
3.  **Descriptografia**: Se o token foi "liberado", o backend usa a chave de criptografia (`isw_venda_seguro`) para descriptografar o token e extrair as informações do usuário (e-mail, ID, etc.).
4.  **Verificação de Permissão no Banco (`findUserByEmail`)**:
    *   O backend pega o e-mail do usuário e faz uma consulta na tabela `profiles` do banco de dados Supabase.
    *   **Se o e-mail não for encontrado**, o acesso é bloqueado e o servidor retorna a página "Acesso Negado" que estilizamos.
5.  **Criação da Sessão**:
    *   **Se o e-mail for encontrado**, o login é autorizado.
    *   O backend cria um JWT (JSON Web Token) de sessão próprio e o armazena em um **cookie `HttpOnly`** chamado `vs_session`. `HttpOnly` significa que o cookie não pode ser acessado por JavaScript no navegador, tornando-o mais seguro.
6.  **Redirecionamento Final**: O backend envia uma resposta de redirecionamento para o navegador, instruindo-o a ir para a página `/chat`.

---

## Parte 5: Acesso Final à Aplicação

O usuário agora tem a sessão, mas a aplicação precisa confirmar isso a cada página carregada.

### Componentes Envolvidos:
- `src/components/auth/ProtectedRouteSSO.tsx`
- `src/hooks/useAuth.ts`

### Como Funciona:

1.  **Navegação para `/chat`**: O navegador, após ser redirecionado pelo backend, acessa a rota `/chat`.
2.  **Proteção da Rota (`ProtectedRouteSSO`)**: Esta rota é protegida. O componente `ProtectedRouteSSO` é ativado e utiliza o hook `useAuth` para verificar se o usuário está autenticado.
3.  **Verificação da Sessão (`useAuth`)**:
    *   O hook `useAuth` faz uma chamada para a API do backend no endpoint `/api/me`.
    *   Ao fazer essa chamada, o navegador **envia automaticamente o cookie `vs_session`** que foi criado no passo anterior.
4.  **Confirmação no Backend**: O endpoint `/api/me` no backend recebe o cookie, valida-o e, se for válido, retorna as informações do usuário (ID, e-mail).
5.  **Acesso Liberado**: O frontend recebe a confirmação de que o usuário está autenticado e finalmente renderiza a interface do chat.

Se o cookie for inválido, expirado ou não existir, o `/api/me` retorna um erro, e o `ProtectedRouteSSO` redireciona o usuário para a tela de login.

---

## Apêndice: Arquivos da Pasta `plugin-sso`

-   `plugin_isw_sso.php`: **Não é usado diretamente pela Experta AI**. É o plugin que deve ser instalado no **WordPress (Hub)** para gerar os tokens.
-   `plugin_isw_sso_melhor_produto.php`: **Não é usado**. É um exemplo de como um *outro* site WordPress (o "Melhor Produto") validaria um token vindo do Hub. Serve apenas como referência de uma implementação alternativa.
-   `isw-sso-tokens.js`: **Não é usado diretamente pela Experta AI**. É o script que o `plugin_isw_sso.php` injeta nas páginas do Hub para adicionar os tokens aos links.
-   `teste.php`: Arquivo vazio, sem utilidade.
