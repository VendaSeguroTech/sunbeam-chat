# Scripts de Teste de Carga

Esta pasta contém scripts para realizar testes de carga e estresse no sistema de chat.

## 📋 Pré-requisitos

1. **Node.js** instalado (v14 ou superior)
2. **Dependências do Supabase**:
   ```bash
   npm install @supabase/supabase-js
   ```

3. **Usuários de teste criados** no Supabase:
   - test1@example.com
   - test2@example.com
   - test3@example.com
   - test4@example.com
   - test5@example.com

   Todos com senha: `password123`

4. **Variáveis de ambiente configuradas**:
   ```bash
   export VITE_SUPABASE_URL="sua-url-supabase"
   export VITE_SUPABASE_ANON_KEY="sua-anon-key"
   ```

   Ou edite diretamente nos scripts substituindo:
   - `YOUR_SUPABASE_URL`
   - `YOUR_SUPABASE_ANON_KEY`

## 🧪 Scripts Disponíveis

### 1. Teste de Autenticação (`auth-load-test.js`)

Simula múltiplos logins simultâneos no sistema.

**Uso:**
```bash
node auth-load-test.js [número-de-logins] [intervalo-ms]
```

**Exemplos:**
```bash
# 10 logins com intervalo de 100ms entre cada um
node auth-load-test.js 10 100

# 50 logins com intervalo de 50ms
node auth-load-test.js 50 50

# Teste extremo: 100 logins com 10ms de intervalo
node auth-load-test.js 100 10
```

**O que ele testa:**
- ✅ Taxa de sucesso de autenticação
- ✅ Tempo médio de login
- ✅ Capacidade do Supabase Auth lidar com logins simultâneos
- ✅ Latência mínima/máxima

---

### 2. Teste de Mensagens (`message-load-test.js`)

Simula múltiplos usuários enviando mensagens para o webhook N8N.

**Uso:**
```bash
node message-load-test.js [número-de-mensagens] [intervalo-ms]
```

**Exemplos:**
```bash
# 20 mensagens com intervalo de 200ms
node message-load-test.js 20 200

# 100 mensagens com intervalo de 100ms
node message-load-test.js 100 100

# Teste extremo: 500 mensagens com 50ms de intervalo
node message-load-test.js 500 50
```

**O que ele testa:**
- ✅ Taxa de sucesso do webhook N8N
- ✅ Tempo de resposta do N8N
- ✅ Capacidade de processar mensagens simultâneas
- ✅ Estabilidade do workflow N8N
- ✅ Códigos HTTP retornados

---

### 3. Teste de Estresse Combinado (`combined-stress-test.js`)

Simula cenário real: usuários fazendo login e enviando mensagens simultaneamente.

**Uso:**
```bash
node combined-stress-test.js [número-de-usuários] [mensagens-por-usuário]
```

**Exemplos:**
```bash
# 5 usuários, cada um enviando 3 mensagens
node combined-stress-test.js 5 3

# 10 usuários, cada um enviando 5 mensagens (50 mensagens totais)
node combined-stress-test.js 10 5

# Teste extremo: 20 usuários, 10 mensagens cada (200 mensagens)
node combined-stress-test.js 20 10
```

**O que ele testa:**
- ✅ Fluxo completo: Login → Mensagens → Logout
- ✅ Comportamento do sistema sob carga realística
- ✅ Integração entre Supabase Auth e N8N Webhook
- ✅ Performance end-to-end
- ✅ Avaliação geral do sistema

---

## 📊 Interpretando os Resultados

### Métricas Importantes

1. **Taxa de Sucesso**
   - ≥95% = Excelente ✅
   - 80-95% = Bom ⚠️ (algumas falhas)
   - 60-80% = Regular ⚠️ (muitas falhas)
   - <60% = Crítico ❌ (sistema instável)

2. **Tempo de Resposta**
   - <500ms = Rápido ✅
   - 500-1500ms = Aceitável ⚠️
   - >1500ms = Lento ❌

3. **Taxa de Requisições (req/s)**
   - Indica quantas requisições o sistema processa por segundo
   - Quanto maior, melhor a capacidade do sistema

### Códigos HTTP Comuns

- **200**: Sucesso ✅
- **429**: Too Many Requests (limite de taxa) ⚠️
- **500**: Erro interno do servidor ❌
- **503**: Serviço indisponível ❌
- **Timeout**: Requisição demorou muito ❌

---

## 🎯 Cenários de Teste Recomendados

### Teste Leve (Desenvolvimento)
```bash
# Testar funcionalidade básica
node auth-load-test.js 5 500
node message-load-test.js 10 500
node combined-stress-test.js 3 2
```

### Teste Médio (Staging)
```bash
# Simular uso normal
node auth-load-test.js 20 200
node message-load-test.js 50 200
node combined-stress-test.js 10 5
```

### Teste Pesado (Produção)
```bash
# Testar limites do sistema
node auth-load-test.js 50 100
node message-load-test.js 200 100
node combined-stress-test.js 20 10
```

### Teste Extremo (Stress Test)
```bash
# Encontrar ponto de quebra
node auth-load-test.js 100 10
node message-load-test.js 500 50
node combined-stress-test.js 50 10
```

---

## ⚠️ Avisos Importantes

1. **Não execute em produção sem avisar**
   - Testes de carga podem afetar usuários reais
   - Use ambiente de staging sempre que possível

2. **Rate Limits**
   - Supabase tem limites de taxa no plano gratuito
   - N8N pode ter limitações dependendo do plano
   - Monitore os logs para evitar bloqueios

3. **Custos**
   - Testes de carga consomem recursos
   - Verifique limites do seu plano antes de executar

4. **Preparação**
   - Crie usuários de teste antes de rodar os scripts
   - Verifique se todos os serviços estão funcionando
   - Monitore o banco de dados durante os testes

---

## 🔧 Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
```bash
npm install @supabase/supabase-js
```

### "YOUR_SUPABASE_URL is not defined"
Configure as variáveis de ambiente ou edite os scripts diretamente.

### "ECONNREFUSED" ou "Timeout"
- Verifique se o webhook N8N está acessível
- Verifique se o Supabase está online
- Reduza o número de requisições simultâneas

### Taxa de falha muito alta
- Reduza o número de requisições simultâneas
- Aumente o intervalo entre requisições
- Verifique logs do servidor para identificar gargalos

---

## 📈 Próximos Passos

Após executar os testes, você pode:

1. **Identificar gargalos**
   - Qual componente está mais lento?
   - Onde ocorrem mais erros?

2. **Otimizar performance**
   - Adicionar cache
   - Otimizar queries do banco
   - Escalar recursos do servidor

3. **Configurar alertas**
   - Monitorar taxa de erro
   - Alertar quando tempo de resposta aumentar
   - Notificar sobre indisponibilidade

4. **Documentar limites**
   - Quantos usuários simultâneos o sistema suporta?
   - Qual a taxa máxima de mensagens/segundo?
   - Quando é necessário escalar?

---

## 📞 Suporte

Se encontrar problemas ou tiver dúvidas sobre os testes de carga, verifique:

- Logs do Supabase Dashboard
- Logs do N8N workflow
- Network tab do navegador (para testes manuais)
- Console do servidor

---

**Última atualização:** 2025-10-13
