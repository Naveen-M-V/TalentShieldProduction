# Quick Deploy Script for Windows PowerShell
# Run this from E:\Websites\HRMSLogin\hrms-updated

Write-Host "🚀 HRMS Quick Deployment Script" -ForegroundColor Green
Write-Host ""

# Build frontend locally
Write-Host "📦 Building frontend locally..." -ForegroundColor Cyan
cd frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend built successfully!" -ForegroundColor Green
cd ..

# Git operations
Write-Host ""
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Cyan
git add .
git commit -m "Fix: Resolved 502 Errors and Dashboard Data Fetching issues"
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Git push failed or nothing to commit" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Local steps complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Now run these commands on your server:" -ForegroundColor Yellow
Write-Host ""
Write-Host "ssh root@65.21.71.57" -ForegroundColor White
Write-Host ""
Write-Host "Then copy-paste this:" -ForegroundColor Yellow
Write-Host ""
Write-Host @"
pm2 stop hrms-backend
cd /root/hrms-updated
git pull origin main
cd frontend
npm run build
rm -rf /var/www/hrms-frontend/*
cp -r build/* /var/www/hrms-frontend/
ls -lh /var/www/hrms-frontend/
pm2 restart hrms-backend
pm2 status
pm2 logs hrms-backend --lines 20
"@ -ForegroundColor Cyan

Write-Host ""
Write-Host "📝 After deployment, remember to:" -ForegroundColor Yellow
Write-Host "   1. Press Ctrl + Shift + R in browser (hard reload)" -ForegroundColor White
Write-Host "   2. Check https://hrms.talentshield.co.uk/edit-employee/69198924de99808c907fa087" -ForegroundColor White
Write-Host "   3. Click Employment tab - should show Role field now!" -ForegroundColor White
Write-Host ""
