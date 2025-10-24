# Teste detalhado do token SSO
# Uso: .\test-token-detalhado.ps1

param(
    [Parameter(Mandatory=$false)]
    [string]$Token = "ZTZlOU9mamdqVlA5RG9rcjlRVXR2TmZtZlFCcDcyeXF6Z3Q5anN3cDlqZWZoZERPVWFsaVMyVXRPbDhpU1dubjdtaUJnUG1wNk5OZlFwQnhnZzBoUUE9PTtytKtj97V3iEjrwSTKTis7"
)

Write-Host "🔐 Teste Detalhado SSO Token Exchange" -ForegroundColor Cyan
Write-Host "Token: $($Token.Substring(0, 50))..." -ForegroundColor Gray
Write-Host ""

$body = @{ token = $Token } | ConvertTo-Json

Write-Host "📤 Enviando requisição para Hub..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "https://hub.vendaseguro.com.br/wp-json/isw-sso/v1/exchange" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Origin" = "http://localhost:8080"
        } `
        -Body $body `
        -ErrorAction Stop

    Write-Host "✅ Sucesso! Exchange funcionou!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Resposta completa:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    Write-Host ""

    if ($response.ok -eq $true -and $response.jwt) {
        Write-Host "🎫 JWT recebido:" -ForegroundColor Green
        Write-Host $response.jwt -ForegroundColor Gray
        Write-Host ""

        # Decodificar payload do JWT
        $parts = $response.jwt.Split('.')
        if ($parts.Length -eq 3) {
            Write-Host "📋 Payload do JWT (decodificado):" -ForegroundColor Cyan
            $payload = $parts[1]
            while ($payload.Length % 4 -ne 0) { $payload += "=" }
            $payload = $payload.Replace('-', '+').Replace('_', '/')
            $bytes = [System.Convert]::FromBase64String($payload)
            $decodedPayload = [System.Text.Encoding]::UTF8.GetString($bytes)
            $decodedPayload | ConvertFrom-Json | ConvertTo-Json -Depth 10
        }
    }

} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    Write-Host "❌ Erro HTTP $statusCode" -ForegroundColor Red
    Write-Host ""

    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        $reader.Close()

        Write-Host "📋 Resposta do servidor:" -ForegroundColor Yellow
        Write-Host $responseBody
        Write-Host ""

        # Tentar parsear JSON
        try {
            $errorData = $responseBody | ConvertFrom-Json
            Write-Host "🔍 Análise do erro:" -ForegroundColor Cyan
            Write-Host "  - OK: $($errorData.ok)" -ForegroundColor Gray
            Write-Host "  - Erro: $($errorData.error)" -ForegroundColor Red
            Write-Host ""

            # Interpretar erros
            switch ($errorData.error) {
                "forbidden" {
                    Write-Host "💡 Causa: Origin header não permitido" -ForegroundColor Yellow
                    Write-Host "   Solução: Verificar allowed_origins no plugin" -ForegroundColor Gray
                }
                "missing_token" {
                    Write-Host "💡 Causa: Token não foi enviado no body" -ForegroundColor Yellow
                }
                "invalid_token_format" {
                    Write-Host "💡 Causa: Falha ao descriptografar o token" -ForegroundColor Yellow
                    Write-Host "   - Token pode estar corrompido" -ForegroundColor Gray
                    Write-Host "   - Formato base64 inválido" -ForegroundColor Gray
                }
                "invalid_token_structure" {
                    Write-Host "💡 Causa: Token descriptografado não tem 3 partes (md5|user_id|email)" -ForegroundColor Yellow
                }
                "invalid_or_expired" {
                    Write-Host "💡 Causa: Token não existe no banco ou expirou" -ForegroundColor Yellow
                    Write-Host "   - Validade: 3 horas desde o login" -ForegroundColor Gray
                    Write-Host "   - Solução: Faça login novamente no Hub e copie novo token" -ForegroundColor Gray
                }
                "user_not_found" {
                    Write-Host "💡 Causa: Usuário não existe no WordPress" -ForegroundColor Yellow
                }
                "jwt_generation_failed" {
                    Write-Host "💡 Causa: Falha ao assinar JWT RS256" -ForegroundColor Yellow
                    Write-Host "   - Chave privada não configurada ou inválida" -ForegroundColor Gray
                    Write-Host "   - Verificar: wp-content/keys/isw-sso-private.pem" -ForegroundColor Gray
                }
                default {
                    Write-Host "💡 Erro desconhecido: $($errorData.error)" -ForegroundColor Yellow
                }
            }
        } catch {
            # Não é JSON, apenas mostrar texto
        }

    } catch {
        Write-Host "⚠️  Não foi possível ler resposta do servidor" -ForegroundColor Yellow
        Write-Host $_.Exception.Message -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "🔧 Próximos passos:" -ForegroundColor Cyan
    Write-Host "  1. Verificar logs do WordPress: /wp-content/debug.log" -ForegroundColor Gray
    Write-Host "  2. Procurar por linhas com [ISW SSO]" -ForegroundColor Gray
    Write-Host "  3. Gerar um novo token fazendo login novamente no Hub" -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================" -ForegroundColor White
Write-Host "Teste concluído!" -ForegroundColor Cyan
