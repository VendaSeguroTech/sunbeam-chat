# 🚀 Guia Rápido - Testes de Carga com Relatórios Automáticos

## 📋 O que foi implementado

Todos os scripts de teste agora **salvam automaticamente** os resultados em:

### 📁 Estrutura de Arquivos Gerados

```
load-tests/
├── results/
│   ├── json/                              # JSONs individuais de cada teste
│   │   ├── message-parallel_2025-01-13T15-30-00.json
│   │   ├── message-sequential_2025-01-13T15-45-00.json
│   │   └── ...
│   ├── ALL_TESTS_REPORT.md               # Relatório consolidado (TODOS os testes)
│   └── INDEX.md                           # Índice com resumo de todos os testes
```

### 📊 O que é salvo automaticamente:

1. **JSON Individual** (um por execução):
   - Configuração do teste
   - Estatísticas completas
   - Tempos de resposta
   - Erros detalhados
   - Exemplos de respostas

2. **Relatório Consolidado** (`ALL_TESTS_REPORT.md`):
   - Histórico de TODOS os testes
   - Análise automática de cada execução
   - Métricas comparativas
   - **SEM sobrescrever** - sempre adiciona ao final

3. **Índice** (`INDEX.md`):
   - Tabela resumida de todos os testes
   - Agrupado por tipo de teste
   - Taxa de sucesso de cada execução

---

## 🎯 Como Usar

### 1. Execute qualquer teste normalmente:

```bash
# Teste paralelo (mensagens simultâneas)
node message-load-test-parallel.js 10 100

# Teste sequencial (uma por vez)
node message-load-test-with-response.js 5 3000
```

### 2. Os resultados são salvos automaticamente!

Ao final de cada teste, você verá:

```
💾 Salvando resultados...

💾 Resultado salvo em: results/json/message-parallel_2025-01-13T15-30-00-123Z.json
📝 Relatório consolidado atualizado: results/ALL_TESTS_REPORT.md
📑 Índice atualizado: results/INDEX.md

✅ Resultados salvos com sucesso!
```

---

## 📖 Visualizando os Resultados

### Opção 1: Relatório Consolidado (Recomendado)

Abra o arquivo **`results/ALL_TESTS_REPORT.md`**

Ele contém:
- ✅ Histórico completo de TODOS os testes
- 📊 Gráficos e tabelas de cada execução
- 💡 Análise automática (Excelente/Bom/Regular/Crítico)
- ⏱️ Métricas de performance
- ❌ Detalhes de erros

**Exemplo de entrada no relatório:**

```markdown
## 🔥 Teste de Mensagens Paralelas - 13/01/2025 15:30:00

### Configuração
- Total de operações: 10
- Delay entre disparos: 100ms
- Webhook: https://webhook.vendaseguro.tech/...

### Resultados
| Métrica | Valor |
|---------|-------|
| ✅ Sucessos | 9 (90.0%) |
| ❌ Falhas | 1 (10.0%) |
| 📊 Total | 10 |

### Métricas de Performance
| Métrica | Tempo |
|---------|-------|
| ⚡ Tempo Médio | 5.23s |
| 🚀 Tempo Mínimo | 3.45s |
| 🐌 Tempo Máximo | 8.12s |

### 💡 Análise
✅ **Muito Bom:** Taxa de sucesso acima de 90%
⚡ **Performance:** Normal (3-10s por operação)
```

### Opção 2: Índice Resumido

Abra **`results/INDEX.md`** para ver tabela resumida:

```markdown
## 🔥 Teste de Mensagens Paralelas

| Data | Sucesso | Total | Taxa |
|------|---------|-------|------|
| 13/01/2025 15:30 | 9 | 10 | ✅ 90.0% |
| 13/01/2025 14:15 | 8 | 10 | ⚠️ 80.0% |
| 13/01/2025 10:00 | 10 | 10 | ✅ 100.0% |
```

### Opção 3: JSON Individual

Para análise programática, use os JSONs em `results/json/`:

```json
{
  "testType": "message-parallel",
  "timestamp": "2025-01-13T15:30:00.123Z",
  "config": {
    "total": 10,
    "staggerDelay": 100,
    "webhookUrl": "https://..."
  },
  "total": 10,
  "success": 9,
  "failed": 1,
  "successRate": 90.0,
  "times": {
    "avg": 5230,
    "min": 3450,
    "max": 8120
  },
  "errors": [...]
}
```

---

## 🔍 Comparando Resultados

### Ver evolução ao longo do tempo:

1. Abra `results/ALL_TESTS_REPORT.md`
2. Procure pelo tipo de teste que deseja analisar
3. Compare as execuções mais recentes com as antigas
4. Veja se a performance melhorou ou piorou

### Exemplo de análise:

```
Teste 1 (10/01): ✅ 95% sucesso, 4.5s médio
Teste 2 (11/01): ⚠️ 80% sucesso, 7.2s médio  ← Piorou!
Teste 3 (13/01): ✅ 98% sucesso, 3.8s médio  ← Melhorou!
```

---

## 🧹 Limpeza de Resultados Antigos

Os arquivos são mantidos **indefinidamente** por padrão.

Se quiser limpar manualmente:

```bash
# Deletar todos os JSONs antigos
rm -rf results/json/*

# Recomeçar o relatório consolidado
rm results/ALL_TESTS_REPORT.md
rm results/INDEX.md
```

---

## 📈 Métricas Importantes

### Taxa de Sucesso
- **100%** = Perfeito ✅
- **≥90%** = Excelente ✅
- **70-90%** = Bom ⚠️
- **50-70%** = Regular ⚠️
- **<50%** = Crítico ❌

### Tempo de Resposta
- **<3s** = Rápido ⚡
- **3-10s** = Normal ⚡
- **10-30s** = Lento ⚠️
- **>30s** = Muito Lento ❌

---

## 🎯 Casos de Uso

### 1. Testar após cada deploy

```bash
# Após fazer deploy, rode teste básico
node message-load-test-parallel.js 5 100

# Confira o relatório para ver se manteve a qualidade
cat results/ALL_TESTS_REPORT.md
```

### 2. Benchmark mensal

```bash
# Todo mês, rode teste padrão
node message-load-test-parallel.js 20 100

# Compare com mês anterior no relatório consolidado
```

### 3. Teste antes/depois de otimização

```bash
# Antes da otimização
node message-load-test-with-response.js 10 5000

# Fazer otimização...

# Depois da otimização
node message-load-test-with-response.js 10 5000

# Comparar os dois últimos resultados no relatório
```

---

## 🆘 Troubleshooting

### "Cannot find module './utils/report-generator.js'"

Certifique-se que a estrutura de pastas está correta:
```
load-tests/
├── utils/
│   └── report-generator.js   ← Precisa existir
├── message-load-test-parallel.js
└── ...
```

### "ENOENT: no such file or directory"

O script cria automaticamente a pasta `results/`. Se der erro:
```bash
mkdir -p load-tests/results/json
```

### Relatório não é gerado

Verifique no console se aparece:
```
💾 Salvando resultados...
✅ Resultados salvos com sucesso!
```

Se não aparecer, o teste pode ter falhado antes de salvar.

---

## 💡 Dicas

1. **Sempre rode testes em horários similares** para comparação justa
2. **Documente mudanças** que você fez antes de cada teste
3. **Mantenha o relatório consolidado** como documentação do sistema
4. **Compare tendências** ao invés de resultados isolados
5. **Use o índice** para encontrar rapidamente testes específicos

---

**Última atualização:** 2025-01-13
