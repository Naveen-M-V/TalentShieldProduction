#!/bin/bash
# Quick diagnostic for /home/pentest/apps/hrms/backend

REPORT_FILE="hrms-detailed-diagnostic-$(date +%Y%m%d-%H%M%S).txt"

echo "========================================" | tee $REPORT_FILE
echo "HRMS DETAILED DIAGNOSTIC" | tee -a $REPORT_FILE
echo "Generated: $(date)" | tee -a $REPORT_FILE
echo "========================================" | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

BACKEND_PATH="/home/pentest/apps/hrms/backend"

# Directory structure
echo "=== Backend Directory Structure ===" | tee -a $REPORT_FILE
ls -lah $BACKEND_PATH | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

# Check for middleware
echo "=== Middleware Directory ===" | tee -a $REPORT_FILE
if [ -d $BACKEND_PATH/middleware ]; then
    ls -lah $BACKEND_PATH/middleware/ | tee -a $REPORT_FILE
    echo "" | tee -a $REPORT_FILE
    echo "Middleware files:" | tee -a $REPORT_FILE
    find $BACKEND_PATH/middleware -type f | tee -a $REPORT_FILE
else
    echo "Middleware directory NOT FOUND" | tee -a $REPORT_FILE
fi
echo "" | tee -a $REPORT_FILE

# Check for auth.js
echo "=== Auth Middleware Content ===" | tee -a $REPORT_FILE
if [ -f $BACKEND_PATH/middleware/auth.js ]; then
    echo "✓ auth.js EXISTS" | tee -a $REPORT_FILE
    echo "" | tee -a $REPORT_FILE
    cat $BACKEND_PATH/middleware/auth.js | tee -a $REPORT_FILE
elif [ -f $BACKEND_PATH/middlewares/auth.js ]; then
    echo "✓ auth.js EXISTS in 'middlewares' (plural)" | tee -a $REPORT_FILE
    echo "" | tee -a $REPORT_FILE
    cat $BACKEND_PATH/middlewares/auth.js | tee -a $REPORT_FILE
else
    echo "✗ auth.js NOT FOUND" | tee -a $REPORT_FILE
    echo "Searching for any auth files..." | tee -a $REPORT_FILE
    find $BACKEND_PATH -name "*auth*" -type f ! -path "*/node_modules/*" | tee -a $REPORT_FILE
fi
echo "" | tee -a $REPORT_FILE

# Check routes
echo "=== Routes Directory ===" | tee -a $REPORT_FILE
if [ -d $BACKEND_PATH/routes ]; then
    ls -lah $BACKEND_PATH/routes/ | tee -a $REPORT_FILE
    echo "" | tee -a $REPORT_FILE
    
    # Check clockRoutes specifically
    if [ -f $BACKEND_PATH/routes/clockRoutes.js ]; then
        echo "=== clockRoutes.js (first 50 lines) ===" | tee -a $REPORT_FILE
        head -50 $BACKEND_PATH/routes/clockRoutes.js | tee -a $REPORT_FILE
    fi
fi
echo "" | tee -a $REPORT_FILE

# Check all subdirectories
echo "=== All Subdirectories ===" | tee -a $REPORT_FILE
find $BACKEND_PATH -maxdepth 2 -type d ! -path "*/node_modules/*" | sort | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE

# Check package.json
echo "=== Package.json ===" | tee -a $REPORT_FILE
if [ -f $BACKEND_PATH/package.json ]; then
    cat $BACKEND_PATH/package.json | tee -a $REPORT_FILE
fi
echo "" | tee -a $REPORT_FILE

# Check .env structure
echo "=== Environment Files ===" | tee -a $REPORT_FILE
ls -lah $BACKEND_PATH/.env* 2>/dev/null | tee -a $REPORT_FILE
echo "" | tee -a $REPORT_FILE
if [ -f $BACKEND_PATH/.env ]; then
    echo "Environment variable keys:" | tee -a $REPORT_FILE
    cat $BACKEND_PATH/.env | grep -v "^#" | grep -v "^$" | cut -d'=' -f1 | tee -a $REPORT_FILE
fi
echo "" | tee -a $REPORT_FILE

# Check server.js
echo "=== Server.js (first 100 lines) ===" | tee -a $REPORT_FILE
if [ -f $BACKEND_PATH/server.js ]; then
    head -100 $BACKEND_PATH/server.js | tee -a $REPORT_FILE
fi
echo "" | tee -a $REPORT_FILE

echo "========================================" | tee -a $REPORT_FILE
echo "COMPLETE!" | tee -a $REPORT_FILE
echo "Report saved to: $REPORT_FILE" | tee -a $REPORT_FILE
echo "========================================" | tee -a $REPORT_FILE
