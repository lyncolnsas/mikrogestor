#!/bin/bash
# =============================================================================
# MIKROGESTOR - Nuke & Reinstall (Reset Total da VPS)
# AVISO: ISSO APAGARÁ TODO O BANCO DE DADOS, CONTAINERS E CONFIGURAÇÕES!
# =============================================================================

echo "⚠️  ATENÇÃO: Este script vai APAGAR COMPLETAMENTE todas as configurações, banco de dados e arquivos do Mikrogestor!"
echo "Isso inclui todas as senhas, registros de clientes e conexões."
read -p "Você tem CERTEZA absoluta? Digite 'SIM' para continuar: " CONFIRM

if [ "$CONFIRM" != "SIM" ]; then
    echo "❌ Operação cancelada pelo usuário. Nada foi alterado."
    exit 0
fi

set -x

echo "🔥 [1/5] Destruindo containers Docker e bancos de dados em execução..."
if command -v docker &> /dev/null; then
    # Parar os containers do diretório se existir
    if [ -d "/opt/mikrogestor" ]; then
        cd /opt/mikrogestor && docker compose down -v --remove-orphans || true
    fi
    
    # Parada brusca geral
    docker stop $(docker ps -aq) 2>/dev/null || true
    docker rm -f $(docker ps -aq) 2>/dev/null || true
    docker network prune -f 2>/dev/null || true
    docker volume prune -a -f 2>/dev/null || true
    docker rmi -f $(docker images -q) 2>/dev/null || true
    docker system prune -a -f --volumes 2>/dev/null || true
fi

echo "🗑️  [2/5] Removendo arquivos de arquitetura base (/opt/mikrogestor)..."
rm -rf /opt/mikrogestor
rm -rf ~/mikrogestor*
rm -rf /etc/wireguard

echo "🧹 [3/5] Desinstalando TODOS os pacotes, VPN, Docker e Nginx (Limpeza Extrema)..."
apt-get purge -y xl2tpd strongswan libcharon-extra-plugins 2>/dev/null || true
apt-get purge -y docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc nginx certbot python3-certbot-nginx 2>/dev/null || true
apt-get autoremove --purge -y
apt-get clean
rm -rf /etc/ipsec.* /etc/ppp/* /etc/xl2tpd/xl2tpd.conf 2>/dev/null || true

echo "🌐 [4/5] Limpando Rastros de Sistema e Certificados SSL..."
rm -rf /etc/nginx /etc/letsencrypt /var/lib/docker /var/lib/containerd /var/log/nginx /var/log/letsencrypt 2>/dev/null || true
systemctl daemon-reload


set +x

echo ""
echo "✅ [5/5] Servidor foi completamente desinfetado e os dados destruídos!"
echo "🧹 Preparando terreno para uma instalação 'zero milhas'..."
echo "-------------------------------------------------------------------"
sleep 3

# Baixar e Iniciar o instalador principal atualizado
cd ~
rm -f setup-vps.sh
curl -O https://raw.githubusercontent.com/lyncolnsas/mikrogestor/main/setup-vps.sh
chmod +x setup-vps.sh

echo "🚀 Iniciando Instalação Limpa do Servidor..."
bash setup-vps.sh
