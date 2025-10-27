/**
 * API Node.js - SSO via endpoint isw_validar_usuario.php (Opção B)
 *
 * Arquitetura simplificada (mesma do Melhor Produto) + Supabase Auth:
 * 1. Hub envia usuário para: GET /sso/callback?token=<ENCRYPTED>&ts=<epoch>
 * 2. API chama Hub: POST https://hub.vendaseguro.com.br/isw_api/isw_validar_usuario.php
 * 3. Hub retorna "liberado" ou "negado"
 * 4. API descriptografa token para extrair dados do usuário
 * 5. API busca usuário no Supabase Auth (auth.users)
 * 6. API cria sessão Supabase via Admin API (sem senha)
 * 7. API cria cookie vs_session HttpOnly com tokens Supabase
 * 8. API redireciona para /chat com tokens na URL (fallback)
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
 * Buscar usuário no Supabase Auth (auth.users)
 */
async function findAuthUserByEmail(email) {
    if (!supabase) {
        console.warn('[SUPABASE] ⚠️  Supabase não configurado.');
        return null;
    }

    try {
        // Usar Admin API para buscar usuário no auth.users
        const { data: { users }, error } = await supabase.auth.admin.listUsers();

        if (error) {
            console.error('[SUPABASE AUTH] ❌ Erro ao listar usuários:', error.message);
            return null;
        }

        const user = users.find(u => u.email === email);

        if (user) {
            console.log('[SUPABASE AUTH] ✅ Usuário encontrado:', email);
            return user;
        }

        console.log('[SUPABASE AUTH] ⚠️  Usuário não encontrado:', email);
        return null;

    } catch (error) {
        console.error('[SUPABASE AUTH] ❌ Erro inesperado:', error.message);
        return null;
    }
}

/**
 * Buscar usuário no Supabase. Não cria se não existir.
 */
async function findUserByEmail(email) {
    if (!supabase) {
        console.warn('[SUPABASE] ⚠️  Supabase não configurado, não é possível buscar usuário.');
        return null;
    }

    try {
        // Buscar usuário por email na tabela de perfis
        const { data: existingUser, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = 'exact one row not found'
            console.error('[SUPABASE] ❌ Erro ao buscar usuário:', error.message);
            return null;
        }

        if (existingUser) {
            console.log('[SUPABASE] ✅ Usuário encontrado:', email);
            return existingUser;
        }

        console.log('[SUPABASE] ⚠️  Usuário não encontrado na IA:', email);
        return null;

    } catch (error) {
        console.error('[SUPABASE] ❌ Erro inesperado ao buscar usuário:', error.message);
        return null;
    }
}

/**
 * Criar sessão Supabase sem senha usando Admin API
 *
 * Usa admin.createUser ou busca usuário existente, depois usa signInAsUser
 */
async function createSupabaseSession(userId) {
    if (!supabase) {
        console.warn('[SUPABASE SESSION] ⚠️  Supabase não configurado.');
        return null;
    }

    try {
        console.log('[SUPABASE SESSION] Criando sessão para user ID:', userId);

        // Usar Admin API para criar sessão sem senha
        // Método: auth.admin.createUser com custom claims (gera tokens automaticamente)
        const { data, error } = await supabase.auth.admin.getUserById(userId);

        if (error) {
            console.error('[SUPABASE SESSION] ❌ Erro ao buscar usuário:', error.message);
            return null;
        }

        console.log('[SUPABASE SESSION] ✅ Usuário encontrado:', data.user.email);

        // IMPORTANTE: Usar generateLink com tipo 'recovery' que retorna tokens
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: data.user.email
        });

        if (linkError) {
            console.error('[SUPABASE SESSION] ❌ Erro ao gerar tokens:', linkError.message);
            return null;
        }

        console.log('[SUPABASE SESSION] ✅ Tokens gerados via recovery link');
        console.log('[SUPABASE SESSION] Link gerado:', linkData.properties.action_link);

        // Extrair tokens da URL
        const linkUrl = linkData.properties.action_link;

        // O formato pode ser: https://...#access_token=XXX ou https://...?token=XXX
        let accessToken = null;
        let refreshToken = null;

        // Tentar extrair do hash (#)
        if (linkUrl.includes('#')) {
            const hashPart = linkUrl.split('#')[1];
            const hashParams = new URLSearchParams(hashPart);
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
        }

        // Se não achou no hash, tentar extrair de query params (?)
        if (!accessToken && linkUrl.includes('?')) {
            const queryPart = linkUrl.split('?')[1];
            const queryParams = new URLSearchParams(queryPart);
            accessToken = queryParams.get('access_token');
            refreshToken = queryParams.get('refresh_token');

            // Recovery link usa 'token' em vez de 'access_token'
            if (!accessToken) {
                const recoveryToken = queryParams.get('token');
                if (recoveryToken) {
                    // Recovery token precisa ser usado para obter access/refresh tokens
                    console.log('[SUPABASE SESSION] ⚠️  Recovery token detectado, mas não é direto');
                    console.log('[SUPABASE SESSION] Usando outra estratégia...');

                    // Estratégia alternativa: usar admin.updateUserById para forçar email confirmado
                    // depois gerar um link de tipo 'magiclink'

                    // Ou melhor: retornar o próprio recovery token para o frontend processar
                    return {
                        accessToken: recoveryToken, // Frontend vai processar via verifyOtp
                        refreshToken: null,
                        user: data.user,
                        isRecoveryToken: true
                    };
                }
            }
        }

        if (!accessToken) {
            console.error('[SUPABASE SESSION] ❌ Tokens não encontrados no link');
            console.error('[SUPABASE SESSION] Link completo:', linkUrl);
            return null;
        }

        console.log('[SUPABASE SESSION] ✅ Access token:', accessToken.substring(0, 30) + '...');
        if (refreshToken) {
            console.log('[SUPABASE SESSION] ✅ Refresh token:', refreshToken.substring(0, 30) + '...');
        }

        return {
            accessToken,
            refreshToken,
            user: data.user,
            isRecoveryToken: false
        };

    } catch (error) {
        console.error('[SUPABASE SESSION] ❌ Erro inesperado:', error.message);
        console.error('[SUPABASE SESSION] Stack:', error.stack);
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

    // 3. Buscar usuário no Supabase Auth (auth.users)
    console.log('[SSO] Verificando se o usuário existe no Supabase Auth...');

    const authUser = await findAuthUserByEmail(emailOrNickname);

    if (!authUser) {
        console.error('[SSO] ❌ Usuário não cadastrado na IA:', emailOrNickname);
        console.log('[SSO] Redirecionando de volta para o Hub...');

        // Redirecionar para o Hub com mensagem
        res.writeHead(302, {
            'Location': 'https://hub.vendaseguro.com.br/?error=not_registered&app=experta'
        });
        res.end();
        return;
    }

    console.log('[SSO] ✅ Usuário encontrado no Supabase Auth:', authUser.email);
    console.log('[SSO] User ID:', authUser.id);

    // 4. Criar sessão Supabase (sem senha)
    console.log('[SSO] Criando sessão Supabase...');

    const supabaseSession = await createSupabaseSession(authUser.id);

    if (!supabaseSession) {
        console.error('[SSO] ❌ Falha ao criar sessão Supabase');
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>500 Internal Server Error</h1><p>Failed to create session</p>');
        return;
    }

    console.log('[SSO] ✅ Sessão Supabase criada com sucesso');

    // 5. Criar cookies com tokens Supabase
    console.log('[SSO] Criando cookies de sessão...');

    // Cookie com access_token do Supabase
    const accessTokenCookie = createSecureCookie('sb-access-token', supabaseSession.accessToken, 2 * 60 * 60);
    const refreshTokenCookie = createSecureCookie('sb-refresh-token', supabaseSession.refreshToken, 7 * 24 * 60 * 60); // 7 dias

    // Cookie legado vs_session para compatibilidade
    const sessionPayload = {
        sub: authUser.id,
        email: authUser.email,
        nickname: emailOrNickname,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2 horas
    };

    const sessionJWT = createJWT(sessionPayload, APP_JWT_SECRET);
    const vsSessionCookie = createSecureCookie('vs_session', sessionJWT, 2 * 60 * 60);

    console.log('[SSO] ✅ Cookies criados');

    // 6. Redirecionar para /chat com hash contendo tokens (fallback para frontend)
    console.log('[SSO] Redirecionando para /chat...');
    console.log('========================================\n');

    // Montar URL de redirecionamento
    let redirectUrl;

    if (supabaseSession.isRecoveryToken) {
        // Recovery token: frontend precisa chamar verifyOtp
        redirectUrl = `${APP_BASE_URL}/chat#recovery_token=${encodeURIComponent(supabaseSession.accessToken)}&type=recovery`;
        console.log('[SSO] Usando recovery token (frontend processará via verifyOtp)');
    } else {
        // Access/refresh tokens diretos
        const refreshParam = supabaseSession.refreshToken
            ? `&refresh_token=${encodeURIComponent(supabaseSession.refreshToken)}`
            : '';
        redirectUrl = `${APP_BASE_URL}/chat#access_token=${encodeURIComponent(supabaseSession.accessToken)}${refreshParam}&type=recovery`;
        console.log('[SSO] Usando access_token direto');
    }

    res.writeHead(302, {
        'Location': redirectUrl,
        'Set-Cookie': [accessTokenCookie, refreshTokenCookie, vsSessionCookie]
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
