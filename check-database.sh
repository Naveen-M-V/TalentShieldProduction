#!/bin/bash

# Database Health Check Script
# Run this script to check the database status

echo ""
echo "================================================"
echo "  HRMS Database Health Check"
echo "================================================"
echo ""

cd "$(dirname "$0")/backend"

node scripts/checkDatabase.js

echo ""
