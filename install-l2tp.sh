#!/bin/bash
# =============================================================================
# MIKROGESTOR - Instalação L2TP/IPSec no Host Ubuntu
# Execute como root na VPS
# =============================================================================
set -e

# Auto-detect IP public
VPS_IP=$(curl -s https://api.ipify.org || wget -qO- https://api.ipify.org || curl -s https://ifconfig.me)
if [ -z "$VPS_IP" ]; then
    VPS_IP=$(ip -4 route get 8.8.8.8 | awk '{print $7}' | head -n 1)
fi
VPS_DOMAIN="mikrogestor.com"
L2TP_PSK="MikroGestorVPN2025@Secure"   # Pre-Shared Key — altere no painel
L2TP_USER="vpnuser"
L2TP_PASS="MikroGestor2025!"
L2TP_RANGE_START="192.168.100.10"
L2TP_RANGE_END="192.168.100.50"
L2TP_LOCAL_IP="192.168.100.1"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        INSTALANDO L2TP/IPSec - VPS MIKROGESTOR      ║"
echo "╚══════════════════════════════════════════════════════╝"

# ─────────────────────────────────────────────
# ETAPA 1: INSTALAR DEPENDÊNCIAS
# ─────────────────────────────────────────────
echo ""
echo "[1/7] Instalando strongSwan + xl2tpd + ppp..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq strongswan strongswan-pki libcharon-extra-plugins xl2tpd ppp

echo "✅ Pacotes instalados!"

# ─────────────────────────────────────────────
# ETAPA 2: CONFIGURAR IPSEC (strongSwan)
# ─────────────────────────────────────────────
echo ""
echo "[2/7] Configurando IPSec (strongSwan)..."

cat > /etc/ipsec.conf << IPSECEOF
config setup
    charondebug="ike 1, knl 1, cfg 0"
    uniqueids=no

conn L2TP-PSK-NAT
    rightsubnet=vhost:%priv
    also=L2TP-PSK-noNAT

conn L2TP-PSK-noNAT
    authby=secret
    pfs=no
    auto=add
    keyingtries=3
    rekey=no
    ikelifetime=8h
    keylife=1h
    type=transport
    left=${VPS_IP}
    leftprotoport=17/1701
    right=%any
    rightprotoport=17/%any
    dpddelay=30
    dpdtimeout=120
    dpdaction=clear
IPSECEOF

cat > /etc/ipsec.secrets << SECRETEOF
# Pre-Shared Key para L2TP/IPSec
# IP_SERVIDOR %any : PSK "CHAVE_AQUI"
${VPS_IP} %any : PSK "${L2TP_PSK}"
SECRETEOF

echo "✅ IPSec configurado!"

# ─────────────────────────────────────────────
# ETAPA 3: CONFIGURAR XL2TPD
# ─────────────────────────────────────────────
echo ""
echo "[3/7] Configurando xl2tpd..."

mkdir -p /etc/xl2tpd
cat > /etc/xl2tpd/xl2tpd.conf << XLEOF
[global]
ipsec saref = yes
saref refinfo = 30

[lns default]
ip range = ${L2TP_RANGE_START}-${L2TP_RANGE_END}
local ip = ${L2TP_LOCAL_IP}
require chap = yes
refuse pap = yes
require authentication = yes
name = l2tpd
ppp debug = yes
pppoptfile = /etc/ppp/options.xl2tpd
length bit = yes
XLEOF

echo "✅ xl2tpd configurado!"

# ─────────────────────────────────────────────
# ETAPA 4: CONFIGURAR PPP
# ─────────────────────────────────────────────
echo ""
echo "[4/7] Configurando PPP..."

mkdir -p /etc/ppp
cat > /etc/ppp/options.xl2tpd << PPPEOF
ipcp-accept-local
ipcp-accept-remote
ms-dns 8.8.8.8
ms-dns 8.8.4.4
noccp
auth
crtscts
idle 1800
mtu 1280
mru 1280
nodefaultroute
debug
lock
proxyarp
connect-delay 5000
PPPEOF

# Arquivo de senhas PPP (chap-secrets)
# Formato: usuario  servidor  senha  ip_permitido
cat >> /etc/ppp/chap-secrets << CHAPEOF

# Mikrogestor L2TP Users
${L2TP_USER}  l2tpd  ${L2TP_PASS}  *
CHAPEOF

echo "✅ PPP configurado!"

# ─────────────────────────────────────────────
# ETAPA 5: HABILITAR IP FORWARDING
# ─────────────────────────────────────────────
echo ""
echo "[5/7] Habilitando IP Forwarding..."

# Configura persistentemente
cat >> /etc/sysctl.conf << SYSEOF

# Mikrogestor VPN - IP Forwarding
net.ipv4.ip_forward = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.rp_filter = 0
net.ipv4.conf.all.rp_filter = 0
SYSEOF

sysctl -p 2>/dev/null || true

# Aplica imediatamente
echo 1 > /proc/sys/net/ipv4/ip_forward

# Regras de NAT (iptables)
MAIN_IFACE=$(ip route | grep default | awk '{print $5}' | head -1)
echo "Interface principal: $MAIN_IFACE"

iptables -t nat -A POSTROUTING -s 192.168.100.0/24 -o "$MAIN_IFACE" -j MASQUERADE 2>/dev/null || true
iptables -A FORWARD -s 192.168.100.0/24 -j ACCEPT 2>/dev/null || true
iptables -A FORWARD -d 192.168.100.0/24 -j ACCEPT 2>/dev/null || true

# Salva regras iptables
apt-get install -y -qq iptables-persistent 2>/dev/null || true
iptables-save > /etc/iptables/rules.v4 2>/dev/null || true

echo "✅ IP Forwarding habilitado!"

# ─────────────────────────────────────────────
# ETAPA 6: ABRIR FIREWALL (UFW)
# ─────────────────────────────────────────────
echo ""
echo "[6/7] Configurando Firewall (UFW)..."

# Verifica se UFW está ativo
if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
    ufw allow 500/udp comment "IPSec IKE"
    ufw allow 4500/udp comment "IPSec NAT-T"
    ufw allow 1701/udp comment "L2TP"
    ufw allow 1194/udp comment "OpenVPN (futuro)"
    ufw reload
    echo "✅ UFW atualizado!"
else
    echo "ℹ️  UFW não está ativo. Verificando iptables..."
    # Garante que as portas estão acessíveis via iptables
    iptables -A INPUT -p udp --dport 500 -j ACCEPT
    iptables -A INPUT -p udp --dport 4500 -j ACCEPT
    iptables -A INPUT -p udp --dport 1701 -j ACCEPT
    echo "✅ Portas abertas via iptables!"
fi

# ─────────────────────────────────────────────
# ETAPA 7: INICIAR SERVIÇOS
# ─────────────────────────────────────────────
echo ""
echo "[7/7] Iniciando serviços..."

# Para qualquer instância anterior
systemctl stop strongswan-starter xl2tpd 2>/dev/null || true
systemctl stop ipsec 2>/dev/null || true

# Inicia IPSec
systemctl enable strongswan-starter 2>/dev/null || systemctl enable ipsec 2>/dev/null || true
systemctl start strongswan-starter 2>/dev/null || systemctl start ipsec 2>/dev/null || true
sleep 3

# Inicia L2TP
systemctl enable xl2tpd
systemctl start xl2tpd
sleep 3

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║              VERIFICAÇÃO FINAL                       ║"
echo "╚══════════════════════════════════════════════════════╝"

echo ""
echo "--- Status IPSec (strongSwan) ---"
systemctl status strongswan-starter 2>/dev/null | grep -E "Active|Loaded" || \
systemctl status ipsec 2>/dev/null | grep -E "Active|Loaded" || echo "Verificar manualmente"

echo ""
echo "--- Status xl2tpd ---"
systemctl status xl2tpd | grep -E "Active|Loaded"

echo ""
echo "--- Portas escutando ---"
ss -ulnp | grep -E '500|4500|1701'

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ L2TP/IPSec INSTALADO!                           ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Servidor: ${VPS_IP}                       ║"
echo "║  PSK: ${L2TP_PSK}     ║"
echo "║  Usuário: ${L2TP_USER}                             ║"
echo "║  Senha: ${L2TP_PASS}                     ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Para adicionar usuários MikroTik:                   ║"
echo "║  Editar /etc/ppp/chap-secrets                        ║"
echo "╚══════════════════════════════════════════════════════╝"
