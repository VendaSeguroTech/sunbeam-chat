<?php
/**
 * Plugin Name: ISW SSO Exchange Endpoint
 * Description: Endpoint de exchange de tokens SSO para IA Experta (JWT RS256)
 * Version: 1.0.0
 * Author: VendaSeguro
 *
 * Este plugin adiciona o endpoint:
 * POST /wp-json/isw-sso/v1/exchange
 *
 * IMPORTANTE: Instalar no WordPress do Hub VendaSeguro
 */

// Evitar acesso direto
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Registrar o endpoint REST API
 */
add_action('rest_api_init', function () {
    error_log('[ISW SSO] Registrando endpoint REST API...');

    $result = register_rest_route('isw-sso/v1', '/exchange', array(
        'methods' => 'POST',
        'callback' => 'isw_sso_exchange_token',
        'permission_callback' => '__return_true', // Público, mas validado internamente
    ));

    if ($result) {
        error_log('[ISW SSO] Endpoint registrado com sucesso!');
    } else {
        error_log('[ISW SSO] ERRO: Falha ao registrar endpoint!');
    }
});

/**
 * Endpoint de exchange: recebe token criptografado, retorna JWT RS256
 *
 * Request:
 * POST /wp-json/isw-sso/v1/exchange
 * Content-Type: application/json
 * { "token": "<ENCRYPTED_TOKEN>" }
 *
 * Response (sucesso):
 * 200 { "ok": true, "jwt": "<JWT_RS256>" }
 *
 * Response (erro):
 * 401 { "ok": false, "error": "invalid_or_expired" }
 */
function isw_sso_exchange_token(WP_REST_Request $request) {
    global $wpdb;

    // Log início (sem expor token completo)
    error_log('[ISW SSO] Exchange request received');

    // 1. Validar origin (CORS restrito ao domínio da IA)
    $allowed_origins = array(
        'https://experta.vendaseguro.com.br',
        'http://localhost:8080', // Development
        'http://localhost:5173', // Vite dev server
    );

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (!in_array($origin, $allowed_origins)) {
        error_log('[ISW SSO] Invalid origin: ' . $origin);
        return new WP_REST_Response(array(
            'ok' => false,
            'error' => 'forbidden'
        ), 403);
    }

    // Set CORS headers
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');

    // 2. Extrair token do body
    $params = $request->get_json_params();
    $encrypted_token = $params['token'] ?? '';

    if (empty($encrypted_token)) {
        error_log('[ISW SSO] Missing token in request');
        return new WP_REST_Response(array(
            'ok' => false,
            'error' => 'missing_token'
        ), 400);
    }

    // 3. Descriptografar o token (mesma lógica do plugin_isw_sso.php)
    $decrypted = isw_sso_exchange_decrypt($encrypted_token);

    if (!$decrypted) {
        error_log('[ISW SSO] Failed to decrypt token');
        return new WP_REST_Response(array(
            'ok' => false,
            'error' => 'invalid_token_format'
        ), 401);
    }

    // 4. Parse do token: md5_token|user_id|email_or_nickname
    $parts = explode('|', $decrypted);
    if (count($parts) !== 3) {
        error_log('[ISW SSO] Invalid token structure');
        return new WP_REST_Response(array(
            'ok' => false,
            'error' => 'invalid_token_structure'
        ), 401);
    }

    list($isw_token, $user_id, $user_email) = $parts;

    // 5. Validar na tabela ISW_sso
    $table_name = $wpdb->prefix . 'isw_sso';

    $sso_record = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table_name WHERE token = %s",
        $isw_token
    ));

    if (!$sso_record) {
        error_log('[ISW SSO] Token not found in database: ' . substr($isw_token, 0, 10) . '...');
        return new WP_REST_Response(array(
            'ok' => false,
            'error' => 'invalid_or_expired'
        ), 401);
    }

    // 6. Verificar expiração (3 horas de validade)
    $created_time = strtotime($sso_record->update_time);
    $current_time = time();
    $expiration_seconds = 3 * 60 * 60; // 3 horas

    if (($current_time - $created_time) > $expiration_seconds) {
        error_log('[ISW SSO] Token expired');

        // Remover token expirado
        $wpdb->delete($table_name, array('token' => $isw_token));

        return new WP_REST_Response(array(
            'ok' => false,
            'error' => 'invalid_or_expired'
        ), 401);
    }

    // 7. Buscar dados completos do usuário
    $user = get_user_by('id', $user_id);

    if (!$user) {
        error_log('[ISW SSO] User not found: ' . $user_id);
        return new WP_REST_Response(array(
            'ok' => false,
            'error' => 'user_not_found'
        ), 401);
    }

    // 8. Gerar JWT RS256 com 10 minutos de validade
    $jwt = isw_sso_exchange_generate_jwt_rs256(array(
        'iss' => 'hub.vendaseguro.com.br',
        'aud' => 'ia.vendaseguro.com.br',
        'sub' => (string)$user->ID,
        'email' => $user->user_email,
        'nickname' => $user->user_login,
        'iat' => time(),
        'exp' => time() + (10 * 60), // 10 minutos
    ));

    if (!$jwt) {
        error_log('[ISW SSO] Failed to generate JWT');
        return new WP_REST_Response(array(
            'ok' => false,
            'error' => 'jwt_generation_failed'
        ), 500);
    }

    error_log('[ISW SSO] JWT generated successfully for user: ' . $user->ID);

    // 9. Opcionalmente, marcar token como usado (one-time use)
    // $wpdb->delete($table_name, array('isw_token' => $isw_token));

    // 10. Retornar JWT
    return new WP_REST_Response(array(
        'ok' => true,
        'jwt' => $jwt
    ), 200);
}

/**
 * Descriptografar token (mesma função do plugin_isw_sso.php)
 * Renomeada para evitar conflito com plugin_isw_sso
 */
function isw_sso_exchange_decrypt($data) {
    $key = 'isw_venda_seguro';

    try {
        // Substituir caracteres URL-safe
        $data = str_replace(array('-', '_'), array('+', '/'), $data);

        // Decodificar base64
        $decoded = base64_decode($data);
        if (!$decoded) {
            return false;
        }

        // Separar dados criptografados e IV
        $parts = explode(';', $decoded);
        if (count($parts) !== 2) {
            return false;
        }

        list($encrypted_data, $iv) = $parts;

        // Ajustar tamanhos
        $iv = substr(str_pad($iv, 16, "\0"), 0, 16);
        $key = substr(str_pad($key, 32, "\0"), 0, 32);

        // Descriptografar
        $decrypted = openssl_decrypt(
            base64_decode($encrypted_data),
            'AES-256-CBC',
            $key,
            OPENSSL_RAW_DATA,
            $iv
        );

        return $decrypted;

    } catch (Exception $e) {
        error_log('[ISW SSO] Decryption error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Gerar JWT assinado com RS256
 *
 * Requer chave privada RSA configurada via:
 * - Arquivo: wp-content/keys/isw-sso-private.pem
 * - Ou constante: ISW_SSO_PRIVATE_KEY
 */
function isw_sso_exchange_generate_jwt_rs256($payload) {
    // 1. Carregar chave privada
    $private_key_path = WP_CONTENT_DIR . '/keys/isw-sso-private.pem';

    if (defined('ISW_SSO_PRIVATE_KEY')) {
        $private_key = ISW_SSO_PRIVATE_KEY;
    } elseif (file_exists($private_key_path)) {
        $private_key = file_get_contents($private_key_path);
    } else {
        error_log('[ISW SSO] Private key not found. Set ISW_SSO_PRIVATE_KEY constant or create ' . $private_key_path);
        return false;
    }

    // 2. Criar header
    $header = array(
        'typ' => 'JWT',
        'alg' => 'RS256'
    );

    // 3. Encodar header e payload
    $header_encoded = isw_sso_exchange_base64url_encode(json_encode($header));
    $payload_encoded = isw_sso_exchange_base64url_encode(json_encode($payload));

    // 4. Criar assinatura
    $signature_input = $header_encoded . '.' . $payload_encoded;
    $signature = '';

    $key_resource = openssl_pkey_get_private($private_key);
    if (!$key_resource) {
        error_log('[ISW SSO] Invalid private key');
        return false;
    }

    $success = openssl_sign($signature_input, $signature, $key_resource, OPENSSL_ALGO_SHA256);

    if (!$success) {
        error_log('[ISW SSO] Failed to sign JWT');
        return false;
    }

    $signature_encoded = isw_sso_exchange_base64url_encode($signature);

    // 5. Retornar JWT completo
    return $header_encoded . '.' . $payload_encoded . '.' . $signature_encoded;
}

/**
 * Base64 URL-safe encoding
 */
function isw_sso_exchange_base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Adicionar CORS headers para preflight
 */
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        $allowed_origins = array(
            'https://experta.vendaseguro.com.br',
            'http://localhost:8080',
            'http://localhost:5173',
        );

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if (in_array($origin, $allowed_origins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
        }

        return $value;
    });
}, 15);
