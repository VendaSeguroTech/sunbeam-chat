# Script PowerShell para gerar par de chaves RSA para SSO JWT
#
# Uso:
#   .\generate-rsa-keys.ps1
#
# Requer OpenSSL instalado (Git Bash ou OpenSSL standalone)
#

Write-Host "🔐 Gerando par de chaves RSA 2048-bit para SSO..." -ForegroundColor Cyan
Write-Host ""

# Verificar se OpenSSL está disponível
$opensslPath = Get-Command openssl -ErrorAction SilentlyContinue

if (-not $opensslPath) {
    Write-Host "❌ OpenSSL não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale OpenSSL:" -ForegroundColor Yellow
    Write-Host "  - Git for Windows (vem com OpenSSL)" -ForegroundColor Yellow
    Write-Host "  - Ou baixe em: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Gerar chave privada
Write-Host "Gerando chave privada..." -ForegroundColor Yellow
& openssl genrsa -out isw-sso-private.pem 2048

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao gerar chave privada" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Chave privada gerada: isw-sso-private.pem" -ForegroundColor Green

# Extrair chave pública
Write-Host "Extraindo chave pública..." -ForegroundColor Yellow
& openssl rsa -in isw-sso-private.pem -pubout -out isw-sso-public.pem

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao extrair chave pública" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Chave pública gerada: isw-sso-public.pem" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  No Hub WordPress:" -ForegroundColor Yellow
Write-Host "   - Criar pasta: wp-content/keys/" -ForegroundColor White
Write-Host "   - Copiar isw-sso-private.pem para wp-content/keys/" -ForegroundColor White
Write-Host "   - OU adicionar no wp-config.php:" -ForegroundColor White
Write-Host '     define("ISW_SSO_PRIVATE_KEY", file_get_contents(__DIR__ . "/keys/isw-sso-private.pem"));' -ForegroundColor Gray
Write-Host ""
Write-Host "2️⃣  Na IA (Node.js):" -ForegroundColor Yellow
Write-Host "   - Copiar isw-sso-public.pem para api/keys/" -ForegroundColor White
Write-Host "   - Adicionar no .env:" -ForegroundColor White
Write-Host "     HUB_JWT_PUBLIC_KEY_PATH=./keys/isw-sso-public.pem" -ForegroundColor Gray
Write-Host ""
Write-Host "3️⃣  Segurança:" -ForegroundColor Yellow
Write-Host "   - ⚠️  NUNCA commitar isw-sso-private.pem no git" -ForegroundColor Red
Write-Host "   - ⚠️  Adicionar *.pem no .gitignore" -ForegroundColor Red
Write-Host "   - ✅  Chave pública pode ser compartilhada" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Chave pública gerada:" -ForegroundColor Cyan
Get-Content isw-sso-public.pem
Write-Host ""
