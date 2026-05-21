# TAS App - Update Script
# Run as Administrator after pulling new code from GitHub
# Usage: Right-click -> "Run with PowerShell" (as Admin)

$ErrorActionPreference = "Stop"
$AppRoot = Split-Path -Parent $PSScriptRoot
$taskName = "TAS-Server"

Write-Host "=== TAS App Update ===" -ForegroundColor Cyan

# --- Stop running server ---
Write-Host "Stopping server..." -ForegroundColor Yellow
Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "[OK] Server stopped" -ForegroundColor Green

# --- Install dependencies ---
Write-Host "`nInstalling server dependencies..." -ForegroundColor Yellow
Set-Location "$AppRoot\server"
npm install --production

Write-Host "Installing client dependencies..." -ForegroundColor Yellow
Set-Location "$AppRoot\client"
npm install

# --- Rebuild client ---
Write-Host "`nBuilding client..." -ForegroundColor Yellow
npm run build
Write-Host "[OK] Client built" -ForegroundColor Green

# --- Copy to server/public ---
Write-Host "`nCopying built files to server..." -ForegroundColor Yellow
$publicDir = "$AppRoot\server\public"
if (-not (Test-Path $publicDir)) {
    New-Item -ItemType Directory -Force -Path $publicDir | Out-Null
}
Copy-Item -Path "$AppRoot\client\dist\*" -Destination $publicDir -Recurse -Force
Write-Host "[OK] Files copied" -ForegroundColor Green

# --- Run migrations ---
Write-Host "`nRunning database migrations..." -ForegroundColor Yellow
Set-Location "$AppRoot\server"
npm run migrate
Write-Host "[OK] Database up to date" -ForegroundColor Green

# --- Restart server ---
Write-Host "`nStarting server..." -ForegroundColor Yellow
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 3

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "=============================" -ForegroundColor Cyan
Write-Host "  UPDATE COMPLETE!" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  App URL: https://$ip" -ForegroundColor White
Write-Host ""
pause
