/**
 * Script de Teste de Carga - Mensagens de Chat (COM RESPOSTA DA IA)
 *
 * Simula múltiplos usuários enviando mensagens e AGUARDA a resposta completa da IA
 *
 * Uso:
 *   node message-load-test-with-response.js [número-de-mensagens] [intervalo-ms]
 *
 * Exemplo:
 *   node message-load-test-with-response.js 5 2000
 *
 * NOTA: Use intervalos maiores (2000ms+) porque cada mensagem precisa esperar a IA responder
 */

import https from 'https';
import http from 'http';
import { saveTestResultJSON, appendToConsolidatedReport, generateIndexReport } from './utils/report-generator.js';

// Configuração
const WEBHOOK_URL = 'https://webhook.vendaseguro.tech/webhook/0fc3496c-5dfa-4772-8661-da71da6353c7';
const NUM_MESSAGES = parseInt(process.argv[2]) || 5;
const INTERVAL_MS = parseInt(process.argv[3]) || 15000; // Aumentado para 3 segundos por padrão

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

// User IDs de teste (simula diferentes usuários)
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
  responses: []
};

/**
 * Gera um session_id único
 */
function generateSessionId() {
  return `load_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  console.log(`\n📤 [${messageIndex + 1}] Enviando: "${message}" (${model})`);
  console.log(`   👤 User: ${userId}`);

  return new Promise((resolve) => {
    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;
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

          const preview = aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : '');
          stats.responses.push({
            question: message,
            answer: aiResponse,
            duration
          });

          console.log(`   ✅ Resposta recebida (${duration}ms, ${res.statusCode})`);
          console.log(`   💬 IA: "${preview}"`);
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
          console.log(`   ❌ Erro HTTP ${res.statusCode} (${duration}ms)`);
          console.log(`   📄 Resposta: ${data.substring(0, 100)}`);
        }

        resolve();
      });
    });

    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      stats.total++;
      stats.failed++;
      stats.errors.push({
        messageIndex,
        userId,
        message: message.substring(0, 50),
        error: error.message
      });
      console.log(`   ❌ Erro de conexão: ${error.message} (${duration}ms)`);
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - startTime;
      stats.total++;
      stats.failed++;
      stats.errors.push({
        messageIndex,
        userId,
        message: message.substring(0, 50),
        error: 'Timeout (resposta demorou mais de 60s)'
      });
      console.log(`   ⏱️ Timeout: IA não respondeu em 60s (${duration}ms)`);
      resolve();
    });

    req.setTimeout(60000); // 60 segundos timeout (IA pode demorar)
    req.write(payload);
    req.end();
  });
}

/**
 * Executa o teste de carga
 */
async function runLoadTest() {
  console.log('\n🚀 Iniciando Teste de Carga - Mensagens com Resposta da IA\n');
  console.log(`📊 Configuração:`);
  console.log(`   - Número de mensagens: ${NUM_MESSAGES}`);
  console.log(`   - Intervalo entre mensagens: ${INTERVAL_MS}ms (${(INTERVAL_MS/1000).toFixed(1)}s)`);
  console.log(`   - Timeout por mensagem: 60s`);
  console.log(`   - Webhook URL: ${WEBHOOK_URL}`);
  console.log(`   - Usuários simulados: ${TEST_USER_IDS.length}`);
  console.log(`   - Modelos: ${MODELS.join(', ')}`);

  const estimatedTime = (NUM_MESSAGES * INTERVAL_MS / 1000 / 60).toFixed(1);
  console.log(`\n   ⏱️ Tempo estimado: ~${estimatedTime} minutos\n`);
  console.log('═'.repeat(100));

  const startTime = Date.now();

  // Enviar mensagens sequencialmente (uma após a outra)
  for (let i = 0; i < NUM_MESSAGES; i++) {
    await sendMessageAndWaitForResponse(i);

    // Aguardar intervalo antes da próxima mensagem (exceto na última)
    if (i < NUM_MESSAGES - 1) {
      console.log(`\n   ⏳ Aguardando ${INTERVAL_MS}ms antes da próxima mensagem...\n`);
      await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
    }
  }

  const totalDuration = Date.now() - startTime;

  // Calcular estatísticas
  const avgTime = stats.times.length > 0
    ? (stats.times.reduce((a, b) => a + b, 0) / stats.times.length).toFixed(2)
    : 0;

  const minTime = stats.times.length > 0 ? Math.min(...stats.times) : 0;
  const maxTime = stats.times.length > 0 ? Math.max(...stats.times) : 0;

  // Exibir resultados
  console.log('\n');
  console.log('═'.repeat(100));
  console.log('\n📈 RESULTADOS DO TESTE\n');
  console.log(`⏱️  Duração total: ${(totalDuration / 1000 / 60).toFixed(2)} minutos (${(totalDuration / 1000).toFixed(1)}s)`);
  console.log(`📊 Total de mensagens: ${stats.total}`);
  console.log(`✅ Sucessos: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(1)}%)`);
  console.log(`❌ Falhas: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);

  console.log(`\n📡 Status HTTP:`);
  Object.entries(stats.statusCodes).forEach(([code, count]) => {
    const emoji = code >= 200 && code < 300 ? '✅' : '❌';
    console.log(`   ${emoji} ${code}: ${count} (${((count / stats.total) * 100).toFixed(1)}%)`);
  });

  console.log(`\n⚡ Tempos de Resposta da IA:`);
  console.log(`   - Média: ${avgTime}ms (${(avgTime/1000).toFixed(1)}s)`);
  console.log(`   - Mínimo: ${minTime}ms (${(minTime/1000).toFixed(1)}s)`);
  console.log(`   - Máximo: ${maxTime}ms (${(maxTime/1000).toFixed(1)}s)`);

  if (stats.responses.length > 0) {
    console.log(`\n💬 Exemplos de Respostas da IA (primeiras 3):`);
    stats.responses.slice(0, 3).forEach(({ question, answer, duration }, index) => {
      console.log(`\n   ${index + 1}. Pergunta: "${question}"`);
      console.log(`      Tempo: ${duration}ms (${(duration/1000).toFixed(1)}s)`);
      console.log(`      Resposta: "${answer.substring(0, 150)}${answer.length > 150 ? '...' : ''}"`);
    });
  }

  if (stats.errors.length > 0) {
    console.log(`\n❌ Erros Encontrados (${stats.errors.length} total):`);
    stats.errors.slice(0, 5).forEach(({ userId, message, error, response }) => {
      console.log(`\n   - ${userId}: "${message}"`);
      console.log(`     Erro: ${error}`);
      if (response) {
        console.log(`     Resposta do servidor: ${response}`);
      }
    });
    if (stats.errors.length > 5) {
      console.log(`\n   ... e mais ${stats.errors.length - 5} erros`);
    }
  }

  // Avaliação
  console.log('\n' + '═'.repeat(100));
  console.log('\n🎯 AVALIAÇÃO:\n');

  if (stats.success === stats.total) {
    console.log('   ✅ PERFEITO: Todas as mensagens foram processadas com sucesso!');
  } else if (stats.success / stats.total >= 0.9) {
    console.log('   ✅ EXCELENTE: Mais de 90% de sucesso');
  } else if (stats.success / stats.total >= 0.7) {
    console.log('   ⚠️  BOM: 70-90% de sucesso, algumas falhas detectadas');
  } else if (stats.success / stats.total >= 0.5) {
    console.log('   ⚠️  REGULAR: 50-70% de sucesso, muitas falhas');
  } else {
    console.log('   ❌ CRÍTICO: Menos de 50% de sucesso, sistema instável');
  }

  if (avgTime > 0) {
    if (avgTime < 3000) {
      console.log(`   ⚡ Velocidade: RÁPIDA (média ${(avgTime/1000).toFixed(1)}s por resposta)`);
    } else if (avgTime < 10000) {
      console.log(`   ⚡ Velocidade: NORMAL (média ${(avgTime/1000).toFixed(1)}s por resposta)`);
    } else {
      console.log(`   ⚠️  Velocidade: LENTA (média ${(avgTime/1000).toFixed(1)}s por resposta)`);
    }
  }

  console.log('\n' + '═'.repeat(100) + '\n');

  // Salvar resultados
  const testResult = {
    config: {
      total: NUM_MESSAGES,
      interval: INTERVAL_MS,
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
    statusCodes: stats.statusCodes,
    errors: stats.errors.slice(0, 10),
    responses: stats.responses.slice(0, 5).map(r => ({
      question: r.question.substring(0, 100),
      answer: r.answer.substring(0, 200),
      duration: r.duration
    }))
  };

  console.log('💾 Salvando resultados...\n');
  saveTestResultJSON('message-sequential', testResult);
  appendToConsolidatedReport('message-sequential', testResult);
  generateIndexReport();

  console.log('\n✅ Resultados salvos com sucesso!\n');
}

// Executar teste
runLoadTest().catch(console.error);
