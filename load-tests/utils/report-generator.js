/**
 * Gerador de Relatórios de Testes de Carga
 *
 * Salva resultados em JSON e gera relatório em Markdown
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório para salvar os resultados
const RESULTS_DIR = path.join(__dirname, '..', 'results');
const JSON_DIR = path.join(RESULTS_DIR, 'json');
const REPORTS_FILE = path.join(RESULTS_DIR, 'ALL_TESTS_REPORT.md');

/**
 * Garante que os diretórios existem
 */
function ensureDirectories() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(JSON_DIR)) {
    fs.mkdirSync(JSON_DIR, { recursive: true });
  }
}

/**
 * Salva resultado em JSON
 */
export function saveTestResultJSON(testType, result) {
  ensureDirectories();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${testType}_${timestamp}.json`;
  const filepath = path.join(JSON_DIR, filename);

  const data = {
    testType,
    timestamp: new Date().toISOString(),
    ...result
  };

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n💾 Resultado salvo em: ${filepath}`);

  return filepath;
}

/**
 * Adiciona resultado ao relatório consolidado em Markdown
 */
export function appendToConsolidatedReport(testType, result) {
  ensureDirectories();

  const timestamp = new Date().toISOString();
  const date = new Date().toLocaleString('pt-BR');

  let reportContent = '';

  // Se o arquivo não existe, criar cabeçalho
  if (!fs.existsSync(REPORTS_FILE)) {
    reportContent = `# 📊 Relatório Consolidado de Testes de Carga

**Sistema:** Sunbeam Chat
**Gerado automaticamente pelos scripts de teste**

---

`;
  }

  // Adicionar novo resultado
  reportContent += `
## 🧪 ${getTestTypeLabel(testType)} - ${date}

### Configuração
${generateConfigSection(testType, result)}

### Resultados
${generateResultsSection(testType, result)}

### Métricas de Performance
${generateMetricsSection(testType, result)}

${generateAnalysisSection(testType, result)}

---

`;

  // Append ao arquivo
  fs.appendFileSync(REPORTS_FILE, reportContent, 'utf8');
  console.log(`📝 Relatório consolidado atualizado: ${REPORTS_FILE}`);
}

/**
 * Retorna label do tipo de teste
 */
function getTestTypeLabel(testType) {
  const labels = {
    'auth-load': '🔐 Teste de Autenticação',
    'message-sequential': '📨 Teste de Mensagens Sequencial',
    'message-parallel': '🔥 Teste de Mensagens Paralelas',
    'combined-stress': '⚡ Teste de Estresse Combinado'
  };
  return labels[testType] || testType;
}

/**
 * Gera seção de configuração
 */
function generateConfigSection(testType, result) {
  let config = '';

  if (result.config) {
    config += `- **Total de operações:** ${result.config.total || 'N/A'}\n`;
    if (result.config.interval) {
      config += `- **Intervalo:** ${result.config.interval}ms\n`;
    }
    if (result.config.staggerDelay) {
      config += `- **Delay entre disparos:** ${result.config.staggerDelay}ms\n`;
    }
    if (result.config.webhookUrl) {
      config += `- **Webhook:** ${result.config.webhookUrl}\n`;
    }
    if (result.config.supabaseUrl) {
      config += `- **Supabase:** ${result.config.supabaseUrl}\n`;
    }
  }

  return config || '- *Não disponível*';
}

/**
 * Gera seção de resultados
 */
function generateResultsSection(testType, result) {
  let results = '';

  results += `| Métrica | Valor |\n`;
  results += `|---------|-------|\n`;
  results += `| ✅ **Sucessos** | ${result.success} (${result.successRate?.toFixed(1)}%) |\n`;
  results += `| ❌ **Falhas** | ${result.failed} (${result.failureRate?.toFixed(1)}%) |\n`;
  results += `| 📊 **Total** | ${result.total} |\n`;

  if (result.statusCodes) {
    results += `\n**Códigos HTTP:**\n`;
    Object.entries(result.statusCodes).forEach(([code, count]) => {
      const emoji = code >= 200 && code < 300 ? '✅' : '❌';
      results += `- ${emoji} ${code}: ${count}\n`;
    });
  }

  return results;
}

/**
 * Gera seção de métricas
 */
function generateMetricsSection(testType, result) {
  let metrics = '';

  if (result.times) {
    metrics += `| Métrica | Tempo |\n`;
    metrics += `|---------|-------|\n`;
    metrics += `| ⚡ **Tempo Médio** | ${(result.times.avg / 1000).toFixed(2)}s |\n`;
    metrics += `| 🚀 **Tempo Mínimo** | ${(result.times.min / 1000).toFixed(2)}s |\n`;
    metrics += `| 🐌 **Tempo Máximo** | ${(result.times.max / 1000).toFixed(2)}s |\n`;
  }

  if (result.duration) {
    metrics += `| ⏱️ **Duração Total** | ${(result.duration / 1000).toFixed(2)}s |\n`;
  }

  if (result.throughput) {
    metrics += `| 📈 **Throughput** | ${result.throughput.toFixed(2)} req/s |\n`;
  }

  if (result.parallelWindow) {
    metrics += `| 🔄 **Janela Paralela** | ${(result.parallelWindow / 1000).toFixed(2)}s |\n`;
  }

  return metrics || '- *Não disponível*';
}

/**
 * Gera seção de análise
 */
function generateAnalysisSection(testType, result) {
  let analysis = '### 💡 Análise\n\n';

  const successRate = result.successRate || 0;
  const avgTime = result.times?.avg || 0;

  // Análise de taxa de sucesso
  if (successRate === 100) {
    analysis += '✅ **Excelente:** 100% de sucesso!\n\n';
  } else if (successRate >= 90) {
    analysis += '✅ **Muito Bom:** Taxa de sucesso acima de 90%\n\n';
  } else if (successRate >= 70) {
    analysis += '⚠️ **Bom:** Taxa de sucesso entre 70-90%, algumas falhas detectadas\n\n';
  } else if (successRate >= 50) {
    analysis += '⚠️ **Regular:** Taxa de sucesso entre 50-70%, muitas falhas\n\n';
  } else {
    analysis += '❌ **Crítico:** Taxa de sucesso abaixo de 50%, sistema instável\n\n';
  }

  // Análise de performance
  if (avgTime > 0) {
    if (avgTime < 3000) {
      analysis += '⚡ **Performance:** Excelente (< 3s por operação)\n\n';
    } else if (avgTime < 10000) {
      analysis += '⚡ **Performance:** Normal (3-10s por operação)\n\n';
    } else if (avgTime < 30000) {
      analysis += '⚠️ **Performance:** Lenta (10-30s por operação)\n\n';
    } else {
      analysis += '❌ **Performance:** Muito lenta (> 30s por operação)\n\n';
    }
  }

  // Erros
  if (result.errors && result.errors.length > 0) {
    analysis += `**Erros encontrados:** ${result.errors.length}\n\n`;
    analysis += '<details>\n<summary>Ver detalhes dos erros</summary>\n\n';
    result.errors.slice(0, 5).forEach((error, i) => {
      analysis += `${i + 1}. ${error.error || error.message || JSON.stringify(error)}\n`;
    });
    if (result.errors.length > 5) {
      analysis += `\n... e mais ${result.errors.length - 5} erros\n`;
    }
    analysis += '\n</details>\n\n';
  }

  return analysis;
}

/**
 * Gera índice de todos os testes
 */
export function generateIndexReport() {
  ensureDirectories();

  // Listar todos os JSONs
  const jsonFiles = fs.readdirSync(JSON_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const filepath = path.join(JSON_DIR, f);
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      return {
        filename: f,
        testType: data.testType,
        timestamp: data.timestamp,
        success: data.success,
        total: data.total,
        successRate: data.successRate
      };
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const indexPath = path.join(RESULTS_DIR, 'INDEX.md');

  let content = `# 📑 Índice de Todos os Testes

**Total de testes executados:** ${jsonFiles.length}

---

`;

  // Agrupar por tipo de teste
  const groupedByType = {};
  jsonFiles.forEach(test => {
    if (!groupedByType[test.testType]) {
      groupedByType[test.testType] = [];
    }
    groupedByType[test.testType].push(test);
  });

  Object.entries(groupedByType).forEach(([testType, tests]) => {
    content += `\n## ${getTestTypeLabel(testType)}\n\n`;
    content += `| Data | Sucesso | Total | Taxa |\n`;
    content += `|------|---------|-------|------|\n`;

    tests.forEach(test => {
      const date = new Date(test.timestamp).toLocaleString('pt-BR');
      const emoji = test.successRate >= 90 ? '✅' : test.successRate >= 70 ? '⚠️' : '❌';
      content += `| ${date} | ${test.success} | ${test.total} | ${emoji} ${test.successRate.toFixed(1)}% |\n`;
    });
  });

  content += `\n---\n\n*Relatórios gerados automaticamente*\n`;

  fs.writeFileSync(indexPath, content, 'utf8');
  console.log(`📑 Índice atualizado: ${indexPath}`);
}

/**
 * Limpa resultados antigos (mantém últimos N)
 */
export function cleanOldResults(keepLast = 50) {
  ensureDirectories();

  const jsonFiles = fs.readdirSync(JSON_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      filename: f,
      filepath: path.join(JSON_DIR, f),
      mtime: fs.statSync(path.join(JSON_DIR, f)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (jsonFiles.length > keepLast) {
    const toDelete = jsonFiles.slice(keepLast);
    toDelete.forEach(file => {
      fs.unlinkSync(file.filepath);
      console.log(`🗑️ Removido: ${file.filename}`);
    });
    console.log(`✅ Limpeza concluída: mantidos ${keepLast} testes mais recentes`);
  }
}
