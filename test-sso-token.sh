#!/bin/bash
# Script de teste para SSO Token Exchange
# Uso: ./test-sso-token.sh "SEU_TOKEN_AQUI"

if [ -z "$1" ]; then
  echo "❌ Erro: Token não fornecido"
  echo "Uso: ./test-sso-token.sh \"SEU_TOKEN_COPIADO_DA_URL\""
  exit 1
fi

TOKEN="$1"

echo "🔐 Testando SSO Token Exchange"
echo "================================"
echo ""

# Teste 1: Exchange endpoint direto
echo "📝 Teste 1: Chamando endpoint de exchange do Hub..."
echo ""

RESPONSE=$(curl -s -X POST https://hub.vendaseguro.com.br/wp-json/isw-sso/v1/exchange \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:8080" \
  -d "{\"token\":\"$TOKEN\"}")

echo "Resposta do Hub:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Verificar se recebemos JWT
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "✅ Exchange bem-sucedido!"

  # Extrair JWT
  JWT=$(echo "$RESPONSE" | jq -r '.jwt' 2>/dev/null)

  if [ ! -z "$JWT" ] && [ "$JWT" != "null" ]; then
    echo ""
    echo "🎫 JWT recebido:"
    echo "$JWT"
    echo ""

    # Decodificar header e payload do JWT (sem validar assinatura)
    echo "📋 Payload do JWT (decodificado):"
    echo "$JWT" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq '.' || echo "Erro ao decodificar"
    echo ""

    # Teste 2: Simular callback do backend
    echo "📝 Teste 2: Simulando callback do backend Node.js..."
    echo "Chamando: http://localhost:3002/sso/callback?sso=1&token=$TOKEN"
    echo ""

    CALLBACK_RESPONSE=$(curl -s -i "http://localhost:3002/sso/callback?sso=1&token=$TOKEN&ts=$(date +%s)")

    echo "Resposta do backend:"
    echo "$CALLBACK_RESPONSE"
    echo ""

    if echo "$CALLBACK_RESPONSE" | grep -q "Location:"; then
      echo "✅ Backend processou o token e criou sessão!"
      echo "Cookie de sessão criado (vs_session)"
    else
      echo "⚠️  Backend não redirecionou. Verifique os logs do servidor."
    fi
  fi
else
  echo "❌ Exchange falhou!"
  echo "Erro: $(echo "$RESPONSE" | jq -r '.error' 2>/dev/null || echo 'Desconhecido')"
  echo ""
  echo "Possíveis causas:"
  echo "  - Token expirado (validade: 3 horas)"
  echo "  - Token inválido ou corrompido"
  echo "  - Usuário não encontrado no WordPress"
fi

echo ""
echo "================================"
echo "Teste concluído!"
