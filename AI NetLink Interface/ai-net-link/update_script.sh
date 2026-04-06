#!/bin/bash

# © 2026 NetLink - System Update Script
# Generated for: Muhammad Rateb Jabarin

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "Starting AI NetLink Professional Update..."

# 1. Pull latest code from GitHub
cd "$PROJECT_ROOT"
git pull origin main

# 2. Build Frontend (React)
cd "$SCRIPT_DIR"
npm install
npm run build

# 3. Restart API Server (Assuming PM2 is used in LXC)
# If not using PM2, we would restart the service via systemd
pm2 restart all || systemctl restart netlink-api

echo "Update Completed Successfully!"
