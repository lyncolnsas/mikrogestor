#!/bin/bash
set -e

echo "🚀 Iniciando Entrypoint da Aplicação Mikrogestor..."

# 1. Wait for Database
echo "⏳ Aguardando banco de dados em ${DB_HOST:-db}..."
until pg_isready -h ${DB_HOST:-db} -U ${DB_USER:-postgres}; do
  sleep 1
done
echo "✅ Banco de dados está online!"

# 2. Run Database Migrations
echo "🔄 Verificando Integridade do Banco de Dados..."
export PGPASSWORD=${DB_PASSWORD}

# Check if we have drift (migrations applied but tables missing)
# We test for saas_plans table as an indicator of sync_schema status
TABLE_CHECK=$(psql -h ${DB_HOST:-db} -U ${DB_USER:-postgres} -d ${DB_NAME:-mikrogestor} -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'management' AND table_name = 'saas_plans');" 2>/dev/null || echo "error")

if [ "$TABLE_CHECK" = "f" ]; then
    echo "⚠️ Desvio de Banco de Dados Detectado: Migrações podem estar registradas, mas tabelas estão faltando."
    echo "💥 Realizando Reset de Schema de Emergência..."
    psql -h ${DB_HOST:-db} -U ${DB_USER:-postgres} -d ${DB_NAME:-mikrogestor} -c "DROP SCHEMA IF EXISTS management CASCADE; DROP SCHEMA IF EXISTS radius CASCADE; DROP SCHEMA IF EXISTS tenant_template CASCADE; DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" || echo "⚠️ Falha ao dropar schemas ou banco não existe."
elif [ "$TABLE_CHECK" = "error" ]; then
    echo "ℹ️ Banco de dados ${DB_NAME:-mikrogestor} pode não existir ainda. O Prisma irá criá-lo."
fi

echo "🔄 Implantando Schema Prisma..."
echo "⚠️ MIGRATION WORKAROUND ACTIVATED: Usando db push para ignorar histórico de migração quebrado."
npx prisma db push --accept-data-loss --skip-generate

# 3. Seed Database (Optional - can check if already seeded)
echo "🌱 Populando banco de dados (Seed)..."
prisma db seed

# 3.1 Initialize Tenant Template Schema (Crucial for ISP Creation)
echo "🏗️ [STEP 3.1] Inicializando Schema Template (tenant_template)..."
export PGPASSWORD=${DB_PASSWORD}
# Changed from .sql to .ts and using tsx for direct execution
npx tsx /app/scripts/init-tenant-template.ts || echo "⚠️ [AVISO] Falha ao inicializar tenant_template (o app continuará subindo)."


# 4. VPN Auto-Registration Logic
WG_DIR="/etc/wireguard"

if [ "$VPN_AUTO_REGISTER" = "true" ]; then
    echo "🛡️ [STEP 4] Preparando Auto-Registro VPN..."
    
    # Support both standard naming and linuxserver/wireguard naming
    if [ ! -f "$WG_DIR/private.key" ] && [ -f "$WG_DIR/server/privatekey-server" ]; then
        ln -sf "$WG_DIR/server/privatekey-server" "$WG_DIR/private.key"
        ln -sf "$WG_DIR/server/publickey-server" "$WG_DIR/public.key"
    fi

    if ! [ -f "$WG_DIR/private.key" ]; then
        echo "🔑 Gerando chaves WireGuard..."
        wg genkey | tee $WG_DIR/private.key | wg pubkey > $WG_DIR/public.key || echo "⚠️ Falha ao gerar chaves WireGuard."
    fi
    
    # RADICAL SANITIZATION: Eliminate any non-base64 garbage
    RAW_PRIVATE=$(cat $WG_DIR/private.key 2>/dev/null || echo "")
    RAW_PUBLIC=$(cat $WG_DIR/public.key 2>/dev/null || echo "")
    
    PRIVATE_KEY=$(echo "$RAW_PRIVATE" | tr -dc 'A-Za-z0-9+/=' | head -c 44)
    PUBLIC_KEY=$(echo "$RAW_PUBLIC" | tr -dc 'A-Za-z0-9+/=' | head -c 44)

    # Validation: If after sanitization we don't have 44 chars, force regeneration
    if [ ${#PRIVATE_KEY} -ne 44 ]; then
        echo "⚠️ Chave privada inválida (len=${#PRIVATE_KEY}). Regenerando chaves limpas..."
        rm -f $WG_DIR/private.key $WG_DIR/public.key
        wg genkey | tee $WG_DIR/private.key | wg pubkey > $WG_DIR/public.key || true
        PRIVATE_KEY=$(cat $WG_DIR/private.key | tr -dc 'A-Za-z0-9+/=' | head -c 44)
        PUBLIC_KEY=$(cat $WG_DIR/public.key | tr -dc 'A-Za-z0-9+/=' | head -c 44)
    fi

    # Final persistent keys
    echo -n "$PRIVATE_KEY" > $WG_DIR/private.key
    echo -n "$PUBLIC_KEY" > $WG_DIR/public.key
    
    echo "✅ Chaves WireGuard sanitizadas e prontas."
    
    # IP Detection Strategy
    if [ "$VPN_PUBLIC_ENDPOINT" = "auto" ] || [ -z "$VPN_PUBLIC_ENDPOINT" ] || [ "$VPN_PUBLIC_ENDPOINT" = "192.168.18.9" ]; then
        echo "🔍 Detectando IP público automaticamente para WireGuard..."
        DETECTED_IP=$(curl -s https://api.ipify.org || wget -qO- https://api.ipify.org || curl -s https://ifconfig.me)
        if [ -n "$DETECTED_IP" ]; then
            export VPN_PUBLIC_ENDPOINT="$DETECTED_IP"
            echo "✅ IP Público detectado: $VPN_PUBLIC_ENDPOINT"
        else
            export VPN_PUBLIC_ENDPOINT=$(ip -4 route get 8.8.8.8 | awk '{print $7}' | head -n 1)
            echo "⚠️ Falha na API externa. Usando IP da interface roteável: $VPN_PUBLIC_ENDPOINT"
        fi
    fi
    
    # 4.1 Initialize WireGuard Interface
    if ! ip link show wg0 > /dev/null 2>&1; then
        echo "🔧 [STEP 4.1] Criando interface wg0..."
        ip link add dev wg0 type wireguard || {
            echo "⚠️ Falta de suporte ao kernel WireGuard host. Inciando fallback wireguard-go..."
            wireguard-go wg0 || echo "🚨 Erro Crítico: wireguard-go (user-space) também falhou."
        }
        ip address add 10.255.0.1/24 dev wg0 || echo "⚠️ Erro ao adicionar IP à wg0"
        # Use filename directly but we already cleaned it
        wg set wg0 listen-port 51820 private-key $WG_DIR/private.key || echo "⚠️ Erro ao configurar chaves na wg0"
        ip link set up dev wg0 || echo "⚠️ Erro ao subir interface wg0"
        
        # Enable IP Forwarding and NAT (Non-fatal)
        sysctl -w net.ipv4.ip_forward=1 || true
        
        # Clear existing rules to avoid duplicates
        iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE 2>/dev/null || true
        iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
        iptables -D FORWARD -i wg0 -j ACCEPT 2>/dev/null || true
        iptables -I FORWARD -i wg0 -j ACCEPT
        iptables -D FORWARD -o wg0 -j ACCEPT 2>/dev/null || true
        iptables -I FORWARD -o wg0 -j ACCEPT
        
        echo "✅ Interface WireGuard (wg0) iniciada em 10.255.0.1/24 com regras de Forwarding"
    else
        echo "ℹ️ Interface wg0 já existe."
    fi

    # 4.2 Background Synchronization Loops
    (
        echo "🔄 Iniciando Loop de Sincronização de Peers VPN e Estatísticas em Segundo Plano..."
        while true; do
            # Peer Sync
            node /app/scripts/sync-wireguard.js || echo "⚠️ Falha ao sincronizar peers VPN."
            
            # Stats Reporting
            node /app/scripts/report-stats.js || echo "⚠️ Falha ao reportar estatísticas VPN."
            
            sleep 60
        done
    ) &
fi

# 5. Start the application
echo "🎬 Iniciando servidor standalone Next.js..."
exec node server.js
