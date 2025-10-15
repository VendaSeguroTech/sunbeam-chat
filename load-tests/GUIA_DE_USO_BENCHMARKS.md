# 📊 Guia Completo de Uso dos Benchmarks

## 🎯 Scripts Disponíveis

### 1. `message-load-test-parallel.js`
**Descrição**: Envia múltiplas mensagens simultaneamente ao webhook N8N

**Sintaxe**:
```bash
node message-load-test-parallel.js [número-de-mensagens] [intervalo-ms]
```

**Parâmetros**:
- **Primeiro parâmetro**: Número total de mensagens a enviar
- **Segundo parâmetro**: Intervalo em milissegundos entre cada disparo

---

### 2. `message-load-test-with-response.js`
**Descrição**: Envia mensagens sequencialmente, aguardando a resposta completa da IA antes de enviar a próxima

**Sintaxe**:
```bash
node message-load-test-with-response.js [número-de-mensagens] [intervalo-ms]
```

**Parâmetros**:
- **Primeiro parâmetro**: Número total de mensagens a enviar
- **Segundo parâmetro**: Intervalo em milissegundos entre cada mensagem (recomendado: 5000ms+)

---

### 3. `auth-load-test.js`
**Descrição**: Simula múltiplos logins simultâneos no sistema

**Sintaxe**:
```bash
node auth-load-test.js [número-de-usuários] [intervalo-ms]
```

**Parâmetros**:
- **Primeiro parâmetro**: Número de tentativas de login
- **Segundo parâmetro**: Intervalo em milissegundos entre cada login

---

## 📋 Cenários de Teste - `message-load-test-parallel.js`

### 1️⃣ **Teste Leve** (Validação básica)
```bash
node message-load-test-parallel.js 5 500
```
- ✅ 5 mensagens simultâneas
- ✅ 500ms entre cada disparo
- 🎯 **Uso**: Teste rápido após deploy, validação básica
- ⏱️ **Duração**: ~2-3 segundos

### 2️⃣ **Teste Moderado** (Uso normal)
```bash
node message-load-test-parallel.js 10 100
```
- ✅ 10 mensagens simultâneas
- ✅ 100ms entre disparos
- 🎯 **Uso**: Simula carga média de usuários
- ⏱️ **Duração**: ~1 segundo para disparar todas

### 3️⃣ **Teste Pesado** (Stress test)
```bash
node message-load-test-parallel.js 50 50
```
- ✅ 50 mensagens simultâneas
- ✅ 50ms entre disparos (muito rápido)
- 🎯 **Uso**: Testa limites do sistema
- ⏱️ **Duração**: ~2.5 segundos para disparar

### 4️⃣ **Teste Extremo** (Capacidade máxima)
```bash
node message-load-test-parallel.js 100 10
```
- ✅ 100 mensagens simultâneas
- ✅ 10ms entre disparos (quase instantâneo)
- 🎯 **Uso**: Descobre o ponto de quebra
- ⏱️ **Duração**: ~1 segundo para disparar todas

### 5️⃣ **Teste de Espaçamento** (Simulação realista)
```bash
node message-load-test-parallel.js 20 1000
```
- ✅ 20 mensagens simultâneas
- ✅ 1000ms (1s) entre disparos
- 🎯 **Uso**: Simula usuários reais com tempo de digitação
- ⏱️ **Duração**: ~20 segundos para disparar todas

### 6️⃣ **Teste de Pico** (Burst de tráfego)
```bash
node message-load-test-parallel.js 30 0
```
- ✅ 30 mensagens simultâneas
- ✅ 0ms entre disparos (todas de uma vez)
- 🎯 **Uso**: Simula pico súbito de acessos
- ⏱️ **Duração**: Instantâneo

---

## 📋 Cenários de Teste - `message-load-test-with-response.js`

### 1️⃣ **Teste de Latência Básico**
```bash
node message-load-test-with-response.js 3 15000
```
- ✅ 3 mensagens sequenciais
- ✅ 15 segundos entre cada mensagem
- 🎯 **Uso**: Medir tempo real de resposta da IA
- ⏱️ **Duração**: ~30-45 segundos

### 2️⃣ **Teste de Qualidade de Respostas**
```bash
node message-load-test-with-response.js 5 10000
```
- ✅ 5 mensagens sequenciais
- ✅ 10 segundos entre cada mensagem
- 🎯 **Uso**: Verificar qualidade e consistência das respostas
- ⏱️ **Duração**: ~40-60 segundos

### 3️⃣ **Teste de Estabilidade Prolongado**
```bash
node message-load-test-with-response.js 10 5000
```
- ✅ 10 mensagens sequenciais
- ✅ 5 segundos entre cada mensagem
- 🎯 **Uso**: Testar estabilidade ao longo do tempo
- ⏱️ **Duração**: ~45-90 segundos

---

## 📋 Cenários de Teste - `auth-load-test.js`

### 1️⃣ **Teste Básico de Login**
```bash
node auth-load-test.js 5 500
```
- ✅ 5 tentativas de login
- ✅ 500ms entre cada tentativa
- 🎯 **Uso**: Validar autenticação básica
- ⏱️ **Duração**: ~2-3 segundos

### 2️⃣ **Teste de Carga Moderada**
```bash
node auth-load-test.js 20 100
```
- ✅ 20 tentativas de login
- ✅ 100ms entre cada tentativa
- 🎯 **Uso**: Simular múltiplos usuários logando ao mesmo tempo
- ⏱️ **Duração**: ~2-4 segundos

### 3️⃣ **Stress Test de Autenticação**
```bash
node auth-load-test.js 50 50
```
- ✅ 50 tentativas de login
- ✅ 50ms entre cada tentativa
- 🎯 **Uso**: Testar limites do sistema de autenticação
- ⏱️ **Duração**: ~2.5-5 segundos

---

## 🎯 Como Escolher os Parâmetros

### **Primeiro Parâmetro** (Número de operações)
- **5-10**: Teste leve, validação rápida
- **10-30**: Teste moderado, uso normal
- **30-50**: Teste pesado, stress
- **50-100+**: Teste extremo, capacidade máxima

### **Segundo Parâmetro** (Intervalo em ms)
- **0-50ms**: Disparo quase simultâneo (muito agressivo)
- **50-200ms**: Rápido, simula usuários muito ativos
- **200-500ms**: Moderado, uso normal
- **500-1000ms**: Espaçado, mais realista
- **1000ms+**: Muito espaçado, simula comportamento natural

---

## 📈 Estratégias de Teste

### **Encontrar Taxa de Sucesso Ideal**
Comece pequeno e vá aumentando progressivamente:

```bash
node message-load-test-parallel.js 5 100
node message-load-test-parallel.js 10 100
node message-load-test-parallel.js 20 100
node message-load-test-parallel.js 50 100
```

### **Testar Latência sob Carga**
Fixe as mensagens, varie o intervalo:

```bash
node message-load-test-parallel.js 20 0
node message-load-test-parallel.js 20 50
node message-load-test-parallel.js 20 100
node message-load-test-parallel.js 20 500
```

### **Simular Horário de Pico**
Muitas mensagens, pouco espaço:

```bash
node message-load-test-parallel.js 50 100
```

### **Benchmark Diário**
Teste padrão repetível para comparação:

```bash
node message-load-test-parallel.js 20 200
```

### **Teste de Regressão**
Após mudanças no código, execute:

```bash
# Teste rápido
node message-load-test-parallel.js 10 100

# Teste de autenticação
node auth-load-test.js 10 100

# Teste de resposta
node message-load-test-with-response.js 3 15000
```

---

## 💡 Dicas Práticas

### ✅ **Melhores Práticas**
1. **Sempre comece pequeno** e aumente gradualmente
2. **Compare resultados** no `results/ALL_TESTS_REPORT.md`
3. **Rode testes em horários similares** para comparação justa
4. **Documente mudanças** no código antes de cada teste
5. **Use o mesmo comando mensalmente** para ver evolução

### ⚠️ **Cuidados**
1. **Intervalos menores = mais agressivo**, maior chance de timeout
2. **Mais mensagens ≠ melhor teste** - encontre o ponto ideal
3. **Não rode testes extremos em produção** durante horário de pico
4. **Verifique os logs** para entender falhas específicas

### 📊 **Interpretação de Resultados**
- **Taxa de Sucesso**:
  - ✅ **100%** = Perfeito
  - ✅ **≥90%** = Excelente
  - ⚠️ **70-90%** = Bom (algumas falhas)
  - ⚠️ **50-70%** = Regular (muitas falhas)
  - ❌ **<50%** = Crítico (sistema instável)

- **Tempo de Resposta**:
  - ⚡ **<3s** = Rápido
  - ⚡ **3-10s** = Normal
  - ⚠️ **10-30s** = Lento
  - ❌ **>30s** = Muito Lento

---

## ⚙️ Limites e Configurações

### **Limites Recomendados**
- **Máximo seguro**: `node message-load-test-parallel.js 100 50`
- **Acima disso**: Risco de derrubar o serviço temporariamente
- **Webhook timeout**: 60 segundos (configurado no script)

### **Configurações Importantes**
- **Webhook URL**: Definida em cada script (linhas 17-20)
- **User IDs de Teste**: Definidos em `TEST_USER_IDS` (linhas 39-45)
- **Timeout por Mensagem**: 60 segundos (linha 188 do `message-load-test-with-response.js`)

---

## 📁 Localização dos Resultados

Todos os testes salvam automaticamente em:

```
load-tests/
├── results/
│   ├── json/                              # JSONs individuais
│   │   ├── message-parallel_2025-01-13T15-30-00.json
│   │   ├── message-sequential_2025-01-13T15-45-00.json
│   │   └── auth-load_2025-01-13T16-00-00.json
│   ├── ALL_TESTS_REPORT.md               # Relatório consolidado
│   └── INDEX.md                           # Índice resumido
```

### **Visualizar Resultados**
```bash
# Ver relatório consolidado
cat results/ALL_TESTS_REPORT.md

# Ver índice resumido
cat results/INDEX.md

# Ver JSON específico
cat results/json/message-parallel_[timestamp].json
```

---

## 🔄 Rotina de Testes Sugerida

### **Diariamente** (Após deploy)
```bash
node message-load-test-parallel.js 10 100
```

### **Semanalmente** (Teste mais completo)
```bash
node auth-load-test.js 10 100
node message-load-test-parallel.js 20 100
node message-load-test-with-response.js 5 10000
```

### **Mensalmente** (Benchmark completo)
```bash
node auth-load-test.js 20 100
node message-load-test-parallel.js 50 100
node message-load-test-with-response.js 10 5000
```

### **Antes de Release** (Stress test completo)
```bash
node auth-load-test.js 50 50
node message-load-test-parallel.js 100 50
node message-load-test-with-response.js 10 5000
```

---

## 🆘 Troubleshooting

### **"Cannot find module"**
Certifique-se que está na pasta correta:
```bash
cd load-tests
node message-load-test-parallel.js 10 100
```

### **"Connection refused"**
Verifique se o webhook N8N está ativo:
```bash
curl https://webhook.vendaseguro.tech/webhook/...
```

### **"Timeout" frequente**
- Aumente o intervalo entre mensagens
- Reduza o número total de mensagens
- Verifique a capacidade do servidor

### **Taxa de sucesso baixa**
- Verifique logs do N8N
- Aumente o intervalo entre disparos
- Verifique rate limits do Supabase

---

## 📚 Documentação Adicional

- **`GUIA_RAPIDO.md`**: Guia rápido de início
- **`README.md`**: Documentação completa dos scripts
- **`results/ALL_TESTS_REPORT.md`**: Histórico de todos os testes
- **`results/INDEX.md`**: Índice resumido

---

**Última atualização**: 2025-01-14
**Versão**: 1.0
