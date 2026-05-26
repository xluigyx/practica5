$apiKey = "luz_evolution_key"
$instance = "luzbot"
$urlCreate = "http://localhost:8080/instance/create"
$urlConnect = "http://localhost:8080/instance/connect/$instance"

Write-Host "Verificando/creando instancia en Evolution API..."
try {
    # Intentar crear la instancia por si no existe
    $body = @{
        instanceName = $instance
        integration = "WHATSAPP-BAILEYS"
        qrcode = $true
    } | ConvertTo-Json
    Invoke-RestMethod -Uri $urlCreate -Method Post -Headers @{"apikey"=$apiKey; "Content-Type"="application/json"} -Body $body -ErrorAction SilentlyContinue | Out-Null
} catch {}

Write-Host "Obteniendo código QR..."
$retry = 0
$base64 = $null

while ($retry -lt 15) {
    try {
        $resp = Invoke-RestMethod -Uri $urlConnect -Headers @{ "apikey" = $apiKey }
        if ($resp.base64) {
            $base64 = $resp.base64
            break
        } else {
            Write-Host "Generando QR (intento $($retry+1)/15)..."
            Start-Sleep -Seconds 3
        }
    } catch {
        Write-Host "Aún no responde... esperando..."
        Start-Sleep -Seconds 3
    }
    $retry++
}

if ($base64) {
    if ($base64.StartsWith('data:image/png;base64,')) {
        $base64 = $base64.Substring('data:image/png;base64,'.Length)
    }
    $bytes = [Convert]::FromBase64String($base64)
    [IO.File]::WriteAllBytes("qr.png", $bytes)
    Write-Host "¡QR LISTO! Abriendo qr.png para que lo escanees..."
    Invoke-Item "qr.png"
} else {
    Write-Host "No se pudo obtener el QR. Intenta correr 'docker compose down' y luego 'docker compose up -d' de nuevo."
}
