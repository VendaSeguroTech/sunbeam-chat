/**
 * Script de Teste de Carga - Autenticação
 *
 * Simula múltiplos logins simultâneos no sistema
 *
 * Uso:
 *   node auth-load-test.js [número-de-usuários] [intervalo-ms]
 *
 * Exemplo:
 *   node auth-load-test.js 10 100
 */

import { createClient } from '@supabase/supabase-js';
import { saveTestResultJSON, appendToConsolidatedReport, generateIndexReport } from './utils/report-generator.js';

// Configuração do Supabase (ajuste com suas credenciais)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://supabase.vendaseguro.tech';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU5MTE0ODAwLCJleHAiOjE5MTY4ODEyMDB9.qwETpJf9wXfGmh3E0SfLdg6xXnTK3cgWp_tkfnR5hKQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configuração do teste
const NUM_USERS = parseInt(process.argv[2]) || 5;
const INTERVAL_MS = parseInt(process.argv[3]) || 500;

// Credenciais de teste (você pode criar esses usuários antes)
const TEST_USERS = [
  { email: 'test1@example.com', password: 'password123' },
  { email: 'test2@example.com', password: 'password123' },
  { email: 'test3@example.com', password: 'password123' },
  { email: 'test4@example.com', password: 'password123' },
  { email: 'test5@example.com', password: 'password123' },
  { email: 'test6@example.com', password: 'password123' },
  { email: 'test7@example.com', password: 'password123' },
  { email: 'test8@example.com', password: 'password123' },
  { email: 'test9@example.com', password: 'password123' },
  { email: 'test10@example.com', password: 'password123' },
];

// Estatísticas
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  times: [],
  errors: []
};

/**
 * Simula login de um usuário
 */
async function simulateLogin(userIndex) {
  const user = TEST_USERS[userIndex % TEST_USERS.length];
  const startTime = Date.now();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });

    const duration = Date.now() - startTime;

    if (error) {
      stats.failed++;
      stats.errors.push({ user: user.email, error: error.message });
      console.log(`❌ [${userIndex + 1}] Falha: ${user.email} - ${error.message} (${duration}ms)`);
    } else {
      stats.success++;
      stats.times.push(duration);
      console.log(`✅ [${userIndex + 1}] Sucesso: ${user.email} (${duration}ms)`);

      // Fazer logout para liberar a sessão
      await supabase.auth.signOut();
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    stats.failed++;
    stats.errors.push({ user: user.email, error: error.message });
    console.log(`❌ [${userIndex + 1}] Erro: ${user.email} - ${error.message} (${duration}ms)`);
  }

  stats.total++;
}

/**
 * Executa o teste de carga
 */
async function runLoadTest() {
  console.log('\n🚀 Iniciando Teste de Carga - Autenticação\n');
  console.log(`📊 Configuração:`);
  console.log(`   - Número de logins: ${NUM_USERS}`);
  console.log(`   - Intervalo entre logins: ${INTERVAL_MS}ms`);
  console.log(`   - Usuários de teste disponíveis: ${TEST_USERS.length}\n`);
  console.log('─'.repeat(80));
  console.log('\n');

  const startTime = Date.now();

  // Executar logins com intervalo
  const promises = [];
  for (let i = 0; i < NUM_USERS; i++) {
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
    promises.push(simulateLogin(i));
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
  console.log('─'.repeat(80));
  console.log('\n📈 Resultados do Teste\n');
  console.log(`⏱️  Duração total: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`📊 Total de tentativas: ${stats.total}`);
  console.log(`✅ Sucessos: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(1)}%)`);
  console.log(`❌ Falhas: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);
  console.log(`\n⚡ Tempos de Resposta:`);
  console.log(`   - Média: ${avgTime}ms`);
  console.log(`   - Mínimo: ${minTime}ms`);
  console.log(`   - Máximo: ${maxTime}ms`);
  console.log(`   - Taxa: ${(stats.total / (totalDuration / 1000)).toFixed(2)} req/s`);

  if (stats.errors.length > 0) {
    console.log(`\n❌ Erros encontrados:`);
    stats.errors.slice(0, 5).forEach(({ user, error }) => {
      console.log(`   - ${user}: ${error}`);
    });
    if (stats.errors.length > 5) {
      console.log(`   ... e mais ${stats.errors.length - 5} erros`);
    }
  }

  console.log('\n' + '─'.repeat(80) + '\n');

  // Salvar resultados
  const testResult = {
    config: {
      total: NUM_USERS,
      interval: INTERVAL_MS,
      supabaseUrl: SUPABASE_URL
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
    throughput: stats.total / (totalDuration / 1000),
    errors: stats.errors.slice(0, 10) // Primeiros 10 erros
  };

  console.log('💾 Salvando resultados...\n');
  saveTestResultJSON('auth-load', testResult);
  appendToConsolidatedReport('auth-load', testResult);
  generateIndexReport();

  console.log('\n✅ Resultados salvos com sucesso!\n');
}

// Executar teste
runLoadTest().catch(console.error);
