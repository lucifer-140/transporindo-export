# TAS Production Start Script
# Run: .\start-prod.ps1
# Stop: Ctrl+C

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$serverDir = Join-Path $root "logistics-app\server"
$clientDir = Join-Path $root "logistics-app\client"
$certsDir  = Join-Path $serverDir "certs"

# ── Detect local Wi-Fi / LAN IP (prefer Wi-Fi adapter, skip VPN ranges) ──────
$ip = $null

# 1. Try Wi-Fi adapter by name
$wifiAdapter = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" -ErrorAction SilentlyContinue
if ($wifiAdapter) { $ip = $wifiAdapter.IPAddress }

# 2. Fallback: prefer 192.168.x.x (typical home/office router subnet)
if (-not $ip) {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 |
           Where-Object { $_.IPAddress -match '^192\.168\.' } |
           Select-Object -First 1).IPAddress
}

# 3. Last resort: any non-loopback, non-APIPA, non-VPN IP
if (-not $ip) {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 |
           Where-Object {
               $_.IPAddress -notmatch '^127\.' -and
               $_.IPAddress -notmatch '^169\.254\.' -and
               $_.IPAddress -notmatch '^10\.'
           } | Select-Object -First 1).IPAddress
}

if (-not $ip) {
    Write-Error "Could not detect Wi-Fi IP. Disconnect VPN and try again."
    exit 1
}
Write-Host "Detected IP: $ip" -ForegroundColor Cyan

# ── Generate self-signed cert (first time only) ───────────────────────────────
$certFile = Join-Path $certsDir "cert.pem"
if (-not (Test-Path $certFile)) {
    Write-Host "Generating self-signed certificate for $ip ..." -ForegroundColor Yellow
    Push-Location $serverDir
    $env:CERT_IP = $ip
    npm run gen-cert
    Pop-Location
    Write-Host "Certificate generated." -ForegroundColor Green
} else {
    Write-Host "Certificate exists, skipping generation." -ForegroundColor DarkGray
}

# ── Build React client ────────────────────────────────────────────────────────
Write-Host "`nBuilding client..." -ForegroundColor Yellow
Push-Location $clientDir
npm run build
Pop-Location
Write-Host "Client built." -ForegroundColor Green

# ── Start server ──────────────────────────────────────────────────────────────
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  TAS is running at: https://$ip`:8080" -ForegroundColor Green
Write-Host "  Share this URL with your boss (same Wi-Fi)" -ForegroundColor White
Write-Host "  Boss: click Advanced -> Proceed on cert warning" -ForegroundColor DarkGray
Write-Host "  Press Ctrl+C to stop" -ForegroundColor DarkGray
Write-Host "============================================`n" -ForegroundColor Cyan

Push-Location $serverDir
node src/index.js
Pop-Location
