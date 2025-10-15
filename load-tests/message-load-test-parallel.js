/**
 * Script de Teste de Carga - Mensagens PARALELAS com Resposta da IA
 *
 * Envia múltiplas mensagens SIMULTANEAMENTE e aguarda todas as respostas
 * Simula pico de carga com vários usuários enviando mensagens ao mesmo tempo
 *
 * Uso:
 *   node message-load-test-parallel.js [número-de-mensagens] [delay-inicial-ms]
 *
 * Exemplo:
 *   node message-load-test-parallel.js 10 100
 *
 * NOTA:
 * - As mensagens são enviadas quase ao mesmo tempo
 * - delay-inicial-ms é apenas um pequeno atraso entre disparos (padrão: 50ms)
 * - Todas aguardam resposta em paralelo (timeout: 60s cada)
 */

import https from 'https';
import http from 'http';
import { saveTestResultJSON, appendToConsolidatedReport, generateIndexReport } from './utils/report-generator.js';

// Configuração
const WEBHOOK_URL = 'https://webhook.vendaseguro.tech/webhook/0fc3496c-5dfa-4772-8661-da71da6353c7';
const NUM_MESSAGES = parseInt(process.argv[2]) || 5;
const STAGGER_DELAY_MS = parseInt(process.argv[3]) || 50; // Pequeno delay entre disparos

// Mensagens de teste variadas
const TEST_MESSAGES = [
  'Olá, tudo bem?',
  'Qual a diferença entre RC Profissional e RC Geral?',
  'Quais seguradoras aceitam médicos?',
  'Quanto custa um seguro de responsabilidade civil?',
  'Como funciona o processo de contratação?',
  'Qual o prazo de vigência do seguro?',
  'Preciso de cobertura internacional?',
  'Como faço para acionar o seguro?',
  'Quais documentos são necessários?',
  'O seguro cobre erros e omissões?',
];

// User IDs reais
const TEST_USER_IDS = [
  'a4440859-d8e4-47da-ab71-b9cf6998ebec',
  '5bf87856-aeda-429b-a8e4-a15886deb67f',
  'ceed9704-3ba0-4be1-b001-ea9923ae9a1d',
  '881f4ac0-29b9-46bb-857c-57eaa624f9a0',
  'd13a3817-460e-48f1-a2e8-b2d80b023ad7',
];

// Modelos disponíveis
const MODELS = ['global', 'rc-profissional', 'rc-geral', 'd&o'];

// Estatísticas
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  times: [],
  errors: [],
  statusCodes: {},
  responses: [],
  startTimes: [],
  endTimes: []
};

/**
 * Gera um session_id único
 */
function generateSessionId() {
  return `parallel_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Envia uma mensagem para o webhook N8N e aguarda a resposta completa da IA
 */
async function sendMessageAndWaitForResponse(messageIndex) {
  const message = TEST_MESSAGES[messageIndex % TEST_MESSAGES.length];
  const userId = TEST_USER_IDS[messageIndex % TEST_USER_IDS.length];
  const model = MODELS[messageIndex % MODELS.length];
  const sessionId = generateSessionId();

  const payload = JSON.stringify({
    message: message,
    timestamp: new Date().toISOString(),
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId: sessionId,
    userId: userId,
    type: 'text',
    model: model
  });

  const url = new URL(WEBHOOK_URL);
  const protocol = url.protocol === 'https:' ? https : http;

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const startTime = Date.now();
  stats.startTimes.push(startTime);

  console.log(`🚀 [${messageIndex + 1}] DISPARADO: "${message.substring(0, 40)}..." (${model})`);

  return new Promise((resolve) => {
    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;
        const endTime = Date.now();
        stats.endTimes.push(endTime);
        stats.total++;
        stats.statusCodes[res.statusCode] = (stats.statusCodes[res.statusCode] || 0) + 1;

        if (res.statusCode >= 200 && res.statusCode < 300) {
          stats.success++;
          stats.times.push(duration);

          // Tentar extrair a resposta
          let aiResponse = '';
          try {
            const jsonResponse = JSON.parse(data);
            aiResponse = jsonResponse.output || jsonResponse.response || jsonResponse.message || data;
          } catch (e) {
            aiResponse = data;
          }

          const preview = aiResponse.substring(0, 80) + (aiResponse.length > 80 ? '...' : '');
          stats.responses.push({
            messageIndex,
            question: message,
            answer: aiResponse,
            duration,
            model
          });

          console.log(`   ✅ [${messageIndex + 1}] RESPONDIDO em ${(duration/1000).toFixed(1)}s - "${preview}"`);
        } else {
          stats.failed++;
          stats.errors.push({
            messageIndex,
            userId,
            message: message.substring(0, 50),
            statusCode: res.statusCode,
            error: `HTTP ${res.statusCode}`,
            response: data.substring(0, 200)
          });
          console.log(`   ❌ [${messageIndex + 1}] ERRO HTTP ${res.statusCode} em ${(duration/1000).toFixed(1)}s`);
        }

        resolve({ success: res.statusCode >= 200 && res.statusCode < 300, duration });
      });
    });

    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      const endTime = Date.now();
      stats.endTimes.push(endTime);
      stats.total++;
      stats.failed++;
      stats.errors.push({
        messageIndex,
        userId,
        message: message.substring(0, 50),
        error: error.message
      });
      console.log(`   ❌ [${messageIndex + 1}] ERRO DE CONEXÃO: ${error.message}`);
      resolve({ success: false, duration });
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - startTime;
      const endTime = Date.now();
      stats.endTimes.push(endTime);
      stats.total++;
      stats.failed++;
      stats.errors.push({
        messageIndex,
        userId,
        message: message.substring(0, 50),
        error: 'Timeout (>5min)'
      });
      console.log(`   ⏱️ [${messageIndex + 1}] TIMEOUT: Sem resposta em 5min`);
      resolve({ success: false, duration });
    });

    req.setTimeout(300000); // 5min timeout
    req.write(payload);
    req.end();
  });
}

/**
 * Executa o teste de carga PARALELO
 */
async function runParallelLoadTest() {
  console.log('\n🔥 Iniciando Teste de Carga PARALELA - Mensagens Simultâneas\n');
  console.log(`📊 Configuração:`);
  console.log(`   - Número de mensagens SIMULTÂNEAS: ${NUM_MESSAGES}`);
  console.log(`   - Delay entre disparos: ${STAGGER_DELAY_MS}ms`);
  console.log(`   - Timeout por mensagem: 60s`);
  console.log(`   - Webhook URL: ${WEBHOOK_URL}`);
  console.log(`   - Usuários: ${TEST_USER_IDS.length}`);
  console.log(`   - Modelos: ${MODELS.join(', ')}\n`);

  console.log(`⚠️  ATENÇÃO: Este teste simula um PICO DE CARGA!`);
  console.log(`   Todas as ${NUM_MESSAGES} mensagens serão enviadas quase simultaneamente.\n`);
  console.log('═'.repeat(100));
  console.log('\n📤 DISPARANDO MENSAGENS...\n');

  const overallStartTime = Date.now();

  // Disparar todas as mensagens com pequeno delay entre elas
  const promises = [];
  for (let i = 0; i < NUM_MESSAGES; i++) {
    promises.push(sendMessageAndWaitForResponse(i));

    // Pequeno delay para não sobrecarregar instantaneamente
    if (i < NUM_MESSAGES - 1) {
      await new Promise(resolve => setTimeout(resolve, STAGGER_DELAY_MS));
    }
  }

  console.log(`\n⏳ Todas as ${NUM_MESSAGES} mensagens foram disparadas!`);
  console.log(`💭 Aguardando respostas... (pode levar até 60s por mensagem)\n`);

  // Aguardar TODAS as respostas
  await Promise.all(promises);

  const overallEndTime = Date.now();
  const totalDuration = overallEndTime - overallStartTime;

  // Calcular estatísticas
  const avgTime = stats.times.length > 0
    ? (stats.times.reduce((a, b) => a + b, 0) / stats.times.length).toFixed(2)
    : 0;

  const minTime = stats.times.length > 0 ? Math.min(...stats.times) : 0;
  const maxTime = stats.times.length > 0 ? Math.max(...stats.times) : 0;

  // Calcular paralelismo real
  const firstStart = Math.min(...stats.startTimes);
  const lastEnd = Math.max(...stats.endTimes);
  const actualConcurrentWindow = lastEnd - firstStart;

  // Exibir resultados
  console.log('\n');
  console.log('═'.repeat(100));
  console.log('\n📊 RESULTADOS DO TESTE PARALELO\n');
  console.log(`⏱️  Tempo total (disparo + espera): ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`⏱️  Janela de processamento paralelo: ${(actualConcurrentWindow / 1000).toFixed(2)}s`);
  console.log(`📊 Total de mensagens: ${stats.total}`);
  console.log(`✅ Sucessos: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(1)}%)`);
  console.log(`❌ Falhas: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);

  console.log(`\n📡 Status HTTP:`);
  Object.entries(stats.statusCodes).forEach(([code, count]) => {
    const emoji = code >= 200 && code < 300 ? '✅' : '❌';
    console.log(`   ${emoji} ${code}: ${count} (${((count / stats.total) * 100).toFixed(1)}%)`);
  });

  console.log(`\n⚡ Tempos de Resposta Individual:`);
  console.log(`   - Média: ${avgTime}ms (${(avgTime/1000).toFixed(1)}s)`);
  console.log(`   - Mínimo: ${minTime}ms (${(minTime/1000).toFixed(1)}s)`);
  console.log(`   - Máximo: ${maxTime}ms (${(maxTime/1000).toFixed(1)}s)`);

  console.log(`\n🚀 Capacidade de Paralelismo:`);
  console.log(`   - Mensagens simultâneas: ${NUM_MESSAGES}`);
  console.log(`   - Throughput: ${(stats.total / (actualConcurrentWindow / 1000)).toFixed(2)} respostas/s`);

  if (stats.success > 0) {
    const avgTimeSeconds = avgTime / 1000;
    const theoreticalCapacity = Math.floor(60 / avgTimeSeconds);
    console.log(`   - Capacidade teórica: ~${theoreticalCapacity} mensagens/minuto por worker`);
  }

  if (stats.responses.length > 0) {
    console.log(`\n💬 Distribuição das Respostas por Modelo:`);
    const modelStats = {};
    stats.responses.forEach(({ model }) => {
      modelStats[model] = (modelStats[model] || 0) + 1;
    });
    Object.entries(modelStats).forEach(([model, count]) => {
      console.log(`   - ${model}: ${count} respostas`);
    });

    console.log(`\n💬 Exemplos de Respostas (primeiras 3):`);
    stats.responses.slice(0, 3).forEach(({ messageIndex, question, answer, duration, model }, index) => {
      console.log(`\n   ${index + 1}. [${messageIndex + 1}] "${question}" (${model})`);
      console.log(`      Tempo: ${(duration/1000).toFixed(1)}s`);
      console.log(`      Resposta: "${answer.substring(0, 120)}${answer.length > 120 ? '...' : ''}"`);
    });
  }

  if (stats.errors.length > 0) {
    console.log(`\n❌ Erros Encontrados (${stats.errors.length} total):`);
    stats.errors.slice(0, 5).forEach(({ messageIndex, message, error, response }) => {
      console.log(`\n   [${messageIndex + 1}] "${message}"`);
      console.log(`      Erro: ${error}`);
      if (response) {
        console.log(`      Resposta: ${response.substring(0, 80)}`);
      }
    });
    if (stats.errors.length > 5) {
      console.log(`\n   ... e mais ${stats.errors.length - 5} erros`);
    }
  }

  // Avaliação
  console.log('\n' + '═'.repeat(100));
  console.log('\n🎯 AVALIAÇÃO DO SISTEMA SOB CARGA PARALELA:\n');

  const successRate = stats.success / stats.total;

  if (successRate === 1) {
    console.log('   ✅ EXCELENTE: Sistema suportou 100% das requisições paralelas!');
  } else if (successRate >= 0.9) {
    console.log('   ✅ MUITO BOM: Mais de 90% de sucesso sob carga paralela');
  } else if (successRate >= 0.7) {
    console.log('   ⚠️  BOM: 70-90% de sucesso, algumas falhas sob carga');
  } else if (successRate >= 0.5) {
    console.log('   ⚠️  REGULAR: 50-70% de sucesso, sistema com dificuldades');
  } else {
    console.log('   ❌ CRÍTICO: Menos de 50% de sucesso - sistema não suporta esta carga');
  }

  if (avgTime > 0) {
    if (avgTime < 5000) {
      console.log(`   ⚡ Velocidade sob carga: EXCELENTE (média ${(avgTime/1000).toFixed(1)}s)`);
    } else if (avgTime < 15000) {
      console.log(`   ⚡ Velocidade sob carga: BOA (média ${(avgTime/1000).toFixed(1)}s)`);
    } else if (avgTime < 30000) {
      console.log(`   ⚠️  Velocidade sob carga: LENTA (média ${(avgTime/1000).toFixed(1)}s)`);
    } else {
      console.log(`   ❌ Velocidade sob carga: MUITO LENTA (média ${(avgTime/1000).toFixed(1)}s)`);
    }
  }

  if (stats.failed > 0) {
    console.log(`\n   💡 Recomendações:`);
    if (stats.errors.some(e => e.error.includes('Timeout'))) {
      console.log(`      - Aumentar timeout do webhook ou otimizar processamento da IA`);
    }
    if (stats.errors.some(e => e.statusCode === 429 || e.statusCode === 503)) {
      console.log(`      - Sistema atingiu limite de capacidade - considere escalabilidade`);
    }
    if (successRate < 0.7) {
      console.log(`      - Reduzir carga paralela ou aumentar recursos do servidor`);
    }
  }

  console.log('\n' + '═'.repeat(100) + '\n');

  // Salvar resultados
  const testResult = {
    config: {
      total: NUM_MESSAGES,
      staggerDelay: STAGGER_DELAY_MS,
      webhookUrl: WEBHOOK_URL
    },
    total: stats.total,
    success: stats.success,
    failed: stats.failed,
    successRate: (stats.success / stats.total) * 100,
    failureRate: (stats.failed / stats.total) * 100,
    times: {
      avg: parseFloat(avgTime),
      min: minTime,
      max: maxTime
    },
    duration: totalDuration,
    parallelWindow: actualConcurrentWindow,
    throughput: stats.total / (actualConcurrentWindow / 1000),
    statusCodes: stats.statusCodes,
    errors: stats.errors.slice(0, 10), // Primeiros 10 erros
    responses: stats.responses.slice(0, 5).map(r => ({
      question: r.question.substring(0, 100),
      answer: r.answer.substring(0, 200),
      duration: r.duration,
      model: r.model
    }))
  };

  console.log('💾 Salvando resultados...\n');
  saveTestResultJSON('message-parallel', testResult);
  appendToConsolidatedReport('message-parallel', testResult);
  generateIndexReport();

  console.log('\n✅ Resultados salvos com sucesso!\n');
}

// Executar teste
runParallelLoadTest().catch(console.error);
