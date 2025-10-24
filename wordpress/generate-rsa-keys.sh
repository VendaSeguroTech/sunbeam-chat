#!/bin/bash
##
## Script para gerar par de chaves RSA para SSO JWT
##
## Uso:
##   bash generate-rsa-keys.sh
##
## Irá criar:
##   - isw-sso-private.pem (chave privada - manter no Hub WordPress)
##   - isw-sso-public.pem (chave pública - copiar para a IA)
##

echo "🔐 Gerando par de chaves RSA 2048-bit para SSO..."
echo ""

# Gerar chave privada
openssl genrsa -out isw-sso-private.pem 2048

if [ $? -ne 0 ]; then
    echo "❌ Erro ao gerar chave privada"
    exit 1
fi

echo "✅ Chave privada gerada: isw-sso-private.pem"

# Extrair chave pública
openssl rsa -in isw-sso-private.pem -pubout -out isw-sso-public.pem

if [ $? -ne 0 ]; then
    echo "❌ Erro ao extrair chave pública"
    exit 1
fi

echo "✅ Chave pública gerada: isw-sso-public.pem"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1️⃣  No Hub WordPress:"
echo "   - Criar pasta: wp-content/keys/"
echo "   - Copiar isw-sso-private.pem para wp-content/keys/"
echo "   - Permissões: chmod 600 wp-content/keys/isw-sso-private.pem"
echo "   - OU adicionar no wp-config.php:"
echo "     define('ISW_SSO_PRIVATE_KEY', file_get_contents(__DIR__ . '/keys/isw-sso-private.pem'));"
echo ""
echo "2️⃣  Na IA (Node.js):"
echo "   - Copiar isw-sso-public.pem para api/keys/"
echo "   - Adicionar no .env:"
echo "     HUB_JWT_PUBLIC_KEY_PATH=./keys/isw-sso-public.pem"
echo ""
echo "3️⃣  Segurança:"
echo "   - ⚠️  NUNCA commitar isw-sso-private.pem no git"
echo "   - ⚠️  Adicionar *.pem no .gitignore"
echo "   - ✅  Chave pública pode ser compartilhada"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Visualizar chave pública:"
cat isw-sso-public.pem
echo ""
