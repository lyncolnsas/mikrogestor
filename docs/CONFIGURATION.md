# 🔧 Guia de Configuração - Mikrogestor

Este documento detalha todas as configurações necessárias para executar o Mikrogestor em diferentes ambientes.

---

## 📋 Índice

1. [Variáveis de Ambiente](#variáveis-de-ambiente)
2. [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
3. [Configuração do Redis](#configuração-do-redis)
4. [Configuração de Autenticação](#configuração-de-autenticação)
5. [Configuração VPN (WireGuard)](#configuração-vpn-wireguard)
6. [Configuração RADIUS](#configuração-radius)
7. [Integração MikroTik](#integração-mikrotik)
8. [Configuração de Pagamentos](#configuração-de-pagamentos)
9. [Configuração Multi-Tenant](#configuração-multi-tenant)
10. [Configuração de Produção](#configuração-de-produção)

---

## 🌍 Variáveis de Ambiente

### Arquivo `.env`

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```bash
# Database
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=mikrogestor_secure_2026
DB_NAME=mikrogestor_prod
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}?search_path=management,public,tenant_template,radius"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# NextAuth (Autenticação)
NEXTAUTH_SECRET=your_super_secure_random_string_at_least_32_chars_here
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# VPN Settings
VPN_HOST=vpn.example.com
VPN_PUBLIC_ENDPOINT=your.public.ip.address
VPN_SERVER_ID=default-ca-sync-01
VPN_SERVER_SECRET=ca-dev-secret-2025
VPN_AUTO_REGISTER=true

# RADIUS
RADIUS_SECRET=testing123

# Asaas (Pagamentos)
ASAAS_MASTER_API_KEY=your_asaas_api_key
ASAAS_MASTER_WEBHOOK_TOKEN=your_asaas_webhook_token

# App Settings
APP_URL=http://localhost:3000
HOSTNAME=0.0.0.0
```

### Descrição das Variáveis

#### Database

| Variável        | Descrição                   | Padrão              | Obrigatório |
|-----------------|-----------------------------|--------------------|-------------|
| `DB_HOST`       | Host do PostgreSQL          | `localhost`        | ✅          |
| `DB_USER`       | Usuário do banco            | `postgres`         | ✅          |
| `DB_PASSWORD`   | Senha do banco              | -                  | ✅          |
| `DB_NAME`       | Nome do banco               | `mikrogestor_prod` | ✅          |
| `DATABASE_URL`  | URL completa de conexão     | -                  | ✅          |

#### Redis

| Variável     | Descrição       | Padrão      | Obrigatório |
|--------------|-----------------|-------------|-------------|
| `REDIS_HOST` | Host do Redis   | `localhost` | ✅          |
| `REDIS_PORT` | Porta do Redis  | `6379`      | ✅          |

#### Autenticação

| Variável              | Descrição                              | Padrão                  | Obrigatório |
|-----------------------|----------------------------------------|-------------------------|-------------|
| `NEXTAUTH_SECRET`     | Chave secreta para JWT (min 32 chars) | -                       | ✅          |
| `NEXTAUTH_URL`        | URL base da aplicação                  | `http://localhost:3000` | ✅          |
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação               | `http://localhost:3000` | ✅          |

> [!IMPORTANT]
> Gere o `NEXTAUTH_SECRET` com: `openssl rand -base64 32`

#### VPN

| Variável              | Descrição                             | Padrão                | Obrigatório |
|-----------------------|---------------------------------------|-----------------------|-------------|
| `VPN_HOST`            | Domínio ou IP público do servidor VPN | -                     | ⚠️          |
| `VPN_PUBLIC_ENDPOINT` | IP público para conexões VPN          | -                     | ⚠️          |
| `VPN_SERVER_ID`       | ID único do servidor VPN              | `default-ca-sync-01`  | ⚠️          |
| `VPN_SERVER_SECRET`   | Chave secreta do servidor VPN         | -                     | ⚠️          |
| `VPN_AUTO_REGISTER`   | Auto-registrar servidor VPN           | `false`               | ❌          |

> [!NOTE]
> As variáveis VPN são opcionais se você não usar a funcionalidade de VPN.

#### RADIUS

| Variável        | Descrição                              | Padrão       | Obrigatório |
|-----------------|----------------------------------------|--------------|-------------|
| `RADIUS_SECRET` | Shared secret para autenticação RADIUS | `testing123` | ⚠️          |

> [!WARNING]
> **NUNCA** use `testing123` em produção! Altere para um valor seguro.

#### Pagamentos

| Variável                     | Descrição                 | Padrão | Obrigatório |
|------------------------------|---------------------------|--------|-------------|
| `ASAAS_MASTER_API_KEY`       | API Key do Asaas          | -      | ⚠️          |
| `ASAAS_MASTER_WEBHOOK_TOKEN` | Token de webhook do Asaas | -      | ⚠️          |

---

## 🗄️ Configuração do Banco de Dados

### PostgreSQL

#### Instalação com Docker

```bash
docker run -d \
  --name mikrogestor-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=mikrogestor_secure_2026 \
  -e POSTGRES_DB=mikrogestor_prod \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine
```

#### Estrutura de Schemas

O Mikrogestor utiliza múltiplos schemas PostgreSQL:

- **`management`**: Dados do SaaS (tenants, planos, servidores VPN)
- **`public`**: Tabelas compartilhadas
- **`tenant_template`**: Template para novos tenants
- **`radius`**: Tabelas do FreeRADIUS
- **`tenant_<slug>`**: Schema isolado por tenant (criado dinamicamente)

#### Migrações

```bash
# Executar migrações
npx prisma migrate deploy

# Criar nova migração
npx prisma migrate dev --name nome_da_migracao

# Resetar banco (CUIDADO!)
npx prisma migrate reset
```

#### Seed (Dados Iniciais)

```bash
npm run seed
```

Isso criará:

- Super Admin (email: `admin@mikrogestor.com`, senha: `admin123`)
- Planos padrão (Free, Basic, Pro)
- Configurações iniciais

---

## 🔴 Configuração do Redis (Cache e Filas)

### Instalação do Redis com Docker

```bash
docker run -d \
  --name mikrogestor-redis \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:7-alpine
```

### Uso no Sistema

O Redis é usado para:

- **Filas (BullMQ)**: Processamento assíncrono de tarefas
- **Cache**: Sessões e dados temporários
- **Pub/Sub**: Comunicação real-time

### Testar Conexão

```bash
docker exec -it mikrogestor-redis redis-cli ping
# Resposta esperada: PONG
```

---

## 🔐 Configuração de Autenticação

### NextAuth.js

O sistema usa NextAuth.js com estratégia de credenciais customizada.

#### Gerar Secret

```bash
openssl rand -base64 32
```

Adicione o resultado em `.env`:

```bash
NEXTAUTH_SECRET=resultado_do_comando_acima
```

#### Configuração de Sessão

- **Tipo**: JWT (stateless)
- **Duração**: 30 dias
- **Refresh**: Automático

#### Roles e Permissões

| Role           | Descrição             | Acesso                               |
|----------------|-----------------------|--------------------------------------|
| `SUPER_ADMIN`  | Administrador do SaaS | Painel SaaS, todos os tenants        |
| `ISP_ADMIN`    | Dono do ISP           | Painel do ISP, todos os módulos      |
| `ISP_OPERATOR` | Operador do ISP       | Painel do ISP, módulos limitados     |
| `SUBSCRIBER`   | Cliente final         | Área do cliente                      |

---

## 🔒 Configuração VPN (WireGuard)

### Arquitetura

O Mikrogestor gerencia servidores VPN WireGuard para conectar ISPs à infraestrutura central.

### Configuração do Servidor VPN

#### 1. Detectar IP Público

```bash
curl -4 ifconfig.me
```

#### 2. Configurar Variáveis

```bash
VPN_PUBLIC_ENDPOINT=seu.ip.publico
VPN_SERVER_ID=unique-server-id
VPN_SERVER_SECRET=strong-random-secret
VPN_AUTO_REGISTER=true
```

#### 3. Estrutura de Arquivos

```text
docker/wireguard/
├── wg0.conf              # Configuração do servidor
├── server_private.key    # Chave privada do servidor
├── server_public.key     # Chave pública do servidor
└── peers/                # Configurações dos clientes
    ├── isp-1.conf
    └── isp-2.conf
```

### Configuração de Cliente (ISP)

Quando um ISP é criado, o sistema gera automaticamente:

```ini
[Interface]
PrivateKey = <chave_privada_do_isp>
Address = 10.255.0.2/24
DNS = 1.1.1.1

[Peer]
PublicKey = <chave_publica_do_servidor>
Endpoint = <VPN_PUBLIC_ENDPOINT>:51820
AllowedIPs = 10.255.0.0/24
PersistentKeepalive = 25
```

### Comandos Úteis

```bash
# Ver status do WireGuard
wg show

# Recarregar configuração
wg-quick down wg0 && wg-quick up wg0

# Ver peers conectados
wg show wg0 peers
```

---

## 📡 Configuração RADIUS

### FreeRADIUS com PostgreSQL

#### Estrutura de Tabelas

O sistema usa as tabelas padrão do FreeRADIUS:

- `radcheck`: Credenciais de usuários
- `radreply`: Atributos de resposta
- `radgroupcheck`: Grupos de autenticação
- `radgroupreply`: Atributos de grupo
- `radusergroup`: Associação usuário-grupo
- `radacct`: Contabilização de sessões
- `radpostauth`: Log de autenticações

#### Configuração de Clientes

Arquivo: `config/radius/clients.conf`

```conf
client localhost {
    ipaddr = 127.0.0.1
    secret = testing123
    require_message_authenticator = no
    nas_type = other
}

client mikrotik_nas {
    ipaddr = 192.168.1.1
    secret = your_secure_secret
    require_message_authenticator = no
    nas_type = mikrotik
}
```

#### Testar Autenticação

```bash
radtest testuser testpass localhost 0 testing123
```

Resposta esperada:

```text
Received Access-Accept
```

---

## 🌐 Integração MikroTik

### Configuração do RouterOS

#### 1. Configurar RADIUS Client

```routeros
/radius
add address=<IP_DO_SERVIDOR_RADIUS> \
    secret=<RADIUS_SECRET> \
    service=ppp,login \
    timeout=3s
```

#### 2. Configurar PPPoE Server

```routeros
/interface pppoe-server server
add authentication=radius \
    default-profile=default \
    disabled=no \
    interface=ether1 \
    service-name=mikrogestor
```

#### 3. Configurar Accounting

```routeros
/radius incoming
set accept=yes
```

### API MikroTik

O sistema usa a biblioteca `node-routeros` para comunicação via API.

#### Credenciais

Armazene as credenciais do MikroTik no banco de dados:

```typescript
{
  host: "192.168.1.1",
  port: 8728,
  username: "admin",
  password: "secure_password"
}
```

#### Comandos Suportados

- Criar/editar/deletar usuários PPPoE
- Gerenciar filas (QoS)
- Configurar rotas
- Gerenciar firewall
- Provisionamento de VPN

---

## 💳 Configuração de Pagamentos

### Asaas (Gateway de Pagamento)

#### 1. Criar Conta

Acesse [https://www.asaas.com](https://www.asaas.com) e crie uma conta.

#### 2. Obter Credenciais

- **API Key**: Configurações → Integrações → API Key
- **Webhook Token**: Configurações → Webhooks → Token

#### 3. Configurar Webhook

URL: `https://seu-dominio.com/api/webhooks/asaas`

Eventos:

- `PAYMENT_RECEIVED`
- `PAYMENT_OVERDUE`
- `PAYMENT_DELETED`

#### 4. Adicionar ao `.env`

```bash
ASAAS_MASTER_API_KEY=sua_api_key
ASAAS_MASTER_WEBHOOK_TOKEN=seu_webhook_token
```

### Fluxo de Pagamento

1. Cliente gera fatura
2. Sistema cria cobrança no Asaas
3. Cliente paga (PIX/Boleto/Cartão)
4. Asaas envia webhook
5. Sistema processa pagamento
6. Cliente é desbloqueado automaticamente

---

## 🏢 Configuração Multi-Tenant

### Arquitetura Multi-Tenant

Cada ISP (tenant) possui:

- Schema isolado no PostgreSQL (`tenant_<slug>`)
- Dados próprios (clientes, planos, faturas)
- Configurações independentes

### Criação de Tenant

```typescript
// Via API
POST /api/saas-admin/tenants
{
  "name": "ISP Exemplo",
  "slug": "isp-exemplo",
  "planId": "plan-id",
  "adminEmail": "admin@isp-exemplo.com",
  "adminPassword": "senha123"
}
```

### Contexto de Tenant

O sistema detecta o tenant automaticamente via:

1. **Subdomínio**: `isp-exemplo.mikrogestor.com`
2. **Header**: `X-Tenant-ID`
3. **Sessão**: JWT com `tenantId`

---

## 🚀 Configuração de Produção

### Checklist de Segurança

- [ ] Alterar `NEXTAUTH_SECRET`
- [ ] Alterar `DB_PASSWORD`
- [ ] Alterar `RADIUS_SECRET`
- [ ] Alterar `VPN_SERVER_SECRET`
- [ ] Configurar HTTPS (SSL/TLS)
- [ ] Configurar firewall
- [ ] Habilitar backups automáticos
- [ ] Configurar monitoramento

### Docker Compose (Produção)

Use o arquivo `docker-compose.prod.yml`:

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Variáveis de Produção

```bash
# .env.production
NODE_ENV=production
NEXTAUTH_URL=https://app.mikrogestor.com
NEXT_PUBLIC_APP_URL=https://app.mikrogestor.com
VPN_PUBLIC_ENDPOINT=<seu_ip_publico>
```

### SSL/TLS

#### Opção 1: Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name app.mikrogestor.com;

    ssl_certificate /etc/ssl/certs/mikrogestor.crt;
    ssl_certificate_key /etc/ssl/private/mikrogestor.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Opção 2: Cloudflare

Configure DNS no Cloudflare e habilite SSL/TLS (Full).

### Backup

#### Banco de Dados

```bash
# Backup manual
docker exec mikrogestor-db pg_dump -U postgres mikrogestor_prod > backup.sql

# Restaurar
docker exec -i mikrogestor-db psql -U postgres mikrogestor_prod < backup.sql
```

#### Backup Automático (Cron)

```bash
# Adicionar ao crontab
0 2 * * * docker exec mikrogestor-db pg_dump -U postgres mikrogestor_prod > /backups/mikrogestor_$(date +\%Y\%m\%d).sql
```

### Monitoramento

#### Logs

```bash
# Ver logs da aplicação
docker compose -f docker-compose.prod.yml logs -f app

# Ver logs do RADIUS
docker compose -f docker-compose.prod.yml logs -f radius
```

#### Healthcheck

```bash
# Verificar status dos serviços
docker compose -f docker-compose.prod.yml ps
```

---

## 🆘 Troubleshooting

### Erro: "Connection refused" (PostgreSQL)

```bash
# Verificar se o container está rodando
docker ps | grep mikrogestor-db

# Verificar logs
docker logs mikrogestor-db
```

### Erro: "RADIUS authentication failed"

```bash
# Verificar secret
docker exec -it mikrogestor-db psql -U postgres -d mikrogestor_prod -c "SELECT * FROM radius.radcheck;"

# Testar autenticação
radtest testuser testpass localhost 0 testing123
```

### Erro: "VPN connection timeout"

```bash
# Verificar se a porta 51820 está aberta
sudo ufw allow 51820/udp

# Verificar configuração
wg show wg0
```

---

## 📚 Referências

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [FreeRADIUS Documentation](https://freeradius.org/documentation/)
- [WireGuard Documentation](https://www.wireguard.com/quickstart/)
- [MikroTik Wiki](https://wiki.mikrotik.com/)

---

## 🔄 Atualizações

| Data       | Versão | Mudanças             |
|------------|--------|----------------------|
| 2026-02-08 | 1.0.0  | Documentação inicial |

---

> [!TIP]
> Para um guia rápido de inicialização, consulte [QUICK-START.md](../QUICK-START.md)
