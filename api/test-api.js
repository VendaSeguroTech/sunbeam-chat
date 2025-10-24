/**
 * Script de teste para a API de validação SSO
 *
 * Como usar:
 * 1. Inicie a API: npm start
 * 2. Em outro terminal: node test-api.js
 * 3. Para testar com token real: node test-api.js "SEU_TOKEN_AQUI"
 */

const http = require('http');

// Token de teste (será inválido, mas testará a API)
const TEST_TOKEN = process.argv[2] || 'token_de_teste_invalido';

console.log('\n🧪 Testando API de Validação SSO\n');
console.log('================================\n');
console.log('📍 URL:', 'http://localhost:3001');
console.log('🔑 Token:', TEST_TOKEN.substring(0, 30) + '...');
console.log('\n================================\n');

const postData = JSON.stringify({
  token: TEST_TOKEN,
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

console.log('⏳ Enviando requisição...\n');

const req = http.request(options, (res) => {
  let data = '';

  console.log('📊 Status Code:', res.statusCode);
  console.log('📋 Headers:', JSON.stringify(res.headers, null, 2));
  console.log('\n');

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📦 Resposta da API:\n');

    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));

      console.log('\n================================\n');

      if (res.statusCode === 200 && jsonData.success) {
        console.log('✅ SUCESSO! API funcionando corretamente.');
        console.log('👤 Usuário:', jsonData.user.email);
        console.log('🔗 Session URL gerada:', jsonData.session_url ? 'Sim' : 'Não');
      } else if (res.statusCode === 401) {
        console.log('⚠️  Token inválido (esperado para token de teste)');
        console.log('💡 API está funcionando! Use um token real do Hub para testar autenticação completa.');
      } else if (res.statusCode === 400) {
        console.log('⚠️  Requisição inválida');
        console.log('❌ Erro:', jsonData.error);
      } else if (res.statusCode === 500) {
        console.log('❌ ERRO NO SERVIDOR');
        console.log('🔍 Verifique os logs da API para mais detalhes');
        console.log('💡 Possíveis causas:');
        console.log('   - Credenciais do Supabase incorretas');
        console.log('   - Service key sem permissões');
        console.log('   - Problemas de conexão com Supabase');
      } else {
        console.log('⚠️  Status inesperado:', res.statusCode);
      }

    } catch (error) {
      console.log('❌ ERRO ao parsear resposta JSON:');
      console.log(data);
    }

    console.log('\n================================\n');
  });
});

req.on('error', (error) => {
  console.log('\n================================\n');
  console.log('❌ ERRO DE CONEXÃO\n');
  console.error(error.message);
  console.log('\n💡 Verifique se:');
  console.log('   1. A API está rodando (npm start)');
  console.log('   2. A porta 3001 está disponível');
  console.log('   3. Não há firewall bloqueando');
  console.log('\n================================\n');
});

req.write(postData);
req.end();
