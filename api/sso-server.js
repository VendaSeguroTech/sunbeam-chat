/**
 * API Node.js - SSO via Token Exchange (JWT RS256)
 *
 * Arquitetura:
 * 1. Hub envia usuário para: GET /sso/callback?sso=1&token=<ENCRYPTED>&ts=<epoch>
 * 2. API chama Hub: POST /wp-json/isw-sso/v1/exchange com token
 * 3. Hub retorna JWT RS256 de 10 minutos
 * 4. API valida assinatura RS256 com chave pública
 * 5. API cria cookie vs_session HttpOnly Secure SameSite=Lax (2 horas)
 * 6. API redireciona para /app (frontend)
 * 7. Frontend chama GET /api/me para obter usuário logado
 */

const http = require('http');
const https = require('https');
const url = require('url');
const crypto = require('crypto');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const PORT = process.env.PORT || 3002;

// URLs
const HUB_EXCHANGE_URL = process.env.HUB_EXCHANGE_URL ||
    'https://hub.vendaseguro.com.br/wp-json/isw-sso/v1/exchange';

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:8080';

// Chave pública do Hub para validar JWT
const HUB_JWT_PUBLIC_KEY_PATH = process.env.HUB_JWT_PUBLIC_KEY_PATH || './keys/isw-sso-public.pem';

let HUB_PUBLIC_KEY;

// Chave para assinar o cookie de sessão da IA (JWT próprio)
const APP_JWT_SECRET = process.env.APP_JWT_SECRET || 'your-app-secret-change-in-production';

// Supabase (para criar/buscar usuários)
const SUPABASE_URL = process.env.SUPABASE_URL || 'SUA_URL_AQUI';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'SUA_SERVICE_KEY_AQUI';

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

// Carregar chave pública do Hub
try {
    if (process.env.HUB_JWT_PUBLIC_KEY) {
        HUB_PUBLIC_KEY = process.env.HUB_JWT_PUBLIC_KEY;
        console.log('[INIT] ✅ Chave pública carregada de ENV');
    } else if (fs.existsSync(HUB_JWT_PUBLIC_KEY_PATH)) {
        HUB_PUBLIC_KEY = fs.readFileSync(HUB_JWT_PUBLIC_KEY_PATH, 'utf8');
        console.log('[INIT] ✅ Chave pública carregada de:', HUB_JWT_PUBLIC_KEY_PATH);
    } else {
        console.error('[INIT] ❌ Chave pública não encontrada!');
        console.error('[INIT] Configure HUB_JWT_PUBLIC_KEY ou crie:', HUB_JWT_PUBLIC_KEY_PATH);
        process.exit(1);
    }
} catch (error) {
    console.error('[INIT] ❌ Erro ao carregar chave pública:', error.message);
    process.exit(1);
}

// ============================================================================
// UTILIT ÁRIOS - JWT
// ============================================================================

/**
 * Validar JWT RS256 com chave pública
 */
function verifyJWT(token, publicKey) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        const [headerB64, payloadB64, signatureB64] = parts;

        // Verificar assinatura
        const signatureInput = `${headerB64}.${payloadB64}`;
        const signature = base64UrlDecode(signatureB64);

        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(signatureInput);
        verifier.end();

        const isValid = verifier.verify(publicKey, signature);

        if (!isValid) {
            console.error('[JWT] ❌ Assinatura inválida');
            return null;
        }

        // Decodificar payload
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));

        // Verificar expiração
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            console.error('[JWT] ❌ Token expirado');
            return null;
        }

        // Verificar audience
        if (payload.aud && !payload.aud.includes('ia.vendaseguro.com.br')) {
            console.error('[JWT] ❌ Audience inválido:', payload.aud);
            return null;
        }

        return payload;

    } catch (error) {
        console.error('[JWT] ❌ Erro ao validar:', error.message);
        return null;
    }
}

/**
 * Criar JWT para o cookie de sessão da IA
 */
function createSessionJWT(user) {
    const header = { typ: 'JWT', alg: 'HS256' };
    const payload = {
        iss: 'ia.vendaseguro.com.br',
        sub: user.id,
        email: user.email,
        nickname: user.nickname,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60), // 2 horas
    };

    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const payloadB64 = base64UrlEncode(JSON.stringify(payload));

    const signatureInput = `${headerB64}.${payloadB64}`;
    const signature = crypto.createHmac('sha256', APP_JWT_SECRET)
        .update(signatureInput)
        .digest();

    const signatureB64 = base64UrlEncode(signature);

    return `${headerB64}.${payloadB64}.${signatureB64}`;
}

/**
 * Validar JWT do cookie de sessão
 */
function verifySessionJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        const [headerB64, payloadB64, signatureB64] = parts;

        // Verificar assinatura
        const signatureInput = `${headerB64}.${payloadB64}`;
        const expectedSignature = crypto.createHmac('sha256', APP_JWT_SECRET)
            .update(signatureInput)
            .digest();

        const expectedSignatureB64 = base64UrlEncode(expectedSignature);

        if (signatureB64 !== expectedSignatureB64) {
            console.error('[SESSION] ❌ Assinatura inválida');
            return null;
        }

        // Decodificar payload
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));

        // Verificar expiração
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            console.error('[SESSION] ❌ Sessão expirada');
            return null;
        }

        return payload;

    } catch (error) {
        console.error('[SESSION] ❌ Erro ao validar:', error.message);
        return null;
    }
}

// Base64 URL-safe encoding/decoding
function base64UrlEncode(data) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    return buffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
        str += '=';
    }
    return Buffer.from(str, 'base64');
}

// ============================================================================
// UTILIT ÁRIOS - COOKIES
// ============================================================================

/**
 * Parsear cookies do header
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
 * Criar cookie HttpOnly Secure SameSite
 */
function createSecureCookie(name, value, maxAgeSeconds) {
    const isProduction = process.env.NODE_ENV === 'production';

    let cookie = `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;

    if (isProduction) {
        cookie += '; Secure'; // HTTPS only
    }

    return cookie;
}

// ============================================================================
// ROTAS
// ============================================================================

/**
 * GET /sso/callback?sso=1&token=<ENCRYPTED>&ts=<epoch>
 *
 * 1. Recebe token criptografado da URL
 * 2. Chama Hub para fazer exchange (token → JWT)
 * 3. Valida JWT RS256 do Hub
 * 4. Cria/busca usuário no Supabase
 * 5. Cria cookie de sessão HttpOnly
 * 6. Redireciona para /app
 */
async function handleSSOCallback(req, res, queryParams) {
    console.log('\n========================================');
    console.log('[SSO CALLBACK] Iniciando autenticação');
    console.log('========================================\n');

    const { token, ts, sso } = queryParams;

    // Validar parâmetros
    if (!token || !sso) {
        console.error('[SSO] ❌ Parâmetros inválidos');
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>400 Bad Request</h1><p>Missing token or sso parameter</p>');
        return;
    }

    console.log('[SSO] Token recebido (hash):', crypto.createHash('md5').update(token).digest('hex'));
    console.log('[SSO] Timestamp:', ts);

    // 1. Fazer exchange com o Hub
    console.log('[SSO] Chamando Hub exchange endpoint...');

    const exchangeData = await callHubExchange(token);

    if (!exchangeData || !exchangeData.ok) {
        console.error('[SSO] ❌ Exchange falhou:', exchangeData?.error || 'unknown');
        res.writeHead(401, { 'Content-Type': 'text/html' });
        res.end('<h1>401 Unauthorized</h1><p>Token inválido ou expirado</p>');
        return;
    }

    console.log('[SSO] ✅ Exchange bem-sucedido');

    // 2. Validar JWT do Hub
    console.log('[SSO] Validando JWT do Hub...');

    const hubPayload = verifyJWT(exchangeData.jwt, HUB_PUBLIC_KEY);

    if (!hubPayload) {
        console.error('[SSO] ❌ JWT inválido');
        res.writeHead(401, { 'Content-Type': 'text/html' });
        res.end('<h1>401 Unauthorized</h1><p>Invalid JWT signature</p>');
        return;
    }

    console.log('[SSO] ✅ JWT válido');
    console.log('[SSO] Usuário:', hubPayload.email, '(ID:', hubPayload.sub, ')');

    // 3. Criar/buscar usuário no Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const user = await ensureUserExists(supabase, {
        id: hubPayload.sub,
        email: hubPayload.email,
        nickname: hubPayload.nickname,
    });

    if (!user) {
        console.error('[SSO] ❌ Erro ao criar usuário');
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>500 Internal Server Error</h1><p>Failed to create user</p>');
        return;
    }

    console.log('[SSO] ✅ Usuário pronto:', user.id);

    // 4. Criar cookie de sessão
    const sessionToken = createSessionJWT(user);
    const cookie = createSecureCookie('vs_session', sessionToken, 2 * 60 * 60); // 2 horas

    console.log('[SSO] ✅ Cookie de sessão criado');

    // 5. Redirecionar para /app
    const redirectUrl = `${APP_BASE_URL}/chat`;

    console.log('[SSO] ✅ Redirecionando para:', redirectUrl);
    console.log('\n========================================\n');

    res.writeHead(302, {
        'Location': redirectUrl,
        'Set-Cookie': cookie,
    });
    res.end();
}

/**
 * GET /api/me
 *
 * Retorna dados do usuário logado ou 401
 */
async function handleApiMe(req, res) {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies.vs_session;

    if (!sessionToken) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'not_authenticated' }));
        return;
    }

    const payload = verifySessionJWT(sessionToken);

    if (!payload) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'invalid_session' }));
        return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        ok: true,
        user: {
            id: payload.sub,
            email: payload.email,
            nickname: payload.nickname,
        },
    }));
}

/**
 * POST /api/logout
 *
 * Remove cookie de sessão
 */
function handleLogout(req, res) {
    const cookie = createSecureCookie('vs_session', '', 0); // Expira imediatamente

    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
    });
    res.end(JSON.stringify({ ok: true }));
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Chamar endpoint de exchange do Hub
 */
function callHubExchange(token) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ token });

        const urlObj = new URL(HUB_EXCHANGE_URL);

        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (error) {
                    console.error('[HUB EXCHANGE] ❌ Invalid JSON:', data);
                    resolve({ ok: false, error: 'invalid_response' });
                }
            });
        });

        req.on('error', (error) => {
            console.error('[HUB EXCHANGE] ❌ Request error:', error.message);
            resolve({ ok: false, error: 'network_error' });
        });

        req.write(postData);
        req.end();
    });
}

/**
 * Garantir que usuário existe no Supabase
 */
async function ensureUserExists(supabase, user) {
    try {
        const normalizedEmail = user.email.toLowerCase().trim();

        // Verificar se existe
        const { data: existing } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', normalizedEmail)
            .single();

        if (existing) {
            console.log('[USER] ✅ Usuário já existe:', existing.id);
            return {
                id: existing.id,
                email: existing.email,
                nickname: existing.name || user.nickname,
            };
        }

        // Criar usuário
        console.log('[USER] 📝 Criando novo usuário...');

        const randomPassword = crypto.randomBytes(16).toString('hex') + 'Aa1!';

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: normalizedEmail,
            password: randomPassword,
            email_confirm: true,
        });

        if (authError || !authData.user) {
            console.error('[USER] ❌ Erro ao criar usuário:', authError?.message);
            return null;
        }

        const userId = authData.user.id;

        // Criar perfil
        await supabase.from('profiles').insert({
            id: userId,
            email: normalizedEmail,
            name: user.nickname || normalizedEmail.split('@')[0],
            role: 'default',
        });

        console.log('[USER] ✅ Usuário criado:', userId);

        return {
            id: userId,
            email: normalizedEmail,
            nickname: user.nickname,
        };

    } catch (error) {
        console.error('[USER] ❌ Erro:', error.message);
        return null;
    }
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Rotas
    if (pathname === '/sso/callback' && req.method === 'GET') {
        await handleSSOCallback(req, res, queryParams);
    } else if (pathname === '/api/me' && req.method === 'GET') {
        await handleApiMe(req, res);
    } else if (pathname === '/api/logout' && req.method === 'POST') {
        handleLogout(req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
    }
});

// ============================================================================
// START SERVER
// ============================================================================

server.listen(PORT, () => {
    console.log('\n========================================');
    console.log(`🚀 SSO Server rodando!`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🔗 Hub Exchange: ${HUB_EXCHANGE_URL}`);
    console.log(`🏠 App Base: ${APP_BASE_URL}`);
    console.log(`🔑 Chave pública carregada: ✅`);
    console.log('========================================\n');
});
