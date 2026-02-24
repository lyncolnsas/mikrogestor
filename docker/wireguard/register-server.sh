#!/bin/bash
# VPN Server Auto-Registration Script
# This script runs on container startup to register the VPN server with the main app

set -e

# Configuration from environment variables
SERVER_ID="${VPN_SERVER_ID:-default-ca-sync-01}"
SERVER_SECRET="${VPN_SERVER_SECRET:-ca-dev-secret-2025}"
APP_URL="${APP_URL:-http://localhost:3000}"
VPN_PUBLIC_ENDPOINT="${VPN_PUBLIC_ENDPOINT:-auto}"
VPN_PORT="${VPN_PORT:-51820}"

# Paths
PUBLIC_KEY_FILE="/config/server/publickey-server"
WG_CONF_DIR="/config/wg_confs"

echo "🚀 VPN Server Auto-Registration Starting..."
echo "   Server ID: $SERVER_ID"
echo "   App URL: $APP_URL"

# Wait for app to be ready
echo "⏳ Waiting for app to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s "${APP_URL}/api/health" > /dev/null 2>&1; then
        echo "✅ App is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   Attempt $RETRY_COUNT/$MAX_RETRIES..."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "⚠️  App not ready after $MAX_RETRIES attempts. Proceeding anyway..."
fi

# Read server public key
if [ ! -f "$PUBLIC_KEY_FILE" ]; then
    echo "❌ ERROR: Public key file not found at $PUBLIC_KEY_FILE"
    exit 1
fi

PUBLIC_KEY=$(cat "$PUBLIC_KEY_FILE")
echo "🔑 Server Public Key: ${PUBLIC_KEY:0:20}..."

# Detect public endpoint
if [ "$VPN_PUBLIC_ENDPOINT" = "auto" ]; then
    # Try to detect public IP
    PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "")
    
    if [ -z "$PUBLIC_IP" ]; then
        # Fallback to local IP
        PUBLIC_IP=$(hostname -I | awk '{print $1}')
    fi
    
    VPN_PUBLIC_ENDPOINT="${PUBLIC_IP}:${VPN_PORT}"
    echo "🌐 Auto-detected endpoint: $VPN_PUBLIC_ENDPOINT"
else
    echo "🌐 Using configured endpoint: $VPN_PUBLIC_ENDPOINT"
fi

# Register with main app
echo "📡 Registering with main app..."

RESPONSE=$(curl -s -X POST "${APP_URL}/api/saas/vpn-sync" \
    -H "Content-Type: application/json" \
    -d "{
        \"serverId\": \"$SERVER_ID\",
        \"secret\": \"$SERVER_SECRET\",
        \"publicEndpoint\": \"$VPN_PUBLIC_ENDPOINT\",
        \"publicKey\": \"$PUBLIC_KEY\"
    }" || echo '{"error": "Request failed"}')

echo "📨 Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
    ACTION=$(echo "$RESPONSE" | grep -o '"action":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Registration successful! Action: $ACTION"
else
    echo "⚠️  Registration failed or returned error. Check app logs."
fi

echo "🎉 VPN Server initialization complete!"
