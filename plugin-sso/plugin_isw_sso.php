<?php
/*
Plugin Name: ISW SSO Plugin
Author: Integra_SW
Description: Plugin de SSO para autenticação e geração de tokens (com proteção de sessão, anti-cache e injeção antecipada de tokens + renovação automática).
*/

// -----------------------------------------------------------------------------
// 0) Sessão e cabeçalhos anti-cache
// -----------------------------------------------------------------------------

add_action('plugins_loaded', function () {
    if (session_status() === PHP_SESSION_NONE) {
        @ini_set('session.cookie_samesite', 'Lax');
        @ini_set('session.cookie_secure', '1'); // mantenha 1 se o site for 100% HTTPS
        session_start();
    }
}, 0);

add_action('send_headers', function () {
    if (is_user_logged_in()) {
        nocache_headers();
        header('Pragma: no-cache');
        header('X-ISW-NoCache: 1');
    }
}, 0);

// -----------------------------------------------------------------------------
// 1) Geração e persistência do token no login (com prioridade para nickname)
// -----------------------------------------------------------------------------

function isw_user_login($user_login, $user)
{
    global $wpdb;
    date_default_timezone_set('America/Sao_Paulo');

    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $_SESSION = [];

    $user_id    = $user->ID;
    $user_mail  = $user->user_email;
    $user_login = $user->user_login;

    $nickname = get_user_meta($user_id, 'nickname', true) ?: ($user->nickname ?? '');

    $norm = function ($v) {
        return mb_strtolower(trim((string)$v));
    };
    $user_mail  = $norm($user_mail);
    $user_login = $norm($user_login);
    $nickname   = $norm($nickname);

    $id_base = $nickname ?: $user_mail;

    $isw_token = md5(uniqid(mt_rand(), true));

    $expires_time = date('Y-m-d H:i:s', strtotime('+3 hours'));
    $update_time  = date('Y-m-d H:i:s');

    $table_name = 'ISW_sso';

    $existing_record = $wpdb->get_row(
        $wpdb->prepare("SELECT * FROM $table_name WHERE user_email = %s LIMIT 1", $id_base)
    );

    if ($existing_record) {
        $wpdb->update(
            $table_name,
            [
                'token'        => $isw_token,
                'expires_time' => $expires_time,
                'update_time'  => $update_time
            ],
            ['user_email' => $id_base]
        );
    } else {
        $wpdb->insert(
            $table_name,
            [
                'user_id'      => $user_id,
                'user_email'   => $id_base,
                'token'        => $isw_token,
                'expires_time' => $expires_time,
                'update_time'  => $update_time
            ]
        );
    }

    $_SESSION['token'] = isw_encrypt($isw_token . '|' . $user_id . '|' . $id_base, 'isw_venda_seguro');

    if (defined('WP_DEBUG') && WP_DEBUG) {
        file_put_contents("isw_log__token.log", $_SESSION['token']);
    }
}
add_action('wp_login', 'isw_user_login', 10, 2);

// -----------------------------------------------------------------------------
// 2) Criptografia simétrica e validação de token (mantidos do original)
// -----------------------------------------------------------------------------

function isw_encrypt($data, $key)
{
    date_default_timezone_set('America/Sao_Paulo');

    $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length('AES-256-CBC'));
    $encrypted = openssl_encrypt($data, 'AES-256-CBC', $key, 0, $iv);
    $encrypted_data = $encrypted . ';' . $iv;

    $base64_encoded = base64_encode($encrypted_data);
    $safe_base64 = str_replace(['+', '/'], ['-', '_'], $base64_encoded);

    return $safe_base64;
}

function isw_decrypt($data, $key)
{
    date_default_timezone_set('America/Sao_Paulo');

    $safe_data = str_replace(['-', '_'], ['+', '/'], $data);
    $decoded_data = base64_decode($safe_data);

    list($encrypted_data, $iv) = explode(';', $decoded_data, 2);

    return openssl_decrypt($encrypted_data, 'AES-256-CBC', $key, 0, $iv);
}

function isw_validate_token($encrypted_token)
{
    global $wpdb;

    date_default_timezone_set('America/Sao_Paulo');

    $decrypted_token = isw_decrypt($encrypted_token, 'isw_venda_seguro');
    list($isw_token, $user_id, $user_mail) = explode('|', $decrypted_token);

    $user = get_userdata((int)$user_id);
    $email    = $user ? ($user->user_email ?? '') : '';
    $login    = $user ? ($user->user_login ?? '') : '';
    $nickname = $user ? (get_user_meta($user->ID, 'nickname', true) ?: ($user->nickname ?? '')) : '';

    $table_name = 'ISW_sso';

    $ids = array_values(array_filter([$email, $login, $nickname, $user_mail]));
    if (empty($ids)) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            file_put_contents(ABSPATH . 'wp-content/isw_token_debug.log', "[isw_validate_token] SEM_IDS | token=$isw_token | user=$user_id\n", FILE_APPEND);
        }
        return 'negado';
    }

    $placeholders = implode(',', array_fill(0, count($ids), '%s'));
    $sql = "SELECT * FROM $table_name WHERE token = %s AND user_email IN ($placeholders)";
    $params = array_merge([$isw_token], $ids);
    $record = $wpdb->get_row($wpdb->prepare($sql, $params));

    if ($record) {
        $current_time = date('Y-m-d H:i:s');
        if ($current_time > $record->expires_time) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                file_put_contents(ABSPATH . 'wp-content/isw_token_debug.log', "[isw_validate_token] EXPIRADO | token=$isw_token | user=$user_id | ids=" . implode('|', $ids) . PHP_EOL, FILE_APPEND);
            }
            return 'negado';
        } else {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                file_put_contents(ABSPATH . 'wp-content/isw_token_debug.log', "[isw_validate_token] LIBERADO | token=$isw_token | user=$user_id | match={$record->user_email}" . PHP_EOL, FILE_APPEND);
            }
            return 'liberado';
        }
    }

    if (defined('WP_DEBUG') && WP_DEBUG) {
        file_put_contents(ABSPATH . 'wp-content/isw_token_debug.log', "[isw_validate_token] NAO_ENCONTRADO | token=$isw_token | user=$user_id | ids=" . implode('|', $ids) . PHP_EOL, FILE_APPEND);
    }
    return 'negado';
}

function isw_norm($v){ return mb_strtolower(trim((string)$v)); }

function isw_compute_id_base($user){
    if (!$user) return '';
    $nickname = get_user_meta($user->ID, 'nickname', true) ?: ($user->nickname ?? '');
    $nickname = isw_norm($nickname);
    $email    = isw_norm($user->user_email ?? '');
    return $nickname ?: $email;
}

function isw_refresh_token_for_user($user){
    global $wpdb;

    if (session_status() === PHP_SESSION_NONE) session_start();
    date_default_timezone_set('America/Sao_Paulo');

    $user_id = (int)$user->ID;
    $id_base = isw_compute_id_base($user);
    if (empty($id_base)) return false;

    $table_name   = 'ISW_sso';
    $isw_token    = md5(uniqid(mt_rand(), true));
    $expires_time = date('Y-m-d H:i:s', strtotime('+3 hours'));
    $update_time  = date('Y-m-d H:i:s');

    $existing = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE user_email = %s LIMIT 1", $id_base));
    if ($existing) {
        $wpdb->update(
            $table_name,
            ['token' => $isw_token, 'expires_time' => $expires_time, 'update_time' => $update_time],
            ['user_email' => $id_base]
        );
    } else {
        $wpdb->insert(
            $table_name,
            [
                'user_id'      => $user_id,
                'user_email'   => $id_base,
                'token'        => $isw_token,
                'expires_time' => $expires_time,
                'update_time'  => $update_time
            ]
        );
    }

    $_SESSION['token'] = isw_encrypt($isw_token . '|' . $user_id . '|' . $id_base, 'isw_venda_seguro');

    if (defined('WP_DEBUG') && WP_DEBUG) {
        file_put_contents(ABSPATH . 'wp-content/isw_token_debug.log', "[isw_refresh_token_for_user] REFRESH | user=$user_id | id_base=$id_base\n", FILE_APPEND);
    }

    return true;
}

/* ====================== ADIÇÃO: Helpers de TTL e refresh proativo ====================== */

/**
 * Retorna a linha do token atual e o TTL em segundos. Se não achar, [null, -1].
 */
function isw_get_current_token_record_and_ttl() {
    global $wpdb;

    if (session_status() === PHP_SESSION_NONE) session_start();
    if (empty($_SESSION['token'])) return [null, -1];

    date_default_timezone_set('America/Sao_Paulo');

    $dec = isw_decrypt($_SESSION['token'], 'isw_venda_seguro');
    if (!$dec) return [null, -1];

    list($isw_token, $user_id, $id_base) = array_pad(explode('|', $dec), 3, '');

    $ids = [];
    $user = get_userdata((int)$user_id);
    if ($user) {
        $email    = isw_norm($user->user_email ?? '');
        $login    = isw_norm($user->user_login ?? '');
        $nickname = isw_norm(get_user_meta($user->ID, 'nickname', true) ?: ($user->nickname ?? ''));
        $ids = array_values(array_filter([$email, $login, $nickname, isw_norm($id_base)]));
    } else {
        $ids = array_values(array_filter([isw_norm($id_base)]));
    }
    if (!$isw_token || empty($ids)) return [null, -1];

    $table = 'ISW_sso';
    $placeholders = implode(',', array_fill(0, count($ids), '%s'));
    $sql = "SELECT * FROM $table WHERE token = %s AND user_email IN ($placeholders) LIMIT 1";
    $params = array_merge([$isw_token], $ids);
    $row = $wpdb->get_row($wpdb->prepare($sql, $params));
    if (!$row) return [null, -1];

    $now = new DateTime('now', new DateTimeZone('America/Sao_Paulo'));
    $exp = DateTime::createFromFormat('Y-m-d H:i:s', $row->expires_time, new DateTimeZone('America/Sao_Paulo'));
    if (!$exp) return [$row, -1];

    $ttl = $exp->getTimestamp() - $now->getTimestamp();
    return [$row, $ttl];
}

/**
 * Renova se TTL <= $threshold_seconds. Retorna ['refreshed'=>bool,'ttl'=>int].
 * Inclui lock curto por transient para evitar múltiplos refresh em várias abas.
 */
function isw_maybe_refresh_session_token($threshold_seconds = 2700) { // 45 min
    static $did_once = false;
    if ($did_once) {
        list($_row, $ttl) = isw_get_current_token_record_and_ttl();
        return ['refreshed' => false, 'ttl' => $ttl];
    }

    $lock_key = 'isw_refresh_lock_' . get_current_user_id();
    if (get_transient($lock_key)) {
        list($_row, $ttl) = isw_get_current_token_record_and_ttl();
        return ['refreshed' => false, 'ttl' => $ttl];
    }

    list($row, $ttl) = isw_get_current_token_record_and_ttl();
    if ($ttl < 0) return ['refreshed' => false, 'ttl' => -1];

    if ($ttl <= $threshold_seconds) {
        set_transient($lock_key, 1, 10);
        $user = wp_get_current_user();
        if ($user && $user->ID) {
            $ok = isw_refresh_token_for_user($user);
            delete_transient($lock_key);
            $did_once = true;

            list($_row2, $ttl2) = isw_get_current_token_record_and_ttl();
            return ['refreshed' => (bool)$ok, 'ttl' => $ttl2];
        }
    }

    $did_once = true;
    return ['refreshed' => false, 'ttl' => $ttl];
}

// -----------------------------------------------------------------------------
// 3) Injeção de tokens no front (head) com proteção de clique e parâmetro ts
// -----------------------------------------------------------------------------

function isw_current_session_payload() {
    if (session_status() === PHP_SESSION_NONE) session_start();
    return isset($_SESSION['token']) ? $_SESSION['token'] : '';
}

function isw_enqueue_script()
{
    header('Expires: Sat, 26 Jul 1997 05:00:00 GMT');
    header('Last-Modified: ' . gmdate('D, d M Y H:i:s') . ' GMT');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');

    date_default_timezone_set('America/Sao_Paulo');
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (!is_user_logged_in()) return;

    $current_user_id = get_current_user_id();
    $user_info  = get_userdata($current_user_id);
    $user_email = '';
    $user_login = '';
    $nickname   = '';

    if ($user_info) {
        $user_email = $user_info->user_email ?? '';
        $user_login = $user_info->user_login ?? '';
        $nickname   = get_user_meta($user_info->ID, 'nickname', true) ?: ($user_info->nickname ?? '');
    }

    $norm = function($v){ return mb_strtolower(trim((string)$v)); };
    $user_email = $norm($user_email);
    $user_login = $norm($user_login);
    $nickname   = $norm($nickname);

    // === MEMBERKIT (como já estava) ===
    $token_member_kit_1 = '';
    $token_member_kit_2 = '';
    $token_member_kit_3 = '';
    $token_member_kit_4 = '';

    $response1 = wp_remote_post('https://memberkit.com.br/api/v1/tokens?api_key=6DqJWAhZCQ7MnHGYJzUfxbd3', ['body' => ['email' => $user_email]]);
    if (!is_wp_error($response1)) {
        $body = json_decode(wp_remote_retrieve_body($response1));
        if (isset($body->token)) $token_member_kit_1 = $body->token;
    }
    if (empty($token_member_kit_1) && !empty($user_login)) {
        $response1b = wp_remote_post('https://memberkit.com.br/api/v1/tokens?api_key=6DqJWAhZCQ7MnHGYJzUfxbd3', ['body' => ['email' => $user_login]]);
        if (!is_wp_error($response1b)) {
            $body = json_decode(wp_remote_retrieve_body($response1b));
            if (isset($body->token)) $token_member_kit_1 = $body->token;
        }
    }
    if (empty($token_member_kit_1) && !empty($nickname)) {
        $response1c = wp_remote_post('https://memberkit.com.br/api/v1/tokens?api_key=6DqJWAhZCQ7MnHGYJzUfxbd3', ['body' => ['email' => $nickname]]);
        if (!is_wp_error($response1c)) {
            $body = json_decode(wp_remote_retrieve_body($response1c));
            if (isset($body->token)) $token_member_kit_1 = $body->token;
        }
    }

    $memberkit_get_token_if_enrolled = function ($course_id) use ($user_email, $user_login, $nickname) {
        $token = '';
        $check_url = 'https://memberkit.com.br/api/v1/users/' . urlencode($user_email) . '?api_key=Ag3AmmphvbeAhBP5rVuApZX9';
        $check_response = @file_get_contents($check_url);
        if ($check_response) {
            $user_data = json_decode($check_response, true);
            if (isset($user_data['enrollments'])) {
                foreach ($user_data['enrollments'] as $enrollment) {
                    if ((int)$enrollment['course_id'] === (int)$course_id && $enrollment['status'] === 'active') {
                        $curl = curl_init();
                        curl_setopt_array($curl, [
                            CURLOPT_URL => 'https://memberkit.com.br/api/v1/tokens?api_key=Ag3AmmphvbeAhBP5rVuApZX9',
                            CURLOPT_RETURNTRANSFER => true,
                            CURLOPT_CUSTOMREQUEST => 'POST',
                            CURLOPT_POSTFIELDS => ['email' => $user_email],
                        ]);
                        $resp = curl_exec($curl); curl_close($curl);
                        $tok = json_decode($resp);
                        if (isset($tok->token)) { $token = $tok->token; break; }

                        if (!empty($user_login)) {
                            $curl = curl_init();
                            curl_setopt_array($curl, [
                                CURLOPT_URL => 'https://memberkit.com.br/api/v1/tokens?api_key=Ag3AmmphvbeAhBP5rVuApZX9',
                                CURLOPT_RETURNTRANSFER => true,
                                CURLOPT_CUSTOMREQUEST => 'POST',
                                CURLOPT_POSTFIELDS => ['email' => $user_login],
                            ]);
                            $resp = curl_exec($curl); curl_close($curl);
                            $tok = json_decode($resp);
                            if (isset($tok->token)) { $token = $tok->token; break; }
                        }

                        if (!empty($nickname)) {
                            $curl = curl_init();
                            curl_setopt_array($curl, [
                                CURLOPT_URL => 'https://memberkit.com.br/api/v1/tokens?api_key=Ag3AmmphvbeAhBP5rVuApZX9',
                                CURLOPT_RETURNTRANSFER => true,
                                CURLOPT_CUSTOMREQUEST => 'POST',
                                CURLOPT_POSTFIELDS => ['email' => $nickname],
                            ]);
                            $resp = curl_exec($curl); curl_close($curl);
                            $tok = json_decode($resp);
                            if (isset($tok->token)) { $token = $tok->token; break; }
                        }

                        break;
                    }
                }
            }
        }
        return $token;
    };
    $token_member_kit_2 = $memberkit_get_token_if_enrolled(221808);
    $token_member_kit_3 = $memberkit_get_token_if_enrolled(221809);
    $token_member_kit_4 = $memberkit_get_token_if_enrolled(254089);

    $payloadSessao = isw_current_session_payload();

    ?>
    <script>
    (function(){
        var TOKENS = {
            melhor_produto: <?php echo json_encode($payloadSessao); ?>,
            pontos:         <?php echo json_encode($payloadSessao); ?>,
            portal_de_conteudo: <?php echo json_encode($token_member_kit_1); ?>,
            dossie:             <?php echo json_encode($token_member_kit_2); ?>,
            estaquevende:       <?php echo json_encode($token_member_kit_3); ?>,
            instaquevende:      <?php echo json_encode($token_member_kit_3); ?>,
            marco:              <?php echo json_encode($token_member_kit_4); ?>
        };

        var SELECTORS = [
            'melhor_produto',
            'pontos',
            'portal_de_conteudo',
            'dossie',
            'instaquevende',
            'marco'
        ];

        function nowTs() { return Math.floor(Date.now() / 1000); }

        function rewriteLink(a, tok) {
            if (!a || !tok) return false;
            try {
                var href = a.getAttribute('href');
                if (!href) return false;
                var u = new URL(href, location.origin);
                var prevToken = u.searchParams.get('token');
                var prevTs = u.searchParams.get('ts');

                u.searchParams.set('token', tok);
                u.searchParams.set('ts', String(nowTs()));
                var newHref = u.toString();

                if (newHref !== href) {
                    a.setAttribute('href', newHref);
                    a.dataset.iswApplied = '1';
                    a.dataset.iswTokenLen = String(tok.length);
                    return true;
                }
            } catch (e) {}
            return false;
        }

        function hydrateAll() {
            var total = 0;
            for (var i=0; i<SELECTORS.length; i++) {
                var key = SELECTORS[i];
                var tok = TOKENS[key];
                if (!tok) continue;
                var list = document.querySelectorAll('a[isw_action_link="'+key+'"]');
                for (var j=0; j<list.length; j++) {
                    if (rewriteLink(list[j], tok)) total++;
                }
            }
            return total;
        }

        var hydrated = false;
        function clickBlocker(e) {
            if (!hydrated) {
                var a = e.target.closest && e.target.closest('a[isw_action_link]');
                if (a) { e.preventDefault(); e.stopPropagation(); }
            }
        }
        document.addEventListener('click', clickBlocker, true);

        function firstHydrate() {
            hydrateAll();
            hydrated = true;
            document.removeEventListener('click', clickBlocker, true);
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', firstHydrate);
        } else {
            firstHydrate();
        }

        document.addEventListener('mouseover', function(e){
            var a = e.target.closest && e.target.closest('a[isw_action_link]');
            if (!a) return;
            var key = a.getAttribute('isw_action_link');
            var tok = TOKENS[key];
            if (tok) rewriteLink(a, tok);
        }, true);
        document.addEventListener('focusin', function(e){
            var a = e.target.closest && e.target.closest('a[isw_action_link]');
            if (!a) return;
            var key = a.getAttribute('isw_action_link');
            var tok = TOKENS[key];
            if (tok) rewriteLink(a, tok);
        }, true);

        var mo = new MutationObserver(function(muts){
            for (var m=0; m<muts.length; m++) {
                var nodes = muts[m].addedNodes || [];
                for (var n=0; n<nodes.length; n++) {
                    var node = nodes[n];
                    if (node.nodeType !== 1) continue;
                    if (node.matches && node.matches('a[isw_action_link]')) {
                        var key = node.getAttribute('isw_action_link');
                        var tok = TOKENS[key];
                        if (tok) rewriteLink(node, tok);
                    }
                    var list = node.querySelectorAll ? node.querySelectorAll('a[isw_action_link]') : [];
                    for (var i=0; i<list.length; i++) {
                        var a = list[i];
                        var k = a.getAttribute('isw_action_link');
                        var t = TOKENS[k];
                        if (t) rewriteLink(a, t);
                    }
                }
            }
        });
        mo.observe(document.documentElement, {subtree:true, childList:true});

        document.addEventListener('visibilitychange', function(){
            if (document.visibilityState === 'visible') hydrateAll();
        });

        document.addEventListener('click', function(e){
            var a = e.target.closest && e.target.closest('a[isw_action_link]');
            if (!a) return;

            var key = a.getAttribute('isw_action_link');
            var tok = TOKENS[key];
            if (!tok) return;

            e.preventDefault(); e.stopPropagation();
            setTimeout(function(){
                rewriteLink(a, tok);
                var target = a.getAttribute('target');
                if (e.metaKey || e.ctrlKey || target === '_blank') {
                    window.open(a.href, '_blank');
                } else {
                    location.href = a.href;
                }
            }, 1);
        }, true);
    })();
    </script>

    <!-- ================== ADIÇÃO: Keep-alive no front ================== -->
    <script>
    (function(){
      // Garante ajaxurl no front
      if (typeof window.ajaxurl === 'undefined') {
        window.ajaxurl = <?php echo json_encode(admin_url('admin-ajax.php')); ?>;
      }

      var BASE_INTERVAL = 15 * 60 * 1000;

      function schedule(ms){ setTimeout(pingKeepAlive, ms); }

      function pingKeepAlive() {
        if (document.hidden) { schedule(BASE_INTERVAL); return; }
        fetch(window.ajaxurl + '?action=isw_keepalive', { credentials: 'same-origin' })
          .then(function(r){ return r.json(); })
          .then(function(data){
            try {
              var ttl = (data && data.data && typeof data.data.ttl === 'number') ? data.data.ttl : -1;
              if (ttl > 0 && ttl < 30*60) { schedule(5 * 60 * 1000); return; }
            } catch(e){}
            schedule(BASE_INTERVAL);
          })
          .catch(function(){ schedule(BASE_INTERVAL); });
      }

      schedule(3 * 60 * 1000);
      document.addEventListener('visibilitychange', function(){
        if (document.visibilityState === 'visible') pingKeepAlive();
      });
    })();
    </script>
    <?php
}
add_action('wp_head', 'isw_enqueue_script', 0);

// -----------------------------------------------------------------------------
// 4) Redirect com ?redirect_portal anexando token + ts (antistale)
// -----------------------------------------------------------------------------

add_filter('login_redirect', function ($redirect_to, $request, $user) {
    if (isset($_GET['redirect_portal'])) {
        $user_email = $user->user_email;

        $curl = curl_init();
        curl_setopt_array($curl, array(
            CURLOPT_URL => 'https://memberkit.com.br/api/v1/tokens?api_key=6DqJWAhZCQ7MnHGYJzUfxbd3',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => array('email' => $user_email),
        ));
        $response = curl_exec($curl);
        curl_close($curl);

        $token_m1 = json_decode($response);
        if (isset($token_m1->token)) {
            $token = $token_m1->token;
            $base_url = esc_url_raw($_GET['redirect_portal']);
            $sep = (parse_url($base_url, PHP_URL_QUERY)) ? '&' : '?';
            $ts  = time();
            return $base_url . $sep . 'token=' . urlencode($token) . '&ts=' . $ts;
        }
    }

    return $redirect_to;
}, 10, 3);

/* ====================== BLOCO ORIGINAL DE VALIDAÇÃO NA PAGEVIEW ====================== */

add_action('init', function () {
    if (!is_user_logged_in()) return;
    
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (empty($_SESSION['token'])) return;
    
    $status = isw_validate_token($_SESSION['token']);
    
    if ($status === 'negado') {
        if (function_exists('rocket_clean_user')) {
            $user_id = get_current_user_id();
            rocket_clean_user($user_id);
        }
        unset($_SESSION['token']);
    }
}, 1);

/* ====================== ADIÇÃO: Refresh proativo após a validação ====================== */

add_action('init', function () {
    if (!is_user_logged_in()) return;
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (empty($_SESSION['token'])) return;

    // Se estiver válido, mantém jovem: renova quando faltarem <= 45 min
    isw_maybe_refresh_session_token(45 * 60);
}, 2);

/* ====================== ADIÇÃO: Endpoint AJAX keep-alive ====================== */

add_action('wp_ajax_isw_keepalive', function () {
    if (!is_user_logged_in()) {
        wp_send_json_error(['message' => 'not_logged']);
    }
    if (session_status() === PHP_SESSION_NONE) session_start();

    $res = isw_maybe_refresh_session_token(45 * 60);
    wp_send_json_success(['refreshed' => $res['refreshed'], 'ttl' => $res['ttl']]);
});

// -----------------------------------------------------------------------------
// 5) Limpeza de cache do usuário no login (mantido)
// -----------------------------------------------------------------------------

add_action('wp_login', function($user_login, $user) {
    if (function_exists('rocket_clean_user')) {
        rocket_clean_user($user->ID);
    }
}, 10, 2);
