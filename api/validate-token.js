/**
 * API Node.js para validar tokens SSO do Hub VendaSeguro
 * Replica a lógica da Edge Function usando Node.js puro
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const PORT = process.env.PORT || 3001;

// Supabase credentials (configure via .env ou hardcode temporariamente)
const SUPABASE_URL = process.env.SUPABASE_URL || 'SUA_URL_AQUI';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'SUA_SERVICE_KEY_AQUI';

// Chave de criptografia (mesma do Hub)
const ENCRYPTION_KEY = 'isw_venda_seguro';

// ============================================================================
// FUNÇÕES DE CRIPTOGRAFIA
// ============================================================================

/**
 * Descriptografa o token usando AES-256-CBC
 * Replica a função isw_decrypt() do PHP
 */
function decryptToken(encryptedToken) {
  try {
    console.log('[DECRYPT] Token recebido:', encryptedToken);

    // 1. Substituir caracteres URL-safe de volta para base64 padrão
    const safeData = encryptedToken.replace(/-/g, '+').replace(/_/g, '/');
    console.log('[DECRYPT] Após replace:', safeData);

    // 2. Decodificar base64
    const decodedData = Buffer.from(safeData, 'base64').toString('utf8');
    console.log('[DECRYPT] Decoded data:', decodedData);

    // 3. Separar dados criptografados e IV
    const parts = decodedData.split(';');
    if (parts.length !== 2) {
      console.error('[DECRYPT] ERRO: Token não contém separador ";"');
      return null;
    }

    const [encryptedData, ivStr] = parts;
    console.log('[DECRYPT] Encrypted data:', encryptedData);
    console.log('[DECRYPT] IV string:', ivStr);

    // 4. Preparar IV (16 bytes para AES-256-CBC)
    const ivBuffer = Buffer.from(ivStr, 'utf8');
    const iv = Buffer.alloc(16);
    ivBuffer.copy(iv, 0, 0, Math.min(16, ivBuffer.length));
    console.log('[DECRYPT] IV preparado (hex):', iv.toString('hex'));

    // 5. Preparar chave (32 bytes para AES-256)
    const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'utf8');
    const key = Buffer.alloc(32);
    keyBuffer.copy(key, 0, 0, Math.min(32, keyBuffer.length));
    console.log('[DECRYPT] Key preparada (hex):', key.toString('hex'));

    // 6. Decodificar dados criptografados de base64
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    console.log('[DECRYPT] Encrypted buffer length:', encryptedBuffer.length);

    // 7. Descriptografar usando AES-256-CBC
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    decipher.setAutoPadding(true);

    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    const decryptedText = decrypted.toString('utf8');
    console.log('[DECRYPT] ✅ Token descriptografado:', decryptedText);

    return decryptedText;
  } catch (error) {
    console.error('[DECRYPT] ❌ Erro na descriptografia:', error.message);
    console.error(error.stack);
    return null;
  }
}

/**
 * Valida o token com o endpoint do Hub
 */
function validateTokenWithHub(token) {
  return new Promise((resolve, reject) => {
    const postData = `token=${encodeURIComponent(token)}`;

    const options = {
      hostname: 'hub.vendaseguro.com.br',
      path: '/isw_api/isw_validar_usuario.php',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    console.log('[HUB] Chamando endpoint de validação...');

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('[HUB] Resposta do Hub:', data.trim());
        const isValid = data.trim() === 'liberado';
        resolve(isValid);
      });
    });

    req.on('error', (error) => {
      console.error('[HUB] Erro ao validar com Hub:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// ============================================================================
// LÓGICA PRINCIPAL
// ============================================================================

/**
 * Processa a requisição de validação de token
 */
async function handleValidateToken(token) {
  console.log('\n========================================');
  console.log('[MAIN] Iniciando validação de token');
  console.log('========================================\n');

  // 1. Descriptografar o token
  const decrypted = decryptToken(token);

  if (!decrypted) {
    console.error('[MAIN] ❌ Falha na descriptografia');
    return { error: 'Invalid token format', status: 401 };
  }

  // 2. Extrair informações do token
  const parts = decrypted.split('|');
  if (parts.length !== 3) {
    console.error('[MAIN] ❌ Estrutura do token inválida');
    return { error: 'Invalid token structure', status: 401 };
  }

  const [isw_token, user_id, user_email] = parts;
  console.log('[MAIN] Token parseado:', { user_id, user_email });

  // 3. Validar com o Hub
  let isValid;
  try {
    isValid = await validateTokenWithHub(token);
  } catch (error) {
    console.error('[MAIN] ❌ Erro ao validar com Hub:', error.message);
    return { error: 'Hub validation failed', status: 500 };
  }

  if (!isValid) {
    console.error('[MAIN] ❌ Token rejeitado pelo Hub');
    return { error: 'Token validation failed', status: 401 };
  }

  console.log('[MAIN] ✅ Token validado com sucesso pelo Hub');

  // 4. Verificar/criar usuário no Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const normalizedEmail = user_email.toLowerCase().trim();

  // Verificar se usuário existe
  const { data: existingUser, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', normalizedEmail)
    .single();

  let userId;

  if (existingUser) {
    userId = existingUser.id;
    console.log('[MAIN] ✅ Usuário já existe:', userId);
  } else {
    console.log('[MAIN] 📝 Criando novo usuário...');

    // Criar usuário no Auth
    const randomPassword = crypto.randomBytes(16).toString('hex') + 'Aa1!';

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: randomPassword,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error('[MAIN] ❌ Erro ao criar usuário:', authError?.message);
      return { error: 'Failed to create user', status: 500 };
    }

    userId = authData.user.id;
    console.log('[MAIN] ✅ Usuário criado no Auth:', userId);

    // Criar perfil
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0],
      role: 'default',
    });

    if (profileError) {
      console.error('[MAIN] ⚠️  Erro ao criar perfil:', profileError.message);
      // Continua mesmo assim, o perfil pode ser criado por trigger
    } else {
      console.log('[MAIN] ✅ Perfil criado');
    }
  }

  // 5. Gerar magic link para autenticação
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
  });

  if (linkError) {
    console.error('[MAIN] ❌ Erro ao gerar magic link:', linkError.message);
    return { error: 'Failed to generate session', status: 500 };
  }

  console.log('[MAIN] ✅ Magic link gerado com sucesso');

  const actionLink = linkData.properties.action_link;

  return {
    success: true,
    user: {
      id: userId,
      email: normalizedEmail,
    },
    session_url: actionLink,
    status: 200,
  };
}

// ============================================================================
// SERVIDOR HTTP
// ============================================================================

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Only accept POST
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Parse request body
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const { token } = JSON.parse(body);

      if (!token) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Token is required' }));
        return;
      }

      // Process token validation
      const result = await handleValidateToken(token);

      const status = result.status || 200;
      delete result.status;

      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (error) {
      console.error('[SERVER] ❌ Erro no servidor:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
});

// ============================================================================
// START SERVER
// ============================================================================

server.listen(PORT, () => {
  console.log('\n========================================');
  console.log(`🚀 API de Validação SSO rodando!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔑 Supabase URL: ${SUPABASE_URL}`);
  console.log('========================================\n');
});
