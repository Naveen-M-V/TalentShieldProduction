@echo off
REM Database Health Check Script
REM Run this script to check the database status

echo.
echo ================================================
echo   HRMS Database Health Check
echo ================================================
echo.

cd /d "%~dp0"
cd backend

node scripts/checkDatabase.js

echo.
pause
