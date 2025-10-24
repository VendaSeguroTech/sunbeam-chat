/**
 * API Node.js - SSO via endpoint isw_validar_usuario.php (Opção B)
 *
 * Arquitetura simplificada (mesma do Melhor Produto):
 * 1. Hub envia usuário para: GET /sso/callback?token=<ENCRYPTED>&ts=<epoch>
 * 2. API chama Hub: POST https://hub.vendaseguro.com.br/isw_api/isw_validar_usuario.php
 * 3. Hub retorna "liberado" ou "negado"
 * 4. API descriptografa token para extrair dados do usuário
 * 5. API cria/busca usuário no Supabase
 * 6. API cria cookie vs_session HttpOnly (2 horas)
 * 7. API redireciona para /chat
 */

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.sso' });

const http = require('http');
const https = require('https');
const url = require('url');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const PORT = process.env.PORT || 3002;

// URL do endpoint de validação do Hub (mesmo que o Melhor Produto usa)
const HUB_VALIDATE_URL = 'https://hub.vendaseguro.com.br/isw_api/isw_validar_usuario.php';

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:8080';

// Chave para descriptografar o token (mesma do Hub)
const ENCRYPTION_KEY = 'isw_venda_seguro';

// Chave para assinar o cookie de sessão da IA
const APP_JWT_SECRET = process.env.APP_JWT_SECRET || 'your-app-secret-change-in-production';

// Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase;

if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log('[INIT] ✅ Supabase conectado');
} else {
    console.warn('[INIT] ⚠️  Supabase não configurado (necessário para criar usuários)');
}

// ============================================================================
// UTILITÁRIOS - DESCRIPTOGRAFIA
// ============================================================================

/**
 * Descriptografar token (EXATAMENTE como plugin_isw_sso.php linha 118-128)
 *
 * PHP:
 * $safe_data = str_replace(['-', '_'], ['+', '/'], $data);
 * $decoded_data = base64_decode($safe_data);
 * list($encrypted_data, $iv) = explode(';', $decoded_data, 2);
 * return openssl_decrypt($encrypted_data, 'AES-256-CBC', $key, 0, $iv);
 */
function decryptToken(data, key) {
    try {
        console.log('[DECRYPT] Token original (primeiros 50):', data.substring(0, 50));

        // 1. Substituir caracteres URL-safe (igual PHP)
        const safeData = data.replace(/-/g, '+').replace(/_/g, '/');
        console.log('[DECRYPT] Após replace:', safeData.substring(0, 50));

        // 2. Decodificar base64 (igual PHP base64_decode)
        const decoded = Buffer.from(safeData, 'base64');
        console.log('[DECRYPT] Decoded length:', decoded.length);

        // 3. Converter para string e separar por ';' (igual PHP explode)
        const decodedStr = decoded.toString('binary');
        const semicolonIndex = decodedStr.indexOf(';');

        if (semicolonIndex === -1) {
            console.error('[DECRYPT] ❌ Separador ";" não encontrado');
            return null;
        }

        const encryptedData = decodedStr.substring(0, semicolonIndex);
        const ivRaw = decodedStr.substring(semicolonIndex + 1);

        console.log('[DECRYPT] Encrypted data length:', encryptedData.length);
        console.log('[DECRYPT] IV raw length:', ivRaw.length);

        // 4. Ajustar IV para 16 bytes (igual PHP: substr(str_pad($iv, 16, "\0"), 0, 16))
        let ivStr = ivRaw;
        // Pad com null bytes até 16
        while (ivStr.length < 16) {
            ivStr += '\0';
        }
        // Truncar para 16
        ivStr = ivStr.substring(0, 16);
        const ivBuffer = Buffer.from(ivStr, 'binary');

        console.log('[DECRYPT] IV final length:', ivBuffer.length);

        // 5. Ajustar key para 32 bytes (igual PHP: substr(str_pad($key, 32, "\0"), 0, 32))
        let keyStr = key;
        while (keyStr.length < 32) {
            keyStr += '\0';
        }
        keyStr = keyStr.substring(0, 32);
        const keyBuffer = Buffer.from(keyStr, 'binary');

        console.log('[DECRYPT] Key final length:', keyBuffer.length);

        // 6. Descriptografar (igual PHP openssl_decrypt com OPENSSL_RAW_DATA = 0)
        const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
        decipher.setAutoPadding(true);

        // O encrypted_data está em base64
        let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        console.log('[DECRYPT] ✅ Token descriptografado:', decrypted);
        return decrypted;

    } catch (error) {
        console.error('[DECRYPT] ❌ Erro:', error.message);
        console.error('[DECRYPT] Stack:', error.stack);
        return null;
    }
}

// ============================================================================
// UTILITÁRIOS - HTTP
// ============================================================================

/**
 * Fazer requisição POST ao Hub
 */
function callHubValidate(token) {
    return new Promise((resolve) => {
        const postData = `token=${encodeURIComponent(token)}`;

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log('[HUB] Chamando:', HUB_VALIDATE_URL);

        const req = https.request(HUB_VALIDATE_URL, options, (res) => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('[HUB] Resposta:', data.trim());
                resolve(data.trim());
            });
        });

        req.on('error', (error) => {
            console.error('[HUB] ❌ Erro na requisição:', error.message);
            resolve(null);
        });

        req.write(postData);
        req.end();
    });
}

// ============================================================================
// UTILITÁRIOS - JWT e COOKIES
// ============================================================================

/**
 * Criar JWT simples (HS256) para o cookie de sessão
 */
function createJWT(payload, secret) {
    const header = { typ: 'JWT', alg: 'HS256' };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signatureInput = `${headerB64}.${payloadB64}`;
    const signature = crypto.createHmac('sha256', secret)
        .update(signatureInput)
        .digest('base64url');

    return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Criar cookie HttpOnly Secure SameSite
 */
function createSecureCookie(name, value, maxAgeSeconds) {
    const isProduction = process.env.NODE_ENV === 'production';

    let cookie = `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;

    if (isProduction) {
        cookie += '; Secure';
    }

    return cookie;
}

/**
 * Parsear cookies
 */
function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;

    cookieHeader.split(';').forEach(cookie => {
        const [name, ...value] = cookie.split('=');
        cookies[name.trim()] = value.join('=').trim();
    });

    return cookies;
}

/**
 * Validar JWT do cookie
 */
function verifySessionJWT(token, secret) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [headerB64, payloadB64, signatureB64] = parts;

        // Verificar assinatura
        const signatureInput = `${headerB64}.${payloadB64}`;
        const expectedSignature = crypto.createHmac('sha256', secret)
            .update(signatureInput)
            .digest('base64url');

        if (signatureB64 !== expectedSignature) {
            return null;
        }

        // Decodificar payload
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

        // Verificar expiração
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            return null;
        }

        return payload;
    } catch (error) {
        return null;
    }
}

// ============================================================================
// SUPABASE - GERENCIAMENTO DE USUÁRIOS
// ============================================================================

/**
 * Criar ou buscar usuário no Supabase
 */
async function ensureUserExists(email, userId, nickname) {
    if (!supabase) {
        console.warn('[SUPABASE] ⚠️  Pulando criação de usuário (Supabase não configurado)');
        return { id: userId, email, nickname };
    }

    try {
        // Buscar usuário por email
        const { data: existingUser, error: searchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (existingUser) {
            console.log('[SUPABASE] ✅ Usuário já existe:', email);
            return existingUser;
        }

        // Criar usuário
        console.log('[SUPABASE] Criando novo usuário:', email);

        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: {
                nickname: nickname
            }
        });

        if (createError) {
            console.error('[SUPABASE] ❌ Erro ao criar usuário:', createError.message);
            return null;
        }

        console.log('[SUPABASE] ✅ Usuário criado:', email);
        return newUser.user;

    } catch (error) {
        console.error('[SUPABASE] ❌ Erro:', error.message);
        return null;
    }
}

// ============================================================================
// ROTAS
// ============================================================================

/**
 * GET /sso/callback?token=<ENCRYPTED>&ts=<epoch>
 */
async function handleSSOCallback(req, res, queryParams) {
    console.log('\n========================================');
    console.log('[SSO CALLBACK] Iniciando autenticação');
    console.log('========================================\n');

    const { token, ts } = queryParams;

    // Validar parâmetros
    if (!token) {
        console.error('[SSO] ❌ Token não fornecido');
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>400 Bad Request</h1><p>Missing token parameter</p>');
        return;
    }

    console.log('[SSO] Token recebido (primeiros 50 chars):', token.substring(0, 50) + '...');
    console.log('[SSO] Timestamp:', ts);

    // 1. Validar token com o Hub
    console.log('[SSO] Validando token com Hub...');

    const hubResponse = await callHubValidate(token);

    if (hubResponse !== 'liberado') {
        console.error('[SSO] ❌ Token rejeitado pelo Hub:', hubResponse);
        res.writeHead(401, { 'Content-Type': 'text/html' });
        res.end('<h1>401 Unauthorized</h1><p>Token inválido ou expirado</p>');
        return;
    }

    console.log('[SSO] ✅ Token validado pelo Hub');

    // 2. Descriptografar token para obter dados do usuário
    console.log('[SSO] Descriptografando token...');

    const decrypted = decryptToken(token, ENCRYPTION_KEY);

    if (!decrypted) {
        console.error('[SSO] ❌ Falha ao descriptografar token');
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>500 Internal Server Error</h1><p>Failed to decrypt token</p>');
        return;
    }

    // Parse: md5_token|user_id|email_or_nickname
    const parts = decrypted.split('|');
    if (parts.length !== 3) {
        console.error('[SSO] ❌ Token com estrutura inválida:', decrypted);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>500 Internal Server Error</h1><p>Invalid token structure</p>');
        return;
    }

    const [md5Token, userId, emailOrNickname] = parts;

    console.log('[SSO] ✅ Token descriptografado:');
    console.log('  - User ID:', userId);
    console.log('  - Email/Nickname:', emailOrNickname);

    // 3. Criar/buscar usuário no Supabase
    console.log('[SSO] Verificando usuário no Supabase...');

    const user = await ensureUserExists(emailOrNickname, userId, emailOrNickname);

    if (!user) {
        console.error('[SSO] ❌ Falha ao criar/buscar usuário');
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>500 Internal Server Error</h1><p>Failed to create user</p>');
        return;
    }

    console.log('[SSO] ✅ Usuário pronto:', user.email);

    // 4. Criar cookie de sessão
    console.log('[SSO] Criando cookie de sessão...');

    const sessionPayload = {
        sub: user.id,
        email: user.email,
        nickname: emailOrNickname,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2 horas
    };

    const sessionJWT = createJWT(sessionPayload, APP_JWT_SECRET);
    const cookieHeader = createSecureCookie('vs_session', sessionJWT, 2 * 60 * 60);

    console.log('[SSO] ✅ Cookie criado');

    // 5. Redirecionar para /chat
    console.log('[SSO] Redirecionando para /chat...');
    console.log('========================================\n');

    res.writeHead(302, {
        'Location': `${APP_BASE_URL}/chat`,
        'Set-Cookie': cookieHeader
    });
    res.end();
}

/**
 * GET /api/me
 */
function handleGetMe(req, res) {
    console.log('\n[API /me] Verificando autenticação');
    console.log('[API /me] Headers cookie:', req.headers.cookie ? 'presente' : 'ausente');

    const cookies = parseCookies(req.headers.cookie);
    console.log('[API /me] Cookies parseados:', Object.keys(cookies));

    const sessionToken = cookies.vs_session;

    if (!sessionToken) {
        console.log('[API /me] ❌ Cookie vs_session não encontrado');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'no_session' }));
        return;
    }

    console.log('[API /me] Cookie encontrado, validando JWT...');

    const payload = verifySessionJWT(sessionToken, APP_JWT_SECRET);

    if (!payload) {
        console.log('[API /me] ❌ JWT inválido ou expirado');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'invalid_session' }));
        return;
    }

    console.log('[API /me] ✅ Usuário autenticado:', payload.email);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        ok: true,
        user: {
            id: payload.sub,
            email: payload.email,
            nickname: payload.nickname
        }
    }));
}

/**
 * POST /api/logout
 */
function handleLogout(req, res) {
    const expiredCookie = 'vs_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';

    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': expiredCookie
    });
    res.end(JSON.stringify({ ok: true }));
}

// ============================================================================
// SERVIDOR HTTP
// ============================================================================

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const queryParams = parsedUrl.query;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', APP_BASE_URL);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Rotas
    if (pathname === '/sso/callback' && req.method === 'GET') {
        await handleSSOCallback(req, res, queryParams);
    } else if (pathname === '/api/me' && req.method === 'GET') {
        handleGetMe(req, res);
    } else if (pathname === '/api/logout' && req.method === 'POST') {
        handleLogout(req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }
});

server.listen(PORT, () => {
    console.log('\n========================================');
    console.log('🚀 SSO Server rodando (Opção B - Simplificado)!');
    console.log('📍 URL:', `http://localhost:${PORT}`);
    console.log('🔗 Hub Validate:', HUB_VALIDATE_URL);
    console.log('🏠 App Base:', APP_BASE_URL);
    console.log('========================================\n');
});
