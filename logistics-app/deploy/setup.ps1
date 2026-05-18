# TAS App - One-Time Setup Script
# Run as Administrator on the deployment PC
# Usage: Right-click -> "Run with PowerShell" (as Admin)

$ErrorActionPreference = "Stop"
$AppRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=== TAS App Setup ===" -ForegroundColor Cyan

# --- Check Node.js ---
try {
    $nodeVersion = node -v
    Write-Host "[OK] Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not installed. Download from https://nodejs.org and install LTS version, then re-run this script." -ForegroundColor Red
    pause
    exit 1
}

# --- Install server dependencies ---
Write-Host "`nInstalling server dependencies..." -ForegroundColor Yellow
Set-Location "$AppRoot\server"
npm install --production
Write-Host "[OK] Server dependencies installed" -ForegroundColor Green

# --- Install client dependencies and build ---
Write-Host "`nInstalling client dependencies..." -ForegroundColor Yellow
Set-Location "$AppRoot\client"
npm install
Write-Host "Building client..." -ForegroundColor Yellow
npm run build
Write-Host "[OK] Client built" -ForegroundColor Green

# --- Copy built client to server/public ---
Write-Host "`nCopying built files to server..." -ForegroundColor Yellow
$publicDir = "$AppRoot\server\public"
if (-not (Test-Path $publicDir)) {
    New-Item -ItemType Directory -Force -Path $publicDir | Out-Null
}
Copy-Item -Path "$AppRoot\client\dist\*" -Destination $publicDir -Recurse -Force
Write-Host "[OK] Files copied to server/public" -ForegroundColor Green

# --- Create .env if missing ---
Set-Location "$AppRoot\server"
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    # Generate a random session secret
    $secret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
    (Get-Content ".env") -replace "change-this-to-a-long-random-string-before-production", $secret | Set-Content ".env"
    # Set production mode
    (Get-Content ".env") -replace "NODE_ENV=development", "NODE_ENV=production" | Set-Content ".env"
    Write-Host "[OK] .env created with production settings" -ForegroundColor Green
} else {
    Write-Host "[SKIP] .env already exists" -ForegroundColor DarkGray
}

# --- Create data directory if missing ---
if (-not (Test-Path "$AppRoot\server\data")) {
    New-Item -ItemType Directory -Force -Path "$AppRoot\server\data" | Out-Null
}

# --- Run database migration ---
Write-Host "`nRunning database migration..." -ForegroundColor Yellow
Set-Location "$AppRoot\server"
npm run migrate
Write-Host "[OK] Database ready" -ForegroundColor Green

# --- Register Windows Task Scheduler (auto-start on boot) ---
Write-Host "`nRegistering auto-start task..." -ForegroundColor Yellow
$startScript = "$AppRoot\deploy\start-server.bat"
$taskName = "TAS-Server"

# Remove old task if exists
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute $startScript
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -RunLevel Highest `
    -User "SYSTEM" | Out-Null

Write-Host "[OK] Auto-start registered (runs on every boot)" -ForegroundColor Green

# --- Allow port 8080 through Windows Firewall ---
Write-Host "`nConfiguring firewall..." -ForegroundColor Yellow
$fwRuleName = "TAS App Port 8080"
$existing = Get-NetFirewallRule -DisplayName $fwRuleName -ErrorAction SilentlyContinue
if ($existing) {
    Remove-NetFirewallRule -DisplayName $fwRuleName
}
New-NetFirewallRule `
    -DisplayName $fwRuleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 8080 `
    -Action Allow | Out-Null
Write-Host "[OK] Firewall rule added" -ForegroundColor Green

# --- Find this PC's IP ---
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress

# --- Done ---
Write-Host "`n=============================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  App URL: http://$ip`:8080" -ForegroundColor White
Write-Host ""
Write-Host "  Share this URL with all users." -ForegroundColor White
Write-Host "  Server will start automatically on every boot." -ForegroundColor White
Write-Host ""
Write-Host "  To start now without rebooting, run:" -ForegroundColor DarkGray
Write-Host "    start-now.bat   (in the deploy folder)" -ForegroundColor DarkGray
Write-Host ""
pause
