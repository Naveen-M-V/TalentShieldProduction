# Restart HRMS Backend Server
Write-Host "🔄 Restarting HRMS Backend Server..." -ForegroundColor Cyan

# Navigate to backend directory
Set-Location -Path "$PSScriptRoot\backend"

# Stop any running Node processes
Write-Host "⏹️  Stopping existing server processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Check if PM2 is being used
$pm2Exists = Get-Command pm2 -ErrorAction SilentlyContinue
if ($pm2Exists) {
    Write-Host "🔧 Detected PM2, restarting with PM2..." -ForegroundColor Green
    pm2 restart all
    Start-Sleep -Seconds 2
    pm2 logs --lines 50
} else {
    Write-Host "🚀 Starting server with nodemon..." -ForegroundColor Green
    npm run dev
}
