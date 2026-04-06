#!/bin/bash

# © 2026 NetLink - System Update Script
# Generated for: Muhammad Rateb Jabarin

echo "Starting AI NetLink Professional Update..."

# 1. Pull latest code from GitHub
git pull origin main

# 2. Build Frontend (React)
cd "AI NetLink Interface/ai-net-link"
npm install
npm run build

# 3. Restart API Server (Assuming PM2 is used in LXC)
# If not using PM2, we would restart the service via systemd
pm2 restart all || systemctl restart netlink-api

echo "Update Completed Successfully!"
