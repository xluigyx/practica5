$apiKey = "semapa_evolution_key"
$instance = "semapa"
$url = "http://localhost:8080/instance/connect/$instance"

Write-Host "Obteniendo QR de Evolution API..."
$retry = 0
$base64 = $null

while ($retry -lt 10) {
    try {
        $resp = Invoke-RestMethod -Uri $url -Headers @{ "apikey" = $apiKey }
        if ($resp.base64) {
            $base64 = $resp.base64
            break
        } else {
            Write-Host "QR aún no generado (intento $($retry+1)/10). Esperando 3 segundos..."
            Start-Sleep -Seconds 3
        }
    } catch {
        Write-Host "Error de conexión: $($_.Exception.Message)"
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
    Write-Host "¡QR guardado exitosamente como qr.png! Ábrelo y escanéalo con tu WhatsApp."
    Invoke-Item "qr.png"
} else {
    Write-Host "No se pudo obtener el QR. Intenta reiniciar los contenedores o verifica que Evolution API esté corriendo."
}