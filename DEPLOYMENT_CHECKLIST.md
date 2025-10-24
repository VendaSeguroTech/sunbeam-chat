# SSO Deployment Checklist

Este documento lista todos os passos necessários para colocar o sistema de SSO em produção.

## ✅ Checklist Completo

### 1. Configuração do Backend (API Node.js)

- [ ] **Instalar dependências da API**
  ```bash
  cd api
  npm install
  ```

- [ ] **Configurar variáveis de ambiente**
  - [ ] Criar arquivo `.env` a partir de `.env.example`
  - [ ] Adicionar `SUPABASE_URL` (da dashboard do Supabase)
  - [ ] Adicionar `SUPABASE_SERVICE_KEY` (service_role key, NÃO anon key)
  - [ ] Definir `PORT` (padrão: 3001)
  - [ ] Confirmar `ENCRYPTION_KEY` (deve ser `isw_venda_seguro`)

- [ ] **Testar localmente**
  ```bash
  npm start
  ```
  - [ ] Verificar se servidor inicia sem erros
  - [ ] Confirmar que a porta está disponível
  - [ ] Testar endpoint com curl

- [ ] **Deploy em produção**
  - [ ] Escolher plataforma (VPS, Heroku, Railway, Render, etc.)
  - [ ] Configurar variáveis de ambiente no servidor
  - [ ] Fazer deploy da aplicação
  - [ ] Configurar PM2 ou similar para manter servidor ativo
  - [ ] Configurar proxy reverso (Nginx/Apache) se necessário
  - [ ] Configurar SSL/HTTPS (obrigatório!)
  - [ ] Anotar URL final da API (ex: `https://sso-api.suaempresa.com`)

### 2. Configuração do Frontend

- [ ] **Atualizar variáveis de ambiente do frontend**
  - [ ] Criar/editar arquivo `.env` na raiz do projeto
  - [ ] Adicionar `VITE_SSO_API_URL` com a URL da API em produção

  Exemplo:
  ```env
  VITE_SUPABASE_URL=https://seu-projeto.supabase.co
  VITE_SUPABASE_ANON_KEY=sua_anon_key
  VITE_SSO_API_URL=https://sso-api.suaempresa.com
  ```

- [ ] **Testar integração local**
  - [ ] Iniciar API Node.js (`cd api && npm start`)
  - [ ] Iniciar frontend (`npm run dev`)
  - [ ] Obter token de teste do Hub
  - [ ] Acessar `http://localhost:8080/?token=TOKEN_TESTE`
  - [ ] Verificar se auto-login funciona

- [ ] **Build e deploy do frontend**
  ```bash
  npm run build
  ```
  - [ ] Fazer deploy do build
  - [ ] Confirmar que variáveis de ambiente foram aplicadas

### 3. Configuração do Hub VendaSeguro

- [ ] **Adicionar card da IA Experta**
  - [ ] Acessar admin do Hub VendaSeguro
  - [ ] Criar novo card com:
    - **Título**: IA Experta
    - **URL**: `https://sua-app.com/` (URL do frontend em produção)
    - **ISW Action**: `melhor_produto` (ou criar novo)
    - **Ícone**: Upload do ícone da IA

- [ ] **Testar geração de token**
  - [ ] Fazer login no Hub
  - [ ] Verificar se token aparece na URL ao clicar no card
  - [ ] Confirmar formato: `?token=...&ts=...`

### 4. Testes de Integração Completa

- [ ] **Teste 1: Login via Hub (usuário existente)**
  - [ ] Login no Hub VendaSeguro
  - [ ] Clicar no card da IA Experta
  - [ ] Verificar se é redirecionado para a IA
  - [ ] Confirmar que está logado automaticamente
  - [ ] Verificar se perfil do usuário aparece correto
  - [ ] Testar envio de mensagem no chat

- [ ] **Teste 2: Login via Hub (usuário novo)**
  - [ ] Login no Hub com conta que nunca acessou a IA
  - [ ] Clicar no card da IA Experta
  - [ ] Verificar se usuário é criado automaticamente
  - [ ] Confirmar que está logado
  - [ ] Verificar se perfil foi criado corretamente no Supabase

- [ ] **Teste 3: Token inválido/expirado**
  - [ ] Tentar acessar com token antigo ou modificado
  - [ ] Confirmar que é redirecionado para `/login`
  - [ ] Verificar que mensagem de erro apropriada aparece

- [ ] **Teste 4: Sessão persistente**
  - [ ] Login via Hub
  - [ ] Fechar e reabrir navegador
  - [ ] Verificar se sessão persiste
  - [ ] Testar refresh da página

### 5. Segurança

- [ ] **Variáveis de Ambiente**
  - [ ] Confirmar que `.env` está no `.gitignore`
  - [ ] Verificar que nenhuma credencial está hardcoded no código
  - [ ] Confirmar que `SUPABASE_SERVICE_KEY` nunca é exposta no frontend

- [ ] **HTTPS**
  - [ ] API Node.js está atrás de HTTPS (via proxy ou plataforma)
  - [ ] Frontend está servido via HTTPS
  - [ ] Certificados SSL válidos

- [ ] **CORS**
  - [ ] API aceita requisições do domínio do frontend
  - [ ] Headers CORS configurados corretamente

### 6. Monitoramento

- [ ] **Logs**
  - [ ] Configurar sistema de logs (PM2, CloudWatch, etc.)
  - [ ] Testar acesso aos logs
  - [ ] Configurar alertas para erros críticos

- [ ] **Performance**
  - [ ] Monitorar tempo de resposta da API
  - [ ] Verificar taxa de sucesso de autenticação
  - [ ] Configurar métricas de uso

### 7. Documentação

- [ ] **Atualizar documentação**
  - [ ] Adicionar URLs de produção
  - [ ] Documentar processo de rollback
  - [ ] Criar runbook para troubleshooting
  - [ ] Documentar contatos de suporte

- [ ] **Treinamento**
  - [ ] Treinar equipe de suporte sobre fluxo SSO
  - [ ] Criar FAQ para usuários
  - [ ] Documentar problemas comuns e soluções

## 📋 Informações de Produção

Preencha após deploy:

| Item | Valor |
|------|-------|
| **URL da API SSO** | `https://___________________` |
| **URL do Frontend** | `https://___________________` |
| **URL do Hub** | `https://hub.vendaseguro.com.br` |
| **Servidor da API** | _________________________ |
| **Plataforma do Frontend** | _________________________ |
| **Data do Deploy** | _________________________ |
| **Versão** | _________________________ |

## 🆘 Troubleshooting Rápido

### Usuário não consegue logar via Hub

1. Verificar se API está rodando: `curl https://sua-api.com`
2. Ver logs da API: `pm2 logs sso-validation`
3. Verificar se token está sendo enviado na URL
4. Testar endpoint do Hub manualmente
5. Confirmar credenciais do Supabase

### Token sempre inválido

1. Verificar se `ENCRYPTION_KEY` está correta em ambos os lados
2. Confirmar que Hub e API usam mesma chave
3. Testar descriptografia manualmente
4. Verificar formato do token (deve ter `;` separador)

### Usuário criado mas não loga

1. Verificar se magic link é gerado corretamente
2. Verificar logs do Supabase Auth
3. Confirmar que `SUPABASE_SERVICE_KEY` tem permissões admin
4. Testar criação de usuário manualmente

### Performance lenta

1. Verificar latência da API (deve ser <1s)
2. Verificar resposta do endpoint do Hub
3. Otimizar queries do Supabase se necessário
4. Verificar recursos do servidor (CPU, memória)

## 🎯 Próximos Passos Após Deploy

1. Monitorar logs nas primeiras 24h
2. Coletar feedback dos primeiros usuários
3. Ajustar timeouts se necessário
4. Considerar cache para melhorar performance
5. Planejar estratégia de backup

## ✅ Deploy Completo

Quando todos os itens acima estiverem marcados, o sistema SSO estará pronto para produção!

**Data de conclusão**: _______________

**Responsável**: _______________

**Notas adicionais**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
