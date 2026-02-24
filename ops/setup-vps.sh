#!/bin/bash

# ==============================================================================
# VPS Setup Script - Mikrogestor
# Dominio: mikrogestor.com
# OS Recomendado: Ubuntu 22.04 LTS ou 24.04 LTS
# Execute como root: sudo su - -> bash ops/setup-vps.sh (ou copie para a vps)
# ==============================================================================

set -e

DOMAIN="mikrogestor.com"
WWW_DOMAIN="www.$DOMAIN"
REPO_URL="git@github.com:lyncolnsas/mikrogestor.git"
CLONE_DIR="/opt/mikrogestor"

echo -e "\n\e[32m[1/8] Atualizando o sistema...\e[0m"
apt update && apt upgrade -y
apt install -y curl git ufw nginx certbot python3-certbot-nginx jq openssl

echo -e "\n\e[32m[2/8] Configurando Firewall (UFW)...\e[0m"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 51820/udp  # Wireguard
ufw allow 1812/udp   # Radius Auth
ufw allow 1813/udp   # Radius Acct
ufw --force enable

echo -e "\n\e[32m[3/8] Instalando Docker e Docker Compose...\e[0m"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo "Docker já instalado."
fi

echo -e "\n\e[32m[4/8] Configurando Chave SSH para o GitHub...\e[0m"
if [ ! -f ~/.ssh/id_ed25519 ]; then
    ssh-keygen -t ed25519 -C "vps-$DOMAIN" -N "" -f ~/.ssh/id_ed25519
fi

echo -e "\n================================================================="
echo -e "\e[33mCOPIE A CHAVE ABAIXO E ADICIONE NO GITHUB (Deploy Keys):\e[0m"
echo -e "Repositório: https://github.com/lyncolnsas/mikrogestor/settings/keys"
echo -e "\n"
cat ~/.ssh/id_ed25519.pub
echo -e "\n================================================================="
read -p "Aperte [ENTER] após ter adicionado a chave no GitHub para continuar..."

# Confirma que o GitHub está nos known_hosts
ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts 2>/dev/null || true

echo -e "\n\e[32m[5/8] Clonando o Repositório...\e[0m"
if [ ! -d "$CLONE_DIR" ]; then
    git clone $REPO_URL $CLONE_DIR
else
    echo "Diretório $CLONE_DIR já existe. Atualizando..."
    cd $CLONE_DIR && git pull
fi

cd $CLONE_DIR

echo -e "\n\e[32m[6/8] Configurando o .env de Produção...\e[0m"
if [ ! -f .env ]; then
    cp .env.example .env
    
    # Gera segredos seguros
    DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)
    NEXTAUTH_SEC=$(openssl rand -base64 32)
    
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASS/g" .env
    sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$NEXTAUTH_SEC/g" .env
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DOMAIN|g" .env
    sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://$DOMAIN|g" .env
    
    # Ajustando dados do banco para os que estão no docker-compose.prod.yml
    sed -i "s/DB_HOST=localhost/DB_HOST=db/g" .env
    
    echo "Arquivo .env gerado com senhas seguras."
else
    echo ".env já existe. Mantendo preservado."
fi

echo -e "\n\e[32m[7/8] Configurando Proxy Reverso (Nginx) e SSL (HTTPS)...\e[0m"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

cat <<EOF > $NGINX_CONF
server {
    listen 80;
    server_name $DOMAIN $WWW_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "Gerando certificado SSL gratuito com Certbot para $DOMAIN e $WWW_DOMAIN..."
certbot --nginx -d $DOMAIN -d $WWW_DOMAIN --non-interactive --agree-tos -m contato@$DOMAIN || echo -e "\e[31mErro no Certbot. Verifique se o IP já está apontado no Registro BR / Cloudflare.\e[0m"

echo -e "\n\e[32m[8/8] Subindo Aplicação com Docker Compose...\e[0m"
docker network prune -f
docker compose -f docker-compose.prod.yml down --remove-orphans
docker compose -f docker-compose.prod.yml up -d --build

echo -e "\n================================================================="
echo -e "\e[32mTUDO PRONTO! O Mikrogestor foi instalado e iniciado.\e[0m"
echo -e "Acesse: https://$DOMAIN"
echo -e "Pasta de Instalação: $CLONE_DIR"
echo -e "=================================================================\n"
