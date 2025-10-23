<?php
/*
Plugin Name: ISW SSO Client
Author: Integra_SW
Description: Plugin para validar tokens, verificar usuários e realizar login automático no sistema.
Version: 1.2
*/
// Função utilitária para registrar logs técnicos
function isw_log($filename, $message, $data = null)
{
    date_default_timezone_set('America/Sao_Paulo');
    $log_time = date('Y-m-d H:i:s');
    $log_path = plugin_dir_path(__FILE__) . $filename;

    $log_message = "[{$log_time}] {$message}";

    if (!is_null($data)) {
        if (is_array($data) || is_object($data)) {
            $log_message .= ' ' . print_r($data, true);
        } else {
            $log_message .= ' ' . $data;
        }
    }

    $log_message .= "\n";

    file_put_contents($log_path, $log_message, FILE_APPEND);
}

// Definir o acrônimo para as funções do plugin
function isw_handle_token()
{
    global $user_ID;

    $uri    = $_SERVER['REQUEST_URI']   ?? '';
    $method = $_SERVER['REQUEST_METHOD'] ?? 'CLI';

    // 1) Ignora robot.txt, cron e AJAX
    if (
        strpos($uri, '/robots.txt')   !== false ||
        strpos($uri, 'wp-cron.php')   !== false ||
        strpos($uri, 'admin-ajax.php')!== false ||
        (defined('DOING_CRON') && DOING_CRON)
    ) {
        return;
    }

    // 2) Se não há token (ou vier vazio), sai sem log
    if (empty($_REQUEST['token'])) {
        return;
    }

    $token = trim($_REQUEST['token']);

    // 3) Agora sim registra apenas a tentativa legítima
    isw_log('isw_handle_token.log', 'INÍCIO isw_handle_token()', [
        'method'           => $method,
        'uri'              => $uri,
        'user_logged_in'   => is_user_logged_in(),
        'current_user_id'  => get_current_user_id(),
        'token_detectado'  => $token,
        'user_agent'       => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'remote_addr'      => $_SERVER['REMOTE_ADDR']    ?? '',
    ]);

    // 4) Se já estiver logado, aborta
    if (is_user_logged_in()) {
        isw_log('isw_handle_token.log', 'Usuário já logado – não prossegue', [
            'user_id' => get_current_user_id(),
        ]);
        return;
    }

    // 5) Chama a validação do token
    if (function_exists('isw_validate_token')) {
        isw_log('isw_handle_token.log', 'Chamando isw_validate_token()', [
            'token' => $token
        ]);
        isw_validate_token($token);
    } else {
        isw_log('isw_handle_token.log', 'Função isw_validate_token() não encontrada!');
    }
}
add_action('init', 'isw_handle_token');


// Função para descriptografar o token
function isw_decrypt($data, $key)
{
    date_default_timezone_set('America/Sao_Paulo');
    $log_time = date('Y-m-d H:i:s');
    $log_prefix = "[{$log_time}]";

    // Caminho do arquivo de log
    $log_file = 'isw_decrypt.log';

    file_put_contents($log_file, "{$log_prefix} Iniciando descriptografia do token\n", FILE_APPEND);
    file_put_contents($log_file, "{$log_prefix} Token recebido (original): {$data}\n", FILE_APPEND);

    // Substituição segura de caracteres
    $safe_data = str_replace(['-', '_'], ['+', '/'], $data);
    file_put_contents($log_file, "{$log_prefix} Token após replace (-/_ -> +/): {$safe_data}\n", FILE_APPEND);

    // Decodificar base64
    $decoded_data = base64_decode($safe_data);
    if ($decoded_data === false) {
        file_put_contents($log_file, "{$log_prefix} ERRO: Falha ao decodificar base64\n", FILE_APPEND);
        return false;
    }

    file_put_contents($log_file, "{$log_prefix} Dados decodificados base64: {$decoded_data}\n", FILE_APPEND);

    // Separar os dados criptografados e o IV
    if (!str_contains($decoded_data, ';')) {
        file_put_contents($log_file, "{$log_prefix} ERRO: Dados decodificados não contêm separador ';'\n", FILE_APPEND);
        return false;
    }

    $partes = explode(';', $decoded_data, 2);
    if (count($partes) !== 2) {
        file_put_contents($log_file, "{$log_prefix} ERRO: Dados decodificados não foram separados corretamente em 2 partes\n", FILE_APPEND);
        return false;
    }

    list($encrypted_data, $iv) = $partes;
    file_put_contents($log_file, "{$log_prefix} Encrypted data extraído: {$encrypted_data}\n", FILE_APPEND);
    file_put_contents($log_file, "{$log_prefix} IV extraído: {$iv}\n", FILE_APPEND);

    // Ajustar IV
    $iv_original = $iv;
    $iv = substr($iv, 0, 16);
    $iv = str_pad($iv, 16, "\0");

    file_put_contents($log_file, "{$log_prefix} IV ajustado (truncado/pad): {$iv}\n", FILE_APPEND);

    // Descriptografar
    $decrypted = openssl_decrypt($encrypted_data, 'AES-256-CBC', $key, 0, $iv);

    if ($decrypted === false) {
        file_put_contents($log_file, "{$log_prefix} ERRO: Falha ao descriptografar com OpenSSL\n", FILE_APPEND);
    } else {
        file_put_contents($log_file, "{$log_prefix} Token descriptografado com sucesso: {$decrypted}\n", FILE_APPEND);
    }

    // INCLUSÃO DO NOVO LOG ISW PADRÃO
    isw_log('isw_handle_token.log', 'Resultado do isw_decrypt', [
        'sucesso' => $decrypted !== false,
        'decrypted' => $decrypted ?: '(falha na descriptografia)'
    ]);

    return $decrypted;
}

// Função para validar o token descriptografado
function isw_validate_token($encrypted_token)
{
    $log_file = 'isw_validate_token.log';
    isw_log($log_file, 'INÍCIO isw_validate_token()', ['token_recebido' => $encrypted_token]);

    // Etapa 1: Descriptografar token
    $decrypted_token = isw_decrypt($encrypted_token, 'isw_venda_seguro');
    isw_log($log_file, 'Descriptografia concluída', ['token_descriptografado' => $decrypted_token]);

    if (!$decrypted_token) {
        isw_log($log_file, 'Falha na descriptografia');
        return;
    }

    $partes = explode('|', $decrypted_token);
    if (count($partes) !== 3) {
        isw_log($log_file, 'Token com estrutura inválida', ['token' => $decrypted_token]);
        return;
    }

    list($isw_token, $user_id, $user_mail) = $partes;
    isw_log($log_file, 'Token formatado corretamente', compact('isw_token', 'user_id', 'user_mail'));

    // Etapa 2: Verificar e-mail válido
    if (!is_email($user_mail)) {
        isw_log($log_file, 'E-mail inválido', ['email' => $user_mail]);
        return;
    }

    // Etapa 3: Verificar se e-mail existe no WP
    if (!email_exists($user_mail)) {
        isw_log($log_file, 'E-mail não encontrado no WordPress', ['email' => $user_mail]);
        return;
    }

    $user = get_user_by('email', $user_mail);
    isw_log($log_file, 'Usuário recuperado via e-mail', ['user' => $user]);

    if (!$user) {
        isw_log($log_file, 'Usuário não encontrado via get_user_by', ['email' => $user_mail]);
        return;
    }

    // Etapa 4: Validar com o endpoint do hub
    $url = 'https://hub.vendaseguro.com.br/isw_api/isw_validar_usuario.php';
    $post_data = ['token' => $_REQUEST['token']];
    isw_log($log_file, 'Chamando endpoint externo', ['url' => $url, 'post_data' => $post_data]);

    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $post_data,
    ]);

    $response = curl_exec($curl);
    $curl_error = curl_error($curl);
    curl_close($curl);

    isw_log($log_file, 'Resposta do cURL', ['resposta' => $response, 'erro' => $curl_error]);

    // Etapa 5: Validar resposta do endpoint
    if ( trim($response) === 'liberado' ) {
        isw_log($log_file, 'Login autorizado pelo endpoint, sem remover query arg', ['user_ID' => $user->ID]);
    
        // Autenticação WordPress
            // 1) Registra o cookie
            wp_set_auth_cookie( $user->ID, false );
            
            // 2) Carrega o usuário nessa requisição
            wp_set_current_user( $user->ID );
            do_action( 'wp_login', $user->user_login, $user );
            
            // 3) Log adicional
            isw_log( $log_file, 'Usuario autenticado internamente', [
              'user_ID'    => $user->ID,
              'user_login' => $user->user_login
            ]);
    
        // Não chama wp_redirect nem remove_query_arg: a página renderiza com ?token intacto
        isw_log($log_file, 'Login finalizado – mantém URL atual com token');
        return;
    }

// Hook para iniciar a verificação quando o site for acessado
add_action('init', 'isw_handle_token');
}