/**
 * Script de Teste de Carga - Mensagens de Chat
 *
 * Simula múltiplos usuários enviando mensagens simultaneamente para o webhook N8N
 *
 * Uso:
 *   node message-load-test.js [número-de-mensagens] [intervalo-ms]
 *
 * Exemplo:
 *   node message-load-test.js 20 200
 */

import https from 'https';
import http from 'http';

// Configuração
const WEBHOOK_URL = 'https://webhook.vendaseguro.tech/webhook/0fc3496c-5dfa-4772-8661-da71da6353c7';
const NUM_MESSAGES = parseInt(process.argv[2]) || 10;
const INTERVAL_MS = parseInt(process.argv[3]) || 500;

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
  statusCodes: {}
};

/**
 * Gera um session_id único
 */
function generateSessionId() {
  return `load_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Envia uma mensagem para o webhook N8N
 */
async function sendMessage(messageIndex) {
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

  return new Promise((resolve) => {
    const req = protocol.request(options, (res) => {
      const duration = Date.now() - startTime;
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        stats.total++;
        stats.statusCodes[res.statusCode] = (stats.statusCodes[res.statusCode] || 0) + 1;

        if (res.statusCode >= 200 && res.statusCode < 300) {
          stats.success++;
          stats.times.push(duration);
          console.log(`✅ [${messageIndex + 1}] ${userId} (${model}): "${message.substring(0, 30)}..." - ${res.statusCode} (${duration}ms)`);
        } else {
          stats.failed++;
          stats.errors.push({
            messageIndex,
            userId,
            message: message.substring(0, 50),
            statusCode: res.statusCode,
            error: `HTTP ${res.statusCode}`
          });
          console.log(`❌ [${messageIndex + 1}] ${userId}: HTTP ${res.statusCode} (${duration}ms)`);
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
      console.log(`❌ [${messageIndex + 1}] ${userId}: ${error.message} (${duration}ms)`);
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
        error: 'Timeout'
      });
      console.log(`⏱️ [${messageIndex + 1}] ${userId}: Timeout (${duration}ms)`);
      resolve();
    });

    req.setTimeout(30000); // 30 segundos timeout
    req.write(payload);
    req.end();
  });
}

/**
 * Executa o teste de carga
 */
async function runLoadTest() {
  console.log('\n🚀 Iniciando Teste de Carga - Mensagens de Chat\n');
  console.log(`📊 Configuração:`);
  console.log(`   - Número de mensagens: ${NUM_MESSAGES}`);
  console.log(`   - Intervalo entre mensagens: ${INTERVAL_MS}ms`);
  console.log(`   - Webhook URL: ${WEBHOOK_URL}`);
  console.log(`   - Usuários simulados: ${TEST_USER_IDS.length}`);
  console.log(`   - Modelos: ${MODELS.join(', ')}\n`);
  console.log('─'.repeat(100));
  console.log('\n');

  const startTime = Date.now();

  // Enviar mensagens com intervalo
  const promises = [];
  for (let i = 0; i < NUM_MESSAGES; i++) {
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
    promises.push(sendMessage(i));
  }

  // Aguardar todas as requisições terminarem
  await Promise.all(promises);

  const totalDuration = Date.now() - startTime;

  // Calcular estatísticas
  const avgTime = stats.times.length > 0
    ? (stats.times.reduce((a, b) => a + b, 0) / stats.times.length).toFixed(2)
    : 0;

  const minTime = stats.times.length > 0 ? Math.min(...stats.times) : 0;
  const maxTime = stats.times.length > 0 ? Math.max(...stats.times) : 0;

  // Exibir resultados
  console.log('\n');
  console.log('─'.repeat(100));
  console.log('\n📈 Resultados do Teste\n');
  console.log(`⏱️  Duração total: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`📊 Total de mensagens: ${stats.total}`);
  console.log(`✅ Sucessos: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(1)}%)`);
  console.log(`❌ Falhas: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);

  console.log(`\n📡 Status HTTP:`);
  Object.entries(stats.statusCodes).forEach(([code, count]) => {
    console.log(`   - ${code}: ${count} (${((count / stats.total) * 100).toFixed(1)}%)`);
  });

  console.log(`\n⚡ Tempos de Resposta:`);
  console.log(`   - Média: ${avgTime}ms`);
  console.log(`   - Mínimo: ${minTime}ms`);
  console.log(`   - Máximo: ${maxTime}ms`);
  console.log(`   - Taxa: ${(stats.total / (totalDuration / 1000)).toFixed(2)} req/s`);

  if (stats.errors.length > 0) {
    console.log(`\n❌ Erros encontrados (primeiros 5):`);
    stats.errors.slice(0, 5).forEach(({ userId, message, error }) => {
      console.log(`   - ${userId}: "${message}" - ${error}`);
    });
    if (stats.errors.length > 5) {
      console.log(`   ... e mais ${stats.errors.length - 5} erros`);
    }
  }

  console.log('\n' + '─'.repeat(100) + '\n');
}

// Executar teste
runLoadTest().catch(console.error);
