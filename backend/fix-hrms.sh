#!/bin/bash
# HRMS-Updated Backend Fix Script
# This will copy the missing middleware from the working server

echo "=========================================="
echo "HRMS-UPDATED BACKEND FIX SCRIPT"
echo "=========================================="
echo ""

# Configuration - UPDATE THESE VALUES
WORKING_SERVER="pentest@124.123.68.15"  # Update with actual IP
WORKING_PORT="44444"  # SSH port
WORKING_PATH="/home/pentest/apps/hrms/backend"
LOCAL_PATH="$HOME/hrms-updated/backend"

echo "Configuration:"
echo "  Working Server: $WORKING_SERVER"
echo "  Working Path: $WORKING_PATH"
echo "  Local Path: $LOCAL_PATH"
echo ""

# Check if local path exists
if [ ! -d "$LOCAL_PATH" ]; then
    echo "❌ ERROR: $LOCAL_PATH does not exist!"
    exit 1
fi

echo "Step 1: Creating backup..."
BACKUP_DIR="$HOME/hrms-updated-backup-$(date +%Y%m%d-%H%M%S)"
cp -r "$HOME/hrms-updated" "$BACKUP_DIR"
echo "✅ Backup created at: $BACKUP_DIR"
echo ""

echo "Step 2: Testing connection to working server..."
if ssh -p $WORKING_PORT -o ConnectTimeout=5 $WORKING_SERVER "echo 'Connection OK'" 2>/dev/null; then
    echo "✅ Connection successful"
else
    echo "❌ Cannot connect to $WORKING_SERVER on port $WORKING_PORT"
    echo ""
    echo "Please set up SSH keys first:"
    echo "  ssh-copy-id -p $WORKING_PORT $WORKING_SERVER"
    exit 1
fi
echo ""

echo "Step 3: Copying middleware directory..."
scp -P $WORKING_PORT -r $WORKING_SERVER:$WORKING_PATH/middleware $LOCAL_PATH/
if [ $? -eq 0 ]; then
    echo "✅ Middleware directory copied"
else
    echo "❌ Failed to copy middleware"
    exit 1
fi
echo ""

echo "Step 4: Verifying auth.js exists..."
if [ -f "$LOCAL_PATH/middleware/auth.js" ]; then
    echo "✅ auth.js is present"
    ls -lh $LOCAL_PATH/middleware/auth.js
else
    echo "❌ auth.js not found!"
    exit 1
fi
echo ""

echo "Step 5: Copying package.json for comparison..."
scp -P $WORKING_PORT $WORKING_SERVER:$WORKING_PATH/package.json /tmp/working-package.json
echo "Working server package.json saved to /tmp/working-package.json"
echo ""

echo "Step 6: Comparing package.json dependencies..."
echo "=== Working Server Dependencies ==="
cat /tmp/working-package.json | grep -A20 '"dependencies"'
echo ""
echo "=== Your Current Dependencies ==="
cat $LOCAL_PATH/package.json | grep -A20 '"dependencies"'
echo ""

read -p "Do you want to copy the working package.json? (y/n): " COPY_PKG
if [ "$COPY_PKG" = "y" ] || [ "$COPY_PKG" = "Y" ]; then
    cp $LOCAL_PATH/package.json $LOCAL_PATH/package.json.backup
    cp /tmp/working-package.json $LOCAL_PATH/package.json
    echo "✅ package.json copied (backup saved)"
    echo ""
    
    echo "Step 7: Installing dependencies..."
    cd $LOCAL_PATH
    npm install
    echo "✅ Dependencies installed"
else
    echo "⏭️  Skipped package.json copy"
fi
echo ""

echo "Step 8: Comparing environment variables..."
echo "=== Working Server .env keys ==="
ssh -p $WORKING_PORT $WORKING_SERVER "cat $WORKING_PATH/.env | grep -v '^#' | grep -v '^$' | cut -d'=' -f1"
echo ""
echo "=== Your Current .env keys ==="
cat $LOCAL_PATH/.env | grep -v "^#" | grep -v "^$" | cut -d'=' -f1
echo ""
echo "⚠️  Note: Check if any environment variables are missing and add them manually"
echo ""

echo "Step 9: Updating port to 5005..."
sed -i.bak 's/PORT=5004/PORT=5005/g' $LOCAL_PATH/.env
if grep -q "PORT=5005" $LOCAL_PATH/.env; then
    echo "✅ Port updated to 5005"
else
    echo "⚠️  Port might already be set or variable not found"
fi
echo ""

echo "Step 10: Setting proper permissions..."
chmod 755 $LOCAL_PATH/middleware/
chmod 644 $LOCAL_PATH/middleware/*
chmod 600 $LOCAL_PATH/.env
echo "✅ Permissions set"
echo ""

echo "Step 11: Restarting PM2 process..."
pm2 restart hrms-updated-backend
echo "✅ PM2 process restarted"
echo ""

echo "Step 12: Waiting for startup..."
sleep 5
echo ""

echo "Step 13: Checking process status..."
pm2 status hrms-updated-backend
echo ""

echo "Step 14: Checking logs..."
echo "=== Last 30 lines of logs ==="
pm2 logs hrms-updated-backend --lines 30 --nostream
echo ""

echo "=========================================="
echo "FIX COMPLETE!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check if hrms-updated-backend is 'online' in pm2 status"
echo "2. Monitor logs: pm2 logs hrms-updated-backend"
echo "3. Test the application: curl http://localhost:5005/health"
echo ""
echo "If still having issues:"
echo "  - Check error logs: pm2 logs hrms-updated-backend --err"
echo "  - Compare with working server: pm2 logs hrms-backend"
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""
