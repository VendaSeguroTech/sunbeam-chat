# Script de teste para SSO Token Exchange
# Uso: .\test-sso-token.ps1 "SEU_TOKEN_AQUI"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

Write-Host "🔐 Testando SSO Token Exchange" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor White
Write-Host ""

# Teste 1: Exchange endpoint direto
Write-Host "📝 Teste 1: Chamando endpoint de exchange do Hub..." -ForegroundColor Yellow
Write-Host ""

$body = @{
    token = $Token
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://hub.vendaseguro.com.br/wp-json/isw-sso/v1/exchange" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Origin" = "http://localhost:8080"
        } `
        -Body $body `
        -ErrorAction Stop

    Write-Host "Resposta do Hub:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host ""

    if ($response.ok -eq $true) {
        Write-Host "✅ Exchange bem-sucedido!" -ForegroundColor Green
        Write-Host ""

        $jwt = $response.jwt
        Write-Host "🎫 JWT recebido:" -ForegroundColor Cyan
        Write-Host $jwt -ForegroundColor Gray
        Write-Host ""

        # Decodificar payload do JWT
        Write-Host "📋 Payload do JWT (decodificado):" -ForegroundColor Cyan
        $parts = $jwt.Split('.')
        if ($parts.Length -eq 3) {
            $payload = $parts[1]
            # Adicionar padding se necessário
            while ($payload.Length % 4 -ne 0) {
                $payload += "="
            }
            $payload = $payload.Replace('-', '+').Replace('_', '/')
            $bytes = [System.Convert]::FromBase64String($payload)
            $decodedPayload = [System.Text.Encoding]::UTF8.GetString($bytes)
            $decodedPayload | ConvertFrom-Json | ConvertTo-Json -Depth 10
            Write-Host ""
        }

        # Teste 2: Simular callback do backend
        Write-Host "📝 Teste 2: Simulando callback do backend Node.js..." -ForegroundColor Yellow
        $timestamp = [int][double]::Parse((Get-Date -UFormat %s))
        $callbackUrl = "http://localhost:3002/sso/callback?sso=1&token=$Token&ts=$timestamp"
        Write-Host "Chamando: $callbackUrl" -ForegroundColor Gray
        Write-Host ""

        try {
            $callbackResponse = Invoke-WebRequest -Uri $callbackUrl -MaximumRedirection 0 -ErrorAction Stop

            Write-Host "✅ Backend processou o token!" -ForegroundColor Green
            Write-Host "Status: $($callbackResponse.StatusCode)" -ForegroundColor Gray

            if ($callbackResponse.Headers["Set-Cookie"]) {
                Write-Host "✅ Cookie de sessão criado (vs_session)" -ForegroundColor Green
            }

            if ($callbackResponse.Headers["Location"]) {
                Write-Host "✅ Redirecionamento: $($callbackResponse.Headers["Location"])" -ForegroundColor Green
            }
        } catch {
            # Redirect causa exception no PowerShell, mas é comportamento esperado
            if ($_.Exception.Response.StatusCode -eq 302) {
                Write-Host "✅ Backend processou o token e criou sessão!" -ForegroundColor Green
                $location = $_.Exception.Response.Headers["Location"]
                if ($location) {
                    Write-Host "✅ Redirecionando para: $location" -ForegroundColor Green
                }
                $setCookie = $_.Exception.Response.Headers["Set-Cookie"]
                if ($setCookie) {
                    Write-Host "✅ Cookie de sessão criado (vs_session)" -ForegroundColor Green
                }
            } else {
                Write-Host "⚠️  Erro ao chamar backend: $($_.Exception.Message)" -ForegroundColor Red
                Write-Host "Certifique-se que o servidor Node.js está rodando na porta 3002" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "❌ Exchange falhou!" -ForegroundColor Red
        Write-Host "Erro: $($response.error)" -ForegroundColor Red
    }

} catch {
    Write-Host "❌ Erro ao chamar endpoint:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Possíveis causas:" -ForegroundColor Yellow
    Write-Host "  - Token expirado (validade: 3 horas)" -ForegroundColor Gray
    Write-Host "  - Token inválido ou corrompido" -ForegroundColor Gray
    Write-Host "  - Usuário não encontrado no WordPress" -ForegroundColor Gray
    Write-Host "  - Chave privada não configurada no Hub" -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================" -ForegroundColor White
Write-Host "Teste concluído!" -ForegroundColor Cyan
