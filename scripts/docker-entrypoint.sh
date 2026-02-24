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
echo "🏗️ Inicializando Schema Template (tenant_template)..."
export PGPASSWORD=${DB_PASSWORD}
psql -h ${DB_HOST:-db} -U ${DB_USER:-postgres} -d ${DB_NAME:-mikrogestor} -f /app/scripts/init-tenant-template.sql || echo "⚠️ Erro ao inicializar tenant_template (pode já existir)"


# 4. VPN Auto-Registration Logic
WG_DIR="/etc/wireguard"

if [ "$VPN_AUTO_REGISTER" = "true" ]; then
    echo "🛡️ Auto-Registro VPN habilitado..."
    
    # Support both standard naming and linuxserver/wireguard naming
    if [ ! -f "$WG_DIR/private.key" ] && [ -f "$WG_DIR/server/privatekey-server" ]; then
        ln -sf "$WG_DIR/server/privatekey-server" "$WG_DIR/private.key"
        ln -sf "$WG_DIR/server/publickey-server" "$WG_DIR/public.key"
    fi

    if [ ! -f "$WG_DIR/private.key" ]; then
        echo "🔑 Gerando chaves WireGuard..."
        wg genkey | tee $WG_DIR/private.key | wg pubkey > $WG_DIR/public.key
    fi
    
    PRIVATE_KEY=$(cat $WG_DIR/private.key)
    PUBLIC_KEY=$(cat $WG_DIR/public.key)
    
    # IP Detection Strategy
    if [ "$VPN_PUBLIC_ENDPOINT" = "public" ] || [ "$VPN_HOST" = "public" ]; then
        echo "🌍 Detectando IP Público da Internet (WAN)..."
        DETECTED_IP=$(curl -s https://api.ipify.org --max-time 10 || echo "")
        if [ -n "$DETECTED_IP" ]; then
            PUBLIC_IP=$DETECTED_IP
            echo "✅ IP Público Detectado: $PUBLIC_IP"
        else
            echo "⚠️ Falha ao detectar IP Público. Usando localhost."
            PUBLIC_IP="127.0.0.1"
        fi
    elif [ -n "$VPN_PUBLIC_ENDPOINT" ] && [ "$VPN_PUBLIC_ENDPOINT" != "auto" ]; then
        PUBLIC_IP=$VPN_PUBLIC_ENDPOINT
        echo "📍 Usando Endpoint VPN fornecido manualmente: $PUBLIC_IP"
    else
        echo "🌍 Auto-detectando IP da LAN (Privado) com detecção inteligente..."
        DETECTED_IP=$(node /app/scripts/auto-update-ip.js --raw || echo "")
        
        if [ -n "$DETECTED_IP" ]; then
            PUBLIC_IP=$DETECTED_IP
            echo "✅ IP do Host Detectado: $PUBLIC_IP"
        else
            echo "⚠️ auto-update-ip.js falhou ao retornar IP, tentando detecção por hostname..."
            PUBLIC_IP=$(hostname -i | awk '{print $1}')
        fi
        
        echo "✅ Detecção de IP concluída. Usando: $PUBLIC_IP"
    fi
    
    # Register with SaaS Panel API (Background Process)
    if [ -n "$VPN_SERVER_ID" ] && [ -n "$VPN_SERVER_SECRET" ]; then
        (
            echo "⏳ Aguardando API estar pronta antes de registrar Nodo VPN..."
            # Wait up to 120 seconds for the server to be up
            count=0
            API_HOST=""
            
            while [ $count -lt 60 ]; do
                # 1. Try localhost
                if curl -s -f -o /dev/null "http://127.0.0.1:3000/api/health"; then
                    echo "✅ API acessível em 127.0.0.1"
                    API_HOST="127.0.0.1"
                    break
                fi

                # 2. Try Internal IP (Container IP) - usually 172.x.x.x
                INT_IP=$(hostname -i | awk '{print $1}')
                if [ -n "$INT_IP" ] && curl -s -f -o /dev/null "http://$INT_IP:3000/api/health"; then
                     echo "✅ API acessível em $INT_IP"
                     API_HOST="$INT_IP"
                     break
                fi
                
                sleep 2
                count=$((count+1))
            done

            # Check if we broke the loop due to success or timeout
            if [ -n "$API_HOST" ]; then
                echo "✅ API está ativa! Registrando Nodo VPN $VPN_SERVER_ID em $API_HOST..."
                
                RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "http://$API_HOST:3000/api/saas/vpn-sync" \
                        -H "Content-Type: application/json" \
                        -d "{
                        \"serverId\": \"$VPN_SERVER_ID\",
                        \"secret\": \"$VPN_SERVER_SECRET\",
                        \"publicEndpoint\": \"$PUBLIC_IP\",
                        \"publicKey\": \"$PUBLIC_KEY\"
                        }")
                
                HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
                BODY=$(echo "$RESPONSE" | sed '$d')

                if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
                    echo "✅ Nodo VPN Registrado com Sucesso!"
                else
                    echo "❌ Falha ao registrar Nodo VPN. Status: $HTTP_CODE. Response: $BODY"
                fi
            else
                echo "❌ Timeout aguardando API para registrar Nodo VPN (checked http://127.0.0.1:3000/api/health and http://$INT_IP:3000/api/health)."
            fi
        ) &
    else
        echo "⚠️ VPN_SERVER_ID ou VPN_SERVER_SECRET não definidos. Pulando auto-registro."
    fi

    # 4.1 Initialize WireGuard Interface
    if ! ip link show wg0 > /dev/null 2>&1; then
        echo "🔧 Criando interface wg0..."
        ip link add dev wg0 type wireguard
        ip address add 10.255.0.1/24 dev wg0
        wg set wg0 listen-port 51820 private-key $WG_DIR/private.key
        ip link set up dev wg0
        
        # Enable IP Forwarding and NAT
        sysctl -w net.ipv4.ip_forward=1 || echo "⚠️ Falha ao habilitar ip_forward (ignorado se já ativo no host)"
        
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
