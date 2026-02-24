"use server"

import { protectedAction } from "@/lib/api/action-wrapper";
import { prisma } from "@/lib/prisma";

/**
 * Generates a full bash setup script for a remote Linux VPN node.
 */
export const getVpnServerSetupScript = protectedAction(
    ["SUPER_ADMIN"],
    async (serverId: string) => {
        const server = await prisma.vpnServer.findUnique({
            where: { id: serverId }
        });

        if (!server) throw new Error("Servidor não encontrado");

        const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        // Bypassing stale type for 'secret'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const syncUrl = `${apiUrl}/api/saas/vpn-sync?serverId=${server.id}&secret=${(server as any).secret}`;

        const script = `#!/bin/bash
# ==============================================================================
# SCRIPT DE CONFIGURAÇÃO DO NODO VPN MIKROGESTOR
# Servidor: ${server.name}
# ==============================================================================

# 1. Instalar WireGuard
echo "[Config] Instalando WireGuard..."
apt-get update && apt-get install -y wireguard curl jq

# 2. Geração de Chaves e Registro
WG_DIR="/etc/wireguard"
mkdir -p $WG_DIR
chmod 700 $WG_DIR

if [ ! -f "$WG_DIR/private.key" ]; then
    echo "[Config] Gerando novo par de chaves..."
    wg genkey | tee $WG_DIR/private.key | wg pubkey > $WG_DIR/public.key
fi

PRIV_KEY=$(cat $WG_DIR/private.key)
PUB_KEY=$(cat $WG_DIR/public.key)
PUBLIC_IP=$(curl -s https://ifconfig.me)

echo "[Config] Reportando detalhes do servidor ao painel..."
curl -X POST "${apiUrl}/api/saas/vpn-sync" \\
     -H "Content-Type: application/json" \\
     -d "{
        \\"serverId\\": \\"${server.id}\\",
        \\"secret\\": \\"${(server as { secret: string }).secret}\\",
        \\"publicEndpoint\\": \\"$PUBLIC_IP\\",
        \\"publicKey\\": \\"$PUB_KEY\\"
     }"

# 3. Criar Script de Sincronização COM MONITORAMENTO
cat << 'EOF' > /usr/local/bin/wg-sync.sh
#!/bin/bash
SYNC_URL="${syncUrl}"
STATUS_URL="${apiUrl}/api/saas/vpn-status"
SERVER_ID="${server.id}"
SECRET="${(server as any).secret}"

CONFIG_PATH="/etc/wireguard/wg0.conf"
PRIV_KEY_PATH="/etc/wireguard/private.key"

if [ ! -f "$PRIV_KEY_PATH" ]; then
    echo "Chave privada não encontrada"
    exit 1
fi

# ==============================================================================
# FASE 1: REPORTAR STATUS (ESTATISTICAS)
# ==============================================================================
echo "[$(date)] Coletando Estatísticas da VPN..."

# 1. ESTATÍSTICAS DOS PEERS (WireGuard Dump)
# Get generic dump: public_key, preshared_key, endpoint, allowed_ips, latest_handshake, transfer_rx, transfer_tx, persistent_keepalive
# We care about: $1(pub), $5(handshake), $6(rx), $7(tx)
STATS_JSON=$(wg show wg0 dump | tail -n +2 | awk '{
    printf "{\"publicKey\":\"%s\",\"handshake\":%s,\"rx\":%s,\"tx\":%s},", $1, $5, $6, $7
}' | sed '$s/,$//')

# 2. ESTATÍSTICAS DO SISTEMA (CPU, RAM, DISCO)
# CPU Load (Last 1 min avg * 10 or just use top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}')
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}')

# RAM (Total/Used in Bytes)
MEM_TOTAL=$(free -b | grep Mem | awk '{print $2}')
MEM_USED=$(free -b | grep Mem | awk '{print $3}')

# DISK (Root /)
DISK_TOTAL=$(df -B1 / | tail -1 | awk '{print $2}')
DISK_USED=$(df -B1 / | tail -1 | awk '{print $3}')

# Wrap in array
STATS_PAYLOAD="{\"serverId\":\"$SERVER_ID\",\"secret\":\"$SECRET\",\"peers\":[$STATS_JSON],\"system\":{\"cpu\":$CPU_USAGE,\"memory\":{\"total\":$MEM_TOTAL,\"used\":$MEM_USED},\"disk\":{\"total\":$DISK_TOTAL,\"used\":$DISK_USED}}}"

# Send to API (Timeout 5s to not block sync)
curl -s --connect-timeout 5 -X POST "$STATUS_URL" \
     -H "Content-Type: application/json" \
     -d "$STATS_PAYLOAD" > /dev/null

# ==============================================================================
# FASE 2: SINCRONIZAR PEERS (CONFIGURAÇÃO)
# ==============================================================================
echo "[$(date)] Sincronizando Peers VPN..."

# Detectar IP Público atual para reportar ao painel
CURRENT_IP=$(curl -s --connect-timeout 5 https://ifconfig.me)
PUB_KEY_LOCAL=$(cat /etc/wireguard/public.key)

# Reportar IP e Chave ao Sincronizar (Garante que o painel tenha o IP atualizado se houver mudança)
if [ ! -z "$CURRENT_IP" ]; then
    echo "[$(date)] Reportando IP Atual: $CURRENT_IP"
    curl -s -X POST "${apiUrl}/api/saas/vpn-sync" \
         -H "Content-Type: application/json" \
         -d "{\"serverId\":\"$SERVER_ID\",\"secret\":\"$SECRET\",\"publicEndpoint\":\"$CURRENT_IP\",\"publicKey\":\"$PUB_KEY_LOCAL\"}" > /dev/null
fi

DATA=$(curl -s "$SYNC_URL")


if [ $? -ne 0 ] || [ -z "$DATA" ]; then
    echo "Erro ao buscar dados"
    exit 1
fi

# Sincronização automática da Chave Privada do Servidor
NEW_PRIV_KEY=$(echo "$DATA" | jq -r '.serverPrivateKey // empty')
if [ ! -z "$NEW_PRIV_KEY" ] && [ "$NEW_PRIV_KEY" != "null" ]; then
    CURRENT_PRIV_KEY=$(cat $PRIV_KEY_PATH)
    if [ "$NEW_PRIV_KEY" != "$CURRENT_PRIV_KEY" ]; then
        echo "[$(date)] Detectada nova Chave Privada. Atualizando..."
        echo "$NEW_PRIV_KEY" > $PRIV_KEY_PATH
        chmod 600 $PRIV_KEY_PATH
        RESTART_REQUIRED=true
    fi
fi

# Gerar wg0.conf
cat << CONFIG > $CONFIG_PATH
[Interface]
PrivateKey = $(cat $PRIV_KEY_PATH)
ListenPort = $(echo $DATA | jq -r .listenPort)

# Peers
CONFIG

echo "$DATA" | jq -c '.peers[]' | while read peer; do
    PUB=$(echo $peer | jq -r .publicKey)
    IPS=$(echo $peer | jq -r .allowedIps)
    cat << PEER >> $CONFIG_PATH

[Peer]
# Tenant: $(echo $peer | jq -r .tenant)
PublicKey = $PUB
AllowedIPs = $IPS
PEER
done

# Aplicar Configuração
if [ "$RESTART_REQUIRED" = true ]; then
    echo "[$(date)] Reiniciando interface para aplicar nova chave..."
    wg-quick down wg0 2>/dev/null
    wg-quick up wg0 2>/dev/null || (wg syncconf wg0 <(wg-quick strip wg0))
else
    wg syncconf wg0 <(wg-quick strip wg0)
fi
echo "[$(date)] Sincronização completa."

EOF

chmod +x /usr/local/bin/wg-sync.sh

# 4. Configuração Inicial e Interface UP
/usr/local/bin/wg-sync.sh
wg-quick up wg0 2>/dev/null || wg-quick restart wg0

# 5. Configurar Cron (A cada minuto)
(crontab -l 2>/dev/null | grep -v "wg-sync.sh"; echo "* * * * * /usr/local/bin/wg-sync.sh >> /var/log/wg-sync.log 2>&1") | crontab -

echo "=============================================================================="
echo "CONFIGURAÇÃO CONCLUÍDA!"
echo "O servidor está agora ativo e sincronizado com o painel."
echo "IP Público: $PUBLIC_IP"
echo "Chave Pública: $PUB_KEY"
echo "=============================================================================="
`;

        return script;
    }
);
