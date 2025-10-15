/**
 * Script de Teste de Estresse Combinado
 *
 * Simula cenário real: usuários fazendo login e enviando mensagens simultaneamente
 *
 * Uso:
 *   node combined-stress-test.js [número-de-usuários] [mensagens-por-usuário]
 *
 * Exemplo:
 *   node combined-stress-test.js 5 3
 */

import { createClient } from '@supabase/supabase-js';
import https from 'https';
import http from 'http';

// Configuração do Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://supabase.vendaseguro.tech';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU5MTE0ODAwLCJleHAiOjE5MTY4ODEyMDB9.qwETpJf9wXfGmh3E0SfLdg6xXnTK3cgWp_tkfnR5hKQ';

// Configuração do Webhook
const WEBHOOK_URL = 'https://n8n.vendaseguro.tech/webhook-test/0fc3496c-5dfa-4772-8661-da71da6353c7';

// Parâmetros do teste
const NUM_USERS = parseInt(process.argv[2]) || 3;
const MESSAGES_PER_USER = parseInt(process.argv[3]) || 2;

// Credenciais de teste
const TEST_USERS = [
  { email: 'test1@example.com', password: 'password123' },
  { email: 'test2@example.com', password: 'password123' },
  { email: 'test3@example.com', password: 'password123' },
  { email: 'test4@example.com', password: 'password123' },
  { email: 'test5@example.com', password: 'password123' },
];

// Mensagens de teste
const TEST_MESSAGES = [
  'Olá! Preciso de informações sobre seguros.',
  'Qual a diferença entre os tipos de RC?',
  'Quanto custa em média?',
  'Como funciona a cobertura?',
  'Quais documentos são necessários?',
];

// Modelos
const MODELS = ['global', 'rc-profissional', 'rc-geral'];

// Estatísticas
const stats = {
  users: {
    total: 0,
    loginSuccess: 0,
    loginFailed: 0,
    loginTimes: []
  },
  messages: {
    total: 0,
    success: 0,
    failed: 0,
    times: []
  },
  errors: []
};

/**
 * Gera um session_id único
 */
function generateSessionId(userId) {
  return `stress_test_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Envia uma mensagem para o webhook
 */
async function sendMessage(userId, sessionId, message, model) {
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
        stats.messages.total++;

        if (res.statusCode >= 200 && res.statusCode < 300) {
          stats.messages.success++;
          stats.messages.times.push(duration);
          console.log(`  📨 Mensagem enviada com sucesso (${duration}ms)`);
        } else {
          stats.messages.failed++;
          stats.errors.push({
            type: 'message',
            userId,
            error: `HTTP ${res.statusCode}`,
            message: message.substring(0, 50)
          });
          console.log(`  ❌ Falha ao enviar mensagem: HTTP ${res.statusCode}`);
        }

        resolve({ success: res.statusCode >= 200 && res.statusCode < 300, duration });
      });
    });

    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      stats.messages.total++;
      stats.messages.failed++;
      stats.errors.push({
        type: 'message',
        userId,
        error: error.message,
        message: message.substring(0, 50)
      });
      console.log(`  ❌ Erro ao enviar mensagem: ${error.message}`);
      resolve({ success: false, duration });
    });

    req.setTimeout(30000);
    req.write(payload);
    req.end();
  });
}

/**
 * Simula um usuário completo: login + envio de mensagens
 */
async function simulateUser(userIndex) {
  const user = TEST_USERS[userIndex % TEST_USERS.length];
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log(`\n👤 [Usuário ${userIndex + 1}] Iniciando simulação: ${user.email}`);

  // 1. Login
  const loginStart = Date.now();
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });

    const loginDuration = Date.now() - loginStart;
    stats.users.total++;

    if (error) {
      stats.users.loginFailed++;
      stats.errors.push({
        type: 'login',
        user: user.email,
        error: error.message
      });
      console.log(`❌ [Usuário ${userIndex + 1}] Login falhou: ${error.message} (${loginDuration}ms)`);
      return;
    }

    stats.users.loginSuccess++;
    stats.users.loginTimes.push(loginDuration);
    console.log(`✅ [Usuário ${userIndex + 1}] Login com sucesso (${loginDuration}ms)`);

    // 2. Gerar session_id
    const sessionId = generateSessionId(data.user.id);

    // 3. Enviar mensagens
    for (let i = 0; i < MESSAGES_PER_USER; i++) {
      const message = TEST_MESSAGES[i % TEST_MESSAGES.length];
      const model = MODELS[i % MODELS.length];

      console.log(`  📝 [Usuário ${userIndex + 1}] Enviando mensagem ${i + 1}/${MESSAGES_PER_USER}...`);

      await sendMessage(data.user.id, sessionId, message, model);

      // Pequeno intervalo entre mensagens do mesmo usuário
      if (i < MESSAGES_PER_USER - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 4. Logout
    await supabase.auth.signOut();
    console.log(`👋 [Usuário ${userIndex + 1}] Logout realizado`);

  } catch (error) {
    const loginDuration = Date.now() - loginStart;
    stats.users.total++;
    stats.users.loginFailed++;
    stats.errors.push({
      type: 'login',
      user: user.email,
      error: error.message
    });
    console.log(`❌ [Usuário ${userIndex + 1}] Erro: ${error.message} (${loginDuration}ms)`);
  }
}

/**
 * Executa o teste de estresse combinado
 */
async function runStressTest() {
  console.log('\n🔥 Iniciando Teste de Estresse Combinado\n');
  console.log(`📊 Configuração:`);
  console.log(`   - Número de usuários simultâneos: ${NUM_USERS}`);
  console.log(`   - Mensagens por usuário: ${MESSAGES_PER_USER}`);
  console.log(`   - Total de mensagens esperadas: ${NUM_USERS * MESSAGES_PER_USER}`);
  console.log(`   - Supabase URL: ${SUPABASE_URL}`);
  console.log(`   - Webhook URL: ${WEBHOOK_URL}\n`);
  console.log('═'.repeat(100));

  const startTime = Date.now();

  // Executar todos os usuários em paralelo
  const promises = [];
  for (let i = 0; i < NUM_USERS; i++) {
    promises.push(simulateUser(i));
    // Pequeno delay para não sobrecarregar instantaneamente
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  await Promise.all(promises);

  const totalDuration = Date.now() - startTime;

  // Calcular estatísticas
  const avgLoginTime = stats.users.loginTimes.length > 0
    ? (stats.users.loginTimes.reduce((a, b) => a + b, 0) / stats.users.loginTimes.length).toFixed(2)
    : 0;

  const avgMessageTime = stats.messages.times.length > 0
    ? (stats.messages.times.reduce((a, b) => a + b, 0) / stats.messages.times.length).toFixed(2)
    : 0;

  // Exibir resultados
  console.log('\n' + '═'.repeat(100));
  console.log('\n📊 RESULTADOS DO TESTE DE ESTRESSE\n');
  console.log(`⏱️  Duração total: ${(totalDuration / 1000).toFixed(2)}s\n`);

  console.log(`👥 AUTENTICAÇÃO:`);
  console.log(`   - Total de tentativas: ${stats.users.total}`);
  console.log(`   - Logins bem-sucedidos: ${stats.users.loginSuccess} (${((stats.users.loginSuccess / stats.users.total) * 100).toFixed(1)}%)`);
  console.log(`   - Logins falhados: ${stats.users.loginFailed} (${((stats.users.loginFailed / stats.users.total) * 100).toFixed(1)}%)`);
  console.log(`   - Tempo médio de login: ${avgLoginTime}ms`);

  console.log(`\n💬 MENSAGENS:`);
  console.log(`   - Total enviadas: ${stats.messages.total}`);
  console.log(`   - Sucessos: ${stats.messages.success} (${((stats.messages.success / stats.messages.total) * 100).toFixed(1)}%)`);
  console.log(`   - Falhas: ${stats.messages.failed} (${((stats.messages.failed / stats.messages.total) * 100).toFixed(1)}%)`);
  console.log(`   - Tempo médio por mensagem: ${avgMessageTime}ms`);
  console.log(`   - Taxa de envio: ${(stats.messages.total / (totalDuration / 1000)).toFixed(2)} msg/s`);

  if (stats.errors.length > 0) {
    console.log(`\n❌ ERROS ENCONTRADOS (${stats.errors.length} total):`);
    const loginErrors = stats.errors.filter(e => e.type === 'login');
    const messageErrors = stats.errors.filter(e => e.type === 'message');

    if (loginErrors.length > 0) {
      console.log(`   📝 Erros de login (${loginErrors.length}):`);
      loginErrors.slice(0, 3).forEach(({ user, error }) => {
        console.log(`      - ${user}: ${error}`);
      });
    }

    if (messageErrors.length > 0) {
      console.log(`   📝 Erros de mensagem (${messageErrors.length}):`);
      messageErrors.slice(0, 3).forEach(({ userId, message, error }) => {
        console.log(`      - ${userId}: "${message}" - ${error}`);
      });
    }

    if (stats.errors.length > 6) {
      console.log(`   ... e mais ${stats.errors.length - 6} erros`);
    }
  }

  console.log('\n' + '═'.repeat(100) + '\n');

  // Avaliação geral
  const successRate = ((stats.users.loginSuccess + stats.messages.success) / (stats.users.total + stats.messages.total)) * 100;

  console.log(`\n🎯 AVALIAÇÃO GERAL:`);
  if (successRate >= 95) {
    console.log(`   ✅ EXCELENTE: ${successRate.toFixed(1)}% de sucesso`);
  } else if (successRate >= 80) {
    console.log(`   ⚠️  BOM: ${successRate.toFixed(1)}% de sucesso (algumas falhas detectadas)`);
  } else if (successRate >= 60) {
    console.log(`   ⚠️  REGULAR: ${successRate.toFixed(1)}% de sucesso (muitas falhas)`);
  } else {
    console.log(`   ❌ CRÍTICO: ${successRate.toFixed(1)}% de sucesso (sistema instável)`);
  }

  console.log('\n');
}

// Executar teste
runStressTest().catch(console.error);
