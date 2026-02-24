# Manifesto de Deploy: Production v1.0
>
> **Data:** 01/02/2026
> **Responsável:** DevOps Agent
> **Tipo:** Major Release

## 1. Pré-requisitos

- [ ] Backup do Banco de Dados realizado? (PostgreSQL Full Dump)
- [ ] Variáveis de Ambiente (`.env.production`) configuradas?
- [ ] Certificados SSL (LetsEncrypt) válidos e configurados no Nginx?
- [ ] Domínios DNS apontados corretamente (`app.mikrogestor.com`, `isp.mikrogestor.com`)?

## 2. Artefatos Gerados

### Docker Compose (Snippet)

Salve este conteúdo como `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # -----------------------------------------------------------------------------
  # APP CORE (Next.js)
  # -----------------------------------------------------------------------------
  app:
    image: mikrogestor/core:v1.0.0
    container_name: mikrogestor_app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # -----------------------------------------------------------------------------
  # DATABASE (PostgreSQL)
  # -----------------------------------------------------------------------------
  postgres:
    image: postgres:16-alpine
    container_name: mikrogestor_db
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: mikrogestor_prod
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d mikrogestor_prod"]
      interval: 10s
      timeout: 5s
      retries: 5

  # -----------------------------------------------------------------------------
  # CACHE & QUEUE (Redis)
  # -----------------------------------------------------------------------------
  redis:
    image: redis:7-alpine
    container_name: mikrogestor_redis
    restart: always
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - ./data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # -----------------------------------------------------------------------------
  # RADIUS SERVER (FreeRADIUS)
  # -----------------------------------------------------------------------------
  radius:
    image: freeradius/freeradius-server:latest-alpine
    container_name: mikrogestor_radius
    restart: always
    ports:
      - "1812:1812/udp"
      - "1813:1813/udp"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=${DB_USER}
      - DB_PASS=${DB_PASSWORD}
      - DB_NAME=mikrogestor_prod
    depends_on:
      - postgres
    volumes:
      - ./config/radius/clients.conf:/etc/raddb/clients.conf
      - ./config/radius/mods-enabled/sql:/etc/raddb/mods-enabled/sql

  # -----------------------------------------------------------------------------
  # VPN SERVER (WireGuard)
  # -----------------------------------------------------------------------------
  wireguard:
    image: linuxserver/wireguard:latest
    container_name: mikrogestor_vpn
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    ports:
      - "51820:51820/udp"
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/Sao_Paulo
      - SERVERURL=${VPN_HOST}
      - SERVERPORT=51820
      - PEERS=10 # Número inicial de peers
      - PEERDNS=auto
    volumes:
      - ./config/wireguard:/config
      - /lib/modules:/lib/modules
    sysctls:
      - net.ipv4.conf.all.src_valid_mark=1
```

### Script de Execução (Deploy)

```bash
#!/bin/bash
set -e

echo "🚀 Iniciando Deploy para Produção v1.0..."

# 1. Pull das imagens mais recentes
echo "⬇️ Baixando imagens..."
docker compose -f docker-compose.prod.yml pull

# 2. Migração do Banco (CRÍTICO)
echo "📦 Executando migrações do Prisma..."
# Usamos o container app para rodar a migração, pois ele já tem o Prisma instalado
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy

# 3. Seed de Dados Críticos (Opcional - apenas se necessário na prod)
# docker compose -f docker-compose.prod.yml run --rm app npx prisma db seed

# 4. Reinício dos Containers (Rolling update se estiver em Swarm, aqui recreate)
echo "🔄 Recriando containers..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans --force-recreate

echo "✅ Deploy concluído com sucesso!"
```

## 3. Plano de Rollback (Plano B)

Caso o deploy falhe ou apresente erros críticos pós-deploy, execute os passos abaixo imediatamente:

1. **Reverter Imagem Docker:**

    ```bash
    # Volta para a tag anterior (ex: v0.9.9)
    sed -i 's/mikrogestor\/core:v1.0.0/mikrogestor\/core:v0.9.9/g' docker-compose.prod.yml
    docker compose -f docker-compose.prod.yml up -d
    ```

2. **Restaurar Banco de Dados (Se houve corrupção de dados na migração):**

    ```bash
    # Parar aplicação para evitar escritas
    docker compose stop app
    # Restaurar dump (assumindo que backup.sql existe)
    cat backup.sql | docker exec -i mikrogestor_db psql -U ${DB_USER} -d mikrogestor_prod
    docker compose start app
    ```

## 4. Checklist de Validação Pós-Deploy

- [ ] **Login no Painel Admin:** Acessar `app.mikrogestor.com`, logar e navegar entre abas.
- [ ] **Teste de Conexão Radius:**
  - Usar `radtest teste 123456 localhost 0 testing123` de dentro do container ou servidor externo.
  - Confirmar que o log do Radius mostra `Access-Accept`.
- [ ] **Webhook de Pagamento (Simulação):**
  - Enviar um POST falso para `/api/webhooks/asaas` e verificar se o sistema processa sem erro 500.
- [ ] **VPN Ping:**
  - Verificar se o container WireGuard subiu e se é possível pingar o IP interno do túnel.
