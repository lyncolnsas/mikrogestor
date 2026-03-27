#!/bin/bash

# ============================================================================
# MIKROGESTOR NETWORK - Instalador Pro Max (VPS Ubuntu + SSL + Nginx)
# ============================================================================

set -e

echo "🚀 Iniciando Implantação Automatizada do Mikrogestor Network..."

# 1. Solicitar Informações Críticas (ou usar argumentos se fornecidos)
echo "--------------------------------------------------------"
DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ]; then
    read -p "🌐 Digite o seu DOMÍNIO (ex: painel.meuprovedor.com.br): " DOMAIN
fi

if [ -z "$DOMAIN" ]; then
    echo "❌ Erro: O domínio ou IP é obrigatório para a configuração de rede."
    exit 1
fi

if [ -z "$EMAIL" ]; then
    if [ ! -t 0 ]; then
        EMAIL="admin@$DOMAIN" # Não-interativo: usar padrão
    else
        read -p "📧 Digite o seu E-MAIL para SSL (Let's Encrypt): " EMAIL
    fi
fi

if [ -z "$EMAIL" ]; then
    EMAIL="admin@$DOMAIN"
    echo "ℹ️  Usando e-mail padrão: $EMAIL"
fi
echo "--------------------------------------------------------"

# 2. Atualizar Sistema e Dependências
echo "📦 Atualizando pacotes do sistema..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y git docker.io docker-compose-v2 nginx certbot python3-certbot-nginx ufw

# 3. Configurar Firewall (UFW)
echo "🛡️  Configurando Firewall (UFW)..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 1812/udp
sudo ufw allow 1813/udp
sudo ufw allow 51820/udp
echo "y" | sudo ufw enable

# 4. Clonar Repositório
if [ ! -d "mikrogestor" ]; then
    echo "📂 Clonando repositório do GitHub..."
    git clone https://github.com/lyncolnsas/mikrogestor.git
    cd mikrogestor
else
    cd mikrogestor
    git pull origin main
fi

# 5. Configurar .env com Domínio Real
echo "📝 Configurando ambiente com o domínio $DOMAIN..."
if [ ! -f ".env" ]; then
    cp .env.example .env
fi

# Gerar Segredos e Atualizar URLs
SECRET=$(openssl rand -base64 32)
sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$SECRET|g" .env
sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DOMAIN|g" .env
sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://$DOMAIN|g" .env
sed -i "s|NODE_ENV=.*|NODE_ENV=production|g" .env

# 6. Configurar Nginx (Proxy Reverso)
echo "🌐 Configurando Nginx para $DOMAIN..."
cat <<EOF > /etc/nginx/sites-available/mikrogestor
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Otimização de Buffers para RADIUS API
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
}
EOF

ln -sf /etc/nginx/sites-available/mikrogestor /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 7. Configurar Let's Encrypt (SSL Grátis)
if [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "⚠️  AVISO: O SSL (Let's Encrypt) não pode ser gerado para endereços IP ($DOMAIN)."
    echo "Sugestão: Aponte um domínio (ex: painel.meuprovedor.com) para este IP."
else
    echo "🔐 Solicitando Certificado SSL Let's Encrypt para $DOMAIN..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect
fi

# 8. Subir Infraestrutura Docker
echo "🏗️  Construindo Containers (Docker Compose)..."
sudo docker compose -f docker-compose.prod.yml up -d --build

# 9. Inicializar Banco de Dados
echo "🗄️  Sincronizando Banco de Dados (Prisma)..."
echo "Aguardando inicialização do Postgres (20s)..."
sleep 20
sudo docker exec -it mikrogestor_app npx prisma db push

echo "--------------------------------------------------------"
echo "✅ IMPLANTAÇÃO PRO MAX CONCLUÍDA!"
echo "--------------------------------------------------------"
echo "🌎 URL: https://$DOMAIN"
echo "🛡️  SSL: Ativo (Renovação Automática)"
echo "📡 RADIUS/VPN: Prontos para conexões"
echo "--------------------------------------------------------"
echo "Dica: docker compose -f docker-compose.prod.yml logs -f app"
