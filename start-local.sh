#!/bin/bash

echo "========================================"
echo "  HRMS - Starting Localhost Servers"
echo "========================================"
echo ""

# Start Backend
echo "Starting Backend Server..."
cd "c:/Users/kanch/OneDrive/Desktop/hrms/hrms-updated/backend" || exit
gnome-terminal -- bash -c "npm start; exec bash" 2>/dev/null || \
xterm -e "npm start" 2>/dev/null || \
open -a Terminal "npm start" 2>/dev/null &

sleep 3

# Start Frontend
echo "Starting Frontend Server..."
cd "c:/Users/kanch/OneDrive/Desktop/hrms/hrms-updated/frontend" || exit
gnome-terminal -- bash -c "npm start; exec bash" 2>/dev/null || \
xterm -e "npm start" 2>/dev/null || \
open -a Terminal "npm start" 2>/dev/null &

echo ""
echo "========================================"
echo "  Servers Starting..."
echo "========================================"
echo "  Backend:  http://localhost:5003"
echo "  Frontend: http://localhost:1222"
echo "========================================"
echo ""
echo "Check the new terminal windows for server output"
