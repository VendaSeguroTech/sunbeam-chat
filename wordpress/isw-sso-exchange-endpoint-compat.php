<?php
/**
 * Plugin Name: ISW SSO Exchange Endpoint
 * Description: Endpoint de exchange de tokens SSO para IA Experta (JWT RS256)
 * Version: 1.0.0
 * Author: VendaSeguro
 * Requires PHP: 5.6
 */

// Evitar acesso direto
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Registrar o endpoint REST API
 */
add_action('rest_api_init', 'isw_sso_register_endpoint');

function isw_sso_register_endpoint() {
    register_rest_route('isw-sso/v1', '/exchange', array(
        'methods' => 'POST',
        'callback' => 'isw_sso_exchange_token',
        'permission_callback' => '__return_true',
    ));
}

/**
 * Endpoint de exchange
 */
function isw_sso_exchange_token(WP_REST_Request $request) {
    global $wpdb;

    error_log('[ISW SSO] Exchange request received');

    // 1. Validar origin (CORS)
    $allowed_origins = array(
        'https://experta.vendaseguro.com.br',
        'http://localhost:8080',
        'http://localhost:5173',
    );

    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

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

    // 2. Extrair token
    $params = $request->get_json_params();
    $encrypted_token = isset($params['token']) ? $params['token'] : '';

    if (empty($encrypted_token)) {
        error_log('[ISW SSO] Missing token');
        return new WP_REST_Response(array(
            'ok' => false,
            'error' => 'missing_token'
        ), 400);
    }

    // 3. Descriptografar
    $decrypted = isw_decrypt($encrypted_token);

    if (!$decrypted) {
        error_log('[ISW SSO] Failed to decrypt');
        return new WP_REST_Response(array(
            'ok' => false,
            'error' => 'invalid_token_format'
        ), 401);
    }

    // 4. Parse: md5_token|user_id|email
    $parts = explode('|', $decrypted);
    if (count($parts) !== 3) {
        error_log('[ISW SSO] Invalid structure');
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
        error_log('[ISW SSO] Token not found in database');
        return new WP_REST_Response(array(
            'ok' => false,
            'error' => 'invalid_or_expired'
        ), 401);
    }

    // 6. Verificar expiração (3 horas)
    $created_time = strtotime($sso_record->update_time);
    $current_time = time();
    $expiration_seconds = 3 * 60 * 60;

    if (($current_time - $created_time) > $expiration_seconds) {
        error_log('[ISW SSO] Token expired');
        $wpdb->delete($table_name, array('token' => $isw_token));
        return new WP_REST_Response(array(
            'ok' => false,
            'error' => 'invalid_or_expired'
        ), 401);
    }

    // 7. Buscar usuário
    $user = get_user_by('id', $user_id);

    if (!$user) {
        error_log('[ISW SSO] User not found: ' . $user_id);
        return new WP_REST_Response(array(
            'ok' => false,
            'error' => 'user_not_found'
        ), 401);
    }

    // 8. Gerar JWT RS256
    $jwt = isw_generate_jwt_rs256(array(
        'iss' => 'hub.vendaseguro.com.br',
        'aud' => 'ia.vendaseguro.com.br',
        'sub' => (string)$user->ID,
        'email' => $user->user_email,
        'nickname' => $user->user_login,
        'iat' => time(),
        'exp' => time() + (10 * 60),
    ));

    if (!$jwt) {
        error_log('[ISW SSO] Failed to generate JWT');
        return new WP_REST_Response(array(
            'ok' => false,
            'error' => 'jwt_generation_failed'
        ), 500);
    }

    error_log('[ISW SSO] JWT generated for user: ' . $user->ID);

    // 9. Retornar JWT
    return new WP_REST_Response(array(
        'ok' => true,
        'jwt' => $jwt
    ), 200);
}

/**
 * Descriptografar token
 */
function isw_decrypt($data) {
    $key = 'isw_venda_seguro';

    try {
        $data = str_replace(array('-', '_'), array('+', '/'), $data);
        $decoded = base64_decode($data);

        if (!$decoded) {
            return false;
        }

        $parts = explode(';', $decoded);
        if (count($parts) !== 2) {
            return false;
        }

        list($encrypted_data, $iv) = $parts;

        $iv = substr(str_pad($iv, 16, "\0"), 0, 16);
        $key = substr(str_pad($key, 32, "\0"), 0, 32);

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
 * Gerar JWT RS256
 */
function isw_generate_jwt_rs256($payload) {
    $private_key_path = WP_CONTENT_DIR . '/keys/isw-sso-private.pem';

    if (defined('ISW_SSO_PRIVATE_KEY')) {
        $private_key = ISW_SSO_PRIVATE_KEY;
    } elseif (file_exists($private_key_path)) {
        $private_key = file_get_contents($private_key_path);
    } else {
        error_log('[ISW SSO] Private key not found at: ' . $private_key_path);
        return false;
    }

    $header = array(
        'typ' => 'JWT',
        'alg' => 'RS256'
    );

    $header_encoded = isw_base64url_encode(json_encode($header));
    $payload_encoded = isw_base64url_encode(json_encode($payload));

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

    $signature_encoded = isw_base64url_encode($signature);

    return $header_encoded . '.' . $payload_encoded . '.' . $signature_encoded;
}

/**
 * Base64 URL-safe encoding
 */
function isw_base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * CORS headers
 */
add_action('rest_api_init', 'isw_sso_add_cors', 15);

function isw_sso_add_cors() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', 'isw_sso_cors_headers');
}

function isw_sso_cors_headers($value) {
    $allowed_origins = array(
        'https://experta.vendaseguro.com.br',
        'http://localhost:8080',
        'http://localhost:5173',
    );

    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

    if (in_array($origin, $allowed_origins)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
    }

    return $value;
}
