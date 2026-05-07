#!/bin/bash
# Quick Deployment Script for HRMS Updates

echo "🚀 Starting HRMS Deployment..."
echo ""

# 1. Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi
echo "✅ Frontend built successfully"
echo ""

# 2. SSH to server and deploy
echo "🔄 Deploying to server..."
echo ""

# Display commands that need to be run on server
echo "📋 Run these commands on your server (ssh root@65.21.71.57):"
echo ""
echo "# 1. Stop backend"
echo "pm2 stop hrms-backend"
echo ""
echo "# 2. Pull latest code"
echo "cd /root/hrms-updated"
echo "git pull origin main"
echo ""
echo "# 3. Update frontend build"
echo "cd frontend"
echo "npm run build"
echo ""
echo "# 4. Copy build to nginx"
echo "rm -rf /var/www/hrms-frontend/*"
echo "cp -r build/* /var/www/hrms-frontend/"
echo ""
echo "# 5. Restart backend"
echo "cd /root/hrms-updated/backend"
echo "pm2 restart hrms-backend"
echo ""
echo "# 6. Check logs"
echo "pm2 logs hrms-backend --lines 50"
echo ""
echo "# 7. Verify frontend files"
echo "ls -lh /var/www/hrms-frontend/"
echo ""
echo "# 8. Check nginx"
echo "nginx -t"
echo "systemctl reload nginx"
echo ""

echo "✅ Local build complete. Now run the commands above on your server."
