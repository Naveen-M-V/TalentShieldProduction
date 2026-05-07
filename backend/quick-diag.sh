#!/bin/bash
# Quick diagnostic to find missing modules

echo "=========================================="
echo "CHECKING HRMS-UPDATED BACKEND"
echo "=========================================="
echo ""

BACKEND_PATH="$HOME/hrms-updated/backend"

echo "1. Checking if middleware directory exists..."
if [ -d "$BACKEND_PATH/middleware" ]; then
    echo "✅ middleware/ directory exists"
    ls -lah "$BACKEND_PATH/middleware/"
else
    echo "❌ middleware/ directory NOT FOUND"
fi
echo ""

echo "2. Checking if auth.js exists..."
if [ -f "$BACKEND_PATH/middleware/auth.js" ]; then
    echo "✅ auth.js exists"
    echo "File size: $(stat -c%s $BACKEND_PATH/middleware/auth.js) bytes"
    echo ""
    echo "First 10 lines:"
    head -10 "$BACKEND_PATH/middleware/auth.js"
else
    echo "❌ auth.js NOT FOUND"
fi
echo ""

echo "3. Checking clockRoutes.js line 19..."
if [ -f "$BACKEND_PATH/routes/clockRoutes.js" ]; then
    echo "Line 19 of clockRoutes.js:"
    sed -n '19p' "$BACKEND_PATH/routes/clockRoutes.js"
    echo ""
    echo "Lines 15-25 for context:"
    sed -n '15,25p' "$BACKEND_PATH/routes/clockRoutes.js"
else
    echo "❌ clockRoutes.js NOT FOUND"
fi
echo ""

echo "4. Checking utils directory..."
if [ -d "$BACKEND_PATH/utils" ]; then
    echo "✅ utils/ directory exists"
    ls -lah "$BACKEND_PATH/utils/" | head -10
else
    echo "❌ utils/ directory NOT FOUND"
fi
echo ""

echo "5. Checking what utils files are needed..."
if [ -f "$BACKEND_PATH/routes/clockRoutes.js" ]; then
    echo "Utils imports in clockRoutes.js:"
    grep "require.*utils" "$BACKEND_PATH/routes/clockRoutes.js"
fi
echo ""

echo "6. Checking config directory..."
if [ -d "$BACKEND_PATH/config" ]; then
    echo "✅ config/ directory exists"
    ls -lah "$BACKEND_PATH/config/"
else
    echo "❌ config/ directory NOT FOUND"
fi
echo ""

echo "7. Last error from PM2..."
tail -30 ~/.pm2/logs/hrms-updated-backend-error.log
echo ""

echo "=========================================="
echo "DIAGNOSTIC COMPLETE"
echo "=========================================="
