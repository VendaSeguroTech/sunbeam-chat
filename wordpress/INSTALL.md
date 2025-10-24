# Instalação do Plugin SSO Exchange no WordPress

## 📋 Pré-requisitos

- WordPress 5.8+
- PHP 7.4+
- Acesso SSH ou FTP ao servidor
- Permissões para criar pastas e arquivos

## 🚀 Instalação

### Método 1: Via SSH (Recomendado)

```bash
# 1. Conectar ao servidor
ssh user@hub.vendaseguro.com.br

# 2. Navegar para pasta de plugins
cd /var/www/html/wp-content/plugins/

# 3. Criar pasta do plugin
mkdir isw-sso-exchange
cd isw-sso-exchange

# 4. Copiar arquivo do plugin
# (fazer upload do arquivo isw-sso-exchange-endpoint.php)

# 5. Definir permissões
chmod 644 isw-sso-exchange-endpoint.php

# 6. Criar pasta para chaves
cd /var/www/html/wp-content/
mkdir keys
chmod 700 keys

# 7. Copiar chave privada
cp /caminho/local/isw-sso-private.pem keys/
chmod 600 keys/isw-sso-private.pem

# 8. Verificar ownership
chown -R www-data:www-data keys/
```

### Método 2: Via FTP

1. **Fazer upload do plugin:**
   - Conectar via FTP: `ftp://hub.vendaseguro.com.br`
   - Navegar para: `/wp-content/plugins/`
   - Criar pasta: `isw-sso-exchange/`
   - Upload: `isw-sso-exchange-endpoint.php`

2. **Criar pasta de chaves:**
   - Navegar para: `/wp-content/`
   - Criar pasta: `keys/`
   - Definir permissões: `700` (via FileZilla ou painel)

3. **Upload da chave privada:**
   - Upload para: `/wp-content/keys/isw-sso-private.pem`
   - Definir permissões: `600`

### Método 3: Via cPanel / Painel de Controle

1. **File Manager:**
   - Abrir File Manager
   - Navegar para `public_html/wp-content/plugins/`
   - Criar pasta `isw-sso-exchange`
   - Upload `isw-sso-exchange-endpoint.php`

2. **Chaves:**
   - Navegar para `public_html/wp-content/`
   - Criar pasta `keys`
   - Upload `isw-sso-private.pem`
   - Alterar permissões (botão direito → Permissions):
     - `keys/`: 700 (Owner: rwx, Group: ---, Others: ---)
     - `isw-sso-private.pem`: 600 (Owner: rw-, Group: ---, Others: ---)

## ✅ Ativar Plugin

1. Acessar: `https://hub.vendaseguro.com.br/wp-admin/`
2. Login com credenciais de administrador
3. Menu: **Plugins** → **Installed Plugins**
4. Localizar: **ISW SSO Exchange Endpoint**
5. Clicar: **Activate**

## 🧪 Testar Instalação

### Teste 1: Verificar Endpoint

```bash
curl https://hub.vendaseguro.com.br/wp-json/isw-sso/v1/exchange
```

**Resposta esperada** (erro pois não enviou token):
```json
{
  "ok": false,
  "error": "missing_token"
}
```

✅ Se receber esta resposta, o endpoint está ativo!

### Teste 2: Testar com Token Real

1. Fazer login no Hub
2. Obter token de um card SSO existente (inspecionar URL)
3. Testar exchange:

```bash
TOKEN="<TOKEN_DO_HUB>"

curl -X POST https://hub.vendaseguro.com.br/wp-json/isw-sso/v1/exchange \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}"
```

**Resposta esperada** (sucesso):
```json
{
  "ok": true,
  "jwt": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 🔐 Configuração Alternativa (via wp-config.php)

Se não quiser criar pasta `keys/`, pode definir a chave via `wp-config.php`:

```php
// Adicionar no final de wp-config.php (antes de "/* That's all, stop editing! */")

// Chave privada para SSO Exchange
define('ISW_SSO_PRIVATE_KEY', <<<'EOD'
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(copiar conteúdo completo de isw-sso-private.pem)
...
-----END PRIVATE KEY-----
EOD
);
```

**⚠️ Atenção**: Proteja o wp-config.php! Nunca compartilhe ou commit.

## 📊 Verificar Logs

### Via WP Debug

Habilitar logs no `wp-config.php`:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

Ver logs:
```bash
tail -f /var/www/html/wp-content/debug.log
```

### Via Error Log do PHP

```bash
tail -f /var/log/php/error.log
```

Procurar por: `[ISW SSO]`

## 🔧 Troubleshooting

### Erro: "Private key not found"

**Causa**: Chave privada não está no local correto

**Solução**:
1. Verificar se existe: `ls -la /var/www/html/wp-content/keys/isw-sso-private.pem`
2. Verificar permissões: `chmod 600 wp-content/keys/isw-sso-private.pem`
3. Verificar ownership: `chown www-data:www-data wp-content/keys/isw-sso-private.pem`

### Erro: "Invalid private key"

**Causa**: Chave privada corrompida ou formato incorreto

**Solução**:
1. Regenerar par de chaves: `bash generate-rsa-keys.sh`
2. Fazer upload da nova chave privada
3. Atualizar chave pública na IA

### Erro: "Token not found in database"

**Causa**: Token não está na tabela `ISW_sso` ou expirou

**Solução**:
1. Verificar tabela: `SELECT * FROM wp_isw_sso WHERE isw_token = '...'`
2. Confirmar que token tem menos de 3 horas
3. Gerar novo token via Hub

### Endpoint retorna 404

**Causa**: Plugin não ativado ou permalinks não atualizados

**Solução**:
1. Ativar plugin no WP Admin
2. Atualizar permalinks: Settings → Permalinks → Save Changes
3. Verificar rewrite rules: `wp rewrite flush` (via WP-CLI)

### CORS Error

**Causa**: Domínio da IA não está em `allowed_origins`

**Solução**:
Editar `isw-sso-exchange-endpoint.php` e adicionar domínio:

```php
$allowed_origins = array(
    'https://ia.vendaseguro.com.br',
    'http://localhost:8080',
    'https://SEU_NOVO_DOMINIO.com',  // ← Adicionar aqui
);
```

## 📋 Checklist Pós-Instalação

- [ ] Plugin uploadado para `wp-content/plugins/isw-sso-exchange/`
- [ ] Chave privada copiada para `wp-content/keys/isw-sso-private.pem`
- [ ] Permissões corretas (700 para pasta, 600 para arquivo)
- [ ] Plugin ativado no WP Admin
- [ ] Endpoint acessível (testado com curl)
- [ ] Exchange funcionando com token real
- [ ] Logs não mostram erros
- [ ] CORS configurado para domínios corretos
- [ ] Chave pública copiada para a IA

## 🔄 Atualização do Plugin

Para atualizar o plugin:

1. **Backup** do arquivo atual
2. **Desativar** plugin no WP Admin
3. **Substituir** arquivo por nova versão
4. **Reativar** plugin
5. **Testar** endpoint

## 🗑️ Desinstalação

Para remover completamente:

```bash
# 1. Desativar plugin no WP Admin

# 2. Remover arquivos
rm -rf /var/www/html/wp-content/plugins/isw-sso-exchange/
rm /var/www/html/wp-content/keys/isw-sso-private.pem

# 3. (Opcional) Remover pasta de chaves se não houver outros arquivos
rmdir /var/www/html/wp-content/keys/
```

## 📞 Suporte

Em caso de problemas:

1. Verificar logs do PHP e WordPress
2. Testar endpoint com curl
3. Verificar permissões de arquivos
4. Consultar documentação: `SSO_TOKEN_EXCHANGE.md`

---

**Instalação concluída!** Prossiga para configurar o backend da IA.
