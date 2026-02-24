# 🚀 GUIA RÁPIDO - Executar Mikrogestor Localmente

## ⚠️ Problema Atual

A aplicação Docker está com erro de conexão ao banco de dados (`ECONNREFUSED`), mesmo com:

- ✅ PostgreSQL rodando e saudável
- ✅ Redis rodando e saudável
- ✅ DATABASE_URL correto
- ✅ Schema do banco criado
- ✅ Usuário admin criado

## ✅ SOLUÇÃO: Rodar Localmente

### Passo 1: Parar Containers (Manter apenas DB e Redis)

```bash
docker compose -f docker-compose.prod.yml stop app radius vpn
```

### Passo 2: Instalar Dependências

```bash
npm install
```

### Passo 3: Gerar Prisma Client

```bash
npx prisma generate
```

### Passo 4: Rodar em Desenvolvimento

```bash
npm run dev
```

### Passo 5: Acessar Sistema

Abra o navegador em: **<http://localhost:3000>**

## 🔐 CREDENCIAIS DE LOGIN

```
Email: admin@mikrogestor.com
Senha: admin123
Role: SUPER_ADMIN
```

## 📊 Status dos Serviços

| Serviço | Como Rodar | Status |
|---------|------------|--------|
| **PostgreSQL** | Docker | ✅ Porta 5432 |
| **Redis** | Docker | ✅ Porta 6379 |
| **Aplicação** | **Local (npm run dev)** | ⚠️ Use este! |
| RADIUS | Docker (opcional) | ❌ Desligado |
| VPN | Docker (opcional) | ❌ Desligado |

## 🔧 Variáveis de Ambiente

O arquivo `.env` já está configurado corretamente:

```env
# DATABASE
DB_USER=postgres
DB_PASSWORD=mikrogestor_secure_2026
DB_NAME=mikrogestor_prod
DATABASE_URL=postgresql://postgres:mikrogestor_secure_2026@localhost:5432/mikrogestor_prod?schema=management&search_path=management,tenant_template,radius

# NEXTAUTH
NEXTAUTH_SECRET=change-this-to-a-random-secret-key-min-32-chars-please
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# REDIS
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 🎯 Comandos Úteis

### Verificar Banco de Dados

```bash
docker exec mikrogestor_db psql -U postgres -d mikrogestor_prod -c "\dt"
```

### Ver Usuários Criados

```bash
docker exec mikrogestor_db psql -U postgres -d mikrogestor_prod -c "SELECT email, name, role FROM users;"
```

### Logs do PostgreSQL

```bash
docker logs mikrogestor_db --tail 50
```

### Logs do Redis

```bash
docker logs mikrogestor_redis --tail 50
```

## 🐛 Troubleshooting

### Erro: "Cannot find module '@prisma/client'"

```bash
npx prisma generate
```

### Erro: "Port 3000 already in use"

```bash
# Parar a aplicação Docker
docker compose -f docker-compose.prod.yml stop app

# Ou usar outra porta
PORT=3001 npm run dev
```

### Erro: "Can't reach database server"

```bash
# Verificar se PostgreSQL está rodando
docker ps | findstr mikrogestor_db

# Verificar conexão
docker exec mikrogestor_db pg_isready -U postgres
```

## 📝 Próximos Passos Após Login

1. **Explorar o Dashboard**
   - Acesse as configurações
   - Veja métricas do sistema

2. **Criar Primeiro Tenant (Provedor)**
   - Menu: Tenants → Novo Tenant
   - Preencha os dados do provedor

3. **Configurar RADIUS (Opcional)**
   - Primeiro, corrija o container RADIUS
   - Execute: `init-radius.bat`

4. **Configurar VPN (Opcional)**
   - Inicie o container VPN
   - Configure peers

## ⚡ Script de Inicialização Rápida

Crie um arquivo `start-local.bat`:

```batch
@echo off
echo ========================================
echo   MIKROGESTOR - Inicialização Local
echo ========================================
echo.

echo [1/4] Parando containers desnecessários...
docker compose -f docker-compose.prod.yml stop app radius vpn

echo.
echo [2/4] Verificando banco de dados...
docker exec mikrogestor_db pg_isready -U postgres

echo.
echo [3/4] Gerando Prisma Client...
call npx prisma generate

echo.
echo [4/4] Iniciando aplicação...
echo.
echo ========================================
echo   Acesse: http://localhost:3000
echo   Email: admin@mikrogestor.com
echo   Senha: admin123
echo ========================================
echo.

call npm run dev
```

Depois execute:

```bash
start-local.bat
```

## 🎉 Pronto

Agora você tem:

- ✅ PostgreSQL rodando no Docker
- ✅ Redis rodando no Docker
- ✅ Aplicação rodando localmente
- ✅ Usuário admin criado
- ✅ Sistema funcional

**Acesse <http://localhost:3000> e faça login!** 🚀
