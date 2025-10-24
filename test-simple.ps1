# Teste simples do token SSO
param([string]$Token = "Q1RYMVZUOVZMdFJLK1JCQzYzSm90aFp3NEM0NzJDc1hFbVZHY0o4Rm9LaTRETUFGL0pBTHZOZ1M2NWFoNGVPUk9qamtSSVJlc3hOelNlS0wyY3AwZFE9PTvWOnwwELWyfska8IgrKDUF")

Write-Host "Testando token SSO Exchange" -ForegroundColor Cyan
Write-Host "Token: $($Token.Substring(0, 50))..." -ForegroundColor Gray
Write-Host ""

$body = @{ token = $Token } | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://hub.vendaseguro.com.br/wp-json/isw-sso/v1/exchange" -Method POST -Headers @{"Content-Type" = "application/json"; "Origin" = "http://localhost:8080"} -Body $body -ErrorAction Stop

    Write-Host "SUCESSO!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10

} catch {
    Write-Host "ERRO HTTP $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red

    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    $reader.Close()

    Write-Host "Resposta do servidor:" -ForegroundColor Yellow
    Write-Host $responseBody
}
