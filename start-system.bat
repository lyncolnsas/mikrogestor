@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================================
:: MIKROGESTOR - Sistema Completo (App + Radius + VPN)
:: ============================================================================
:: Script de inicialização para Windows
:: Gerencia: PostgreSQL, Redis, App, FreeRADIUS, WireGuard VPN
:: ============================================================================

title Mikrogestor - Inicialização do Sistema

:: Cores para output
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "RESET=[0m"

echo.
echo %BLUE%╔════════════════════════════════════════════════════════════════╗%RESET%
echo %BLUE%║          MIKROGESTOR - SISTEMA COMPLETO                        ║%RESET%
echo %BLUE%║          Radius + VPN + App + Database                         ║%RESET%
echo %BLUE%╚════════════════════════════════════════════════════════════════╝%RESET%
echo.

:: Checkpoint inicial para debug


:: ============================================================================
:: 1. PRÉ-REQUISITOS
:: ============================================================================
echo %YELLOW%[1/7] Verificando pré-requisitos...%RESET%

:: Verifica Docker
docker --version >nul 2>&1
if !errorlevel! neq 0 (
    echo %RED%✗ Docker não encontrado! Instale o Docker Desktop.%RESET%
    pause
    exit /b 1
)
echo %GREEN%✓ Docker instalado%RESET%


:: Verifica Docker Compose
docker compose version >nul 2>&1
if !errorlevel! neq 0 (
    echo %RED%✗ Docker Compose não encontrado!%RESET%
    pause
    exit /b 1
)
echo %GREEN%✓ Docker Compose instalado%RESET%


:: ============================================================================
:: 2. VERIFICAÇÃO DE ARQUIVO .ENV
:: ============================================================================
echo.
echo %YELLOW%[2/7] Verificando configuração de ambiente...%RESET%

if not exist ".env" (
    echo %YELLOW%! Arquivo .env não encontrado. Criando arquivo padrão...%RESET%
    call :create_env_file
    echo %GREEN%✓ Arquivo .env criado. EDITE AS CREDENCIAIS antes de continuar!%RESET%
    echo.
    echo %RED%ATENÇÃO: Edite o arquivo .env com suas credenciais reais.%RESET%
    echo Pressione qualquer tecla para continuar...
    pause >nul
)
echo %GREEN%✓ Arquivo .env encontrado%RESET%


:: Migração automática de postgres para db se necessário

findstr /C:"@postgres:5432" .env >nul
if !errorlevel! neq 0 goto skip_env_update

echo %YELLOW%! Atualizando host do banco de dados no .env (postgres -> db)...%RESET%

powershell -Command "(gc .env) -replace '@postgres:5432', '@db:5432' | Out-File -encoding ASCII .env"
powershell -Command "(gc .env) -replace 'DB_HOST=postgres', 'DB_HOST=db' | Out-File -encoding ASCII .env"

:skip_env_update


:: ============================================================================
:: 3. CRIAÇÃO DE DIRETÓRIOS NECESSÁRIOS
:: ============================================================================
echo.
echo %YELLOW%[3/7] Criando estrutura de diretórios...%RESET%

:: Diretórios de dados
if not exist "data\postgres" mkdir "data\postgres"
if not exist "data\redis" mkdir "data\redis"

:: Diretórios de configuração
if not exist "config\radius" mkdir "config\radius"
if not exist "config\wireguard" mkdir "config\wireguard"

echo %GREEN%✓ Diretórios criados%RESET%
echo %GREEN%✓ Diretórios criados%RESET%

:: ============================================================================
:: 4. CRIAÇÃO DE ARQUIVOS DE CONFIGURAÇÃO DO RADIUS
:: ============================================================================
echo.
echo %YELLOW%[4/7] Configurando FreeRADIUS...%RESET%

if not exist "config\radius\clients.conf" (
    call :create_radius_clients
    echo %GREEN%✓ Arquivo clients.conf criado%RESET%
) else (
    echo %GREEN%✓ Arquivo clients.conf já existe%RESET%
)

if not exist "config\radius\mods-enabled" mkdir "config\radius\mods-enabled"
if not exist "config\radius\mods-enabled\sql" (
    call :create_radius_sql
    echo %GREEN%✓ Configuração SQL do Radius criada%RESET%
) else (
    echo %GREEN%✓ Configuração SQL do Radius já existe%RESET%
)


:: ============================================================================
:: 5. PARAR CONTAINERS ANTIGOS (SE EXISTIREM)
:: ============================================================================
echo.
echo %YELLOW%[5/7] Parando containers antigos...%RESET%

:: Tenta parar tanto os containers de dev quanto os de prod para liberar portas
echo %BLUE%   ...parando containers de desenvolvimento...%RESET%
docker compose -f docker-compose.yml down >nul 2>&1
echo %BLUE%   ...parando containers de produção...%RESET%
docker compose -f docker-compose.prod.yml down >nul 2>&1

echo %GREEN%✓ Containers antigos removidos%RESET%
echo %GREEN%✓ Containers antigos removidos%RESET%

:: ============================================================================
:: 6. CONSTRUIR IMAGEM DA APLICAÇÃO
:: ============================================================================
echo.
echo %YELLOW%[6/8] Construindo imagem da aplicação...%RESET%
echo %BLUE%Isso pode levar alguns minutos na primeira vez...%RESET%
echo.

:: Build explicito
docker compose -f docker-compose.prod.yml build app

if !errorlevel! neq 0 (
    echo %RED%✗ Erro ao construir a imagem!%RESET%
    pause
    exit /b 1
)

echo.
echo %GREEN%✓ Imagem construída com sucesso!%RESET%
echo %GREEN%✓ Imagem construída com sucesso!%RESET%

:: ============================================================================
:: 7. INICIAR SISTEMA COMPLETO
:: ============================================================================
echo.
echo %YELLOW%[7/8] Iniciando sistema completo...%RESET%
echo.

:: Inicia os containers
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

if !errorlevel! neq 0 (
    echo %RED%✗ Erro ao iniciar containers!%RESET%
    pause
    exit /b 1
)


echo.
echo %GREEN%✓ Containers iniciados com sucesso!%RESET%

:: ============================================================================
:: 7.1. SINCRONIZAR BANCO DE DADOS (PRISMA)
:: ============================================================================
echo.
echo %YELLOW%[7.1/8] Sincronizando tabelas do banco de dados...%RESET%
docker compose -f docker-compose.prod.yml exec -T app npx prisma db push --accept-data-loss
if !errorlevel! neq 0 (
    echo %RED%⚠ Aviso: Falha ao sincronizar banco de dados, mas tentando continuar...%RESET%
) else (
    echo %GREEN%✓ Banco de dados sincronizado!%RESET%
)


:: ============================================================================
:: 8. AGUARDAR INICIALIZAÇÃO E VERIFICAR STATUS
:: ============================================================================
echo.
echo %YELLOW%[8/8] Aguardando inicialização dos serviços...%RESET%
timeout /t 10 /nobreak >nul

echo.
echo %BLUE%════════════════════════════════════════════════════════════════%RESET%
echo %BLUE%                    STATUS DOS SERVIÇOS                          %RESET%
echo %BLUE%════════════════════════════════════════════════════════════════%RESET%
echo.

docker compose -f docker-compose.prod.yml ps

echo.
echo %BLUE%════════════════════════════════════════════════════════════════%RESET%
echo %BLUE%                    INFORMAÇÕES DE ACESSO                        %RESET%
echo %BLUE%════════════════════════════════════════════════════════════════%RESET%
echo.
echo %GREEN%📱 Aplicação Web:%RESET%       http://localhost:3000
echo %GREEN%🗄️  PostgreSQL:%RESET%         localhost:5434
echo %GREEN%🔴 Redis:%RESET%               localhost:6379
echo %GREEN%🔐 RADIUS (Auth):%RESET%       localhost:1812/udp
echo %GREEN%📊 RADIUS (Acct):%RESET%       localhost:1813/udp
echo %GREEN%🔒 VPN (WireGuard):%RESET%     localhost:51820/udp
echo.
echo %YELLOW%📝 Logs em tempo real:%RESET%
echo    docker compose -f docker-compose.prod.yml logs -f
echo.
echo %YELLOW%🛑 Para parar o sistema:%RESET%
echo    docker compose -f docker-compose.prod.yml down
echo.
echo %YELLOW%🔄 Para reiniciar um serviço:%RESET%
echo    docker compose -f docker-compose.prod.yml restart [service]
echo.
echo %BLUE%════════════════════════════════════════════════════════════════%RESET%
echo.
echo %GREEN%✅ Sistema iniciado com sucesso!%RESET%
echo.

:: Pergunta logs
choice /C SN /M "Deseja visualizar os logs em tempo real"
if !errorlevel! equ 1 (
    docker compose -f docker-compose.prod.yml logs -f
)

goto :eof

:: ============================================================================
:: FUNÇÕES AUXILIARES
:: ============================================================================

:create_env_file
echo # ============================================================================ > .env
echo # MIKROGESTOR - Configuração de Ambiente >> .env
echo # ============================================================================ >> .env
echo. >> .env
echo # Database >> .env
echo DB_USER=postgres >> .env
echo DB_PASSWORD=mikrogestor_secure_2026 >> .env
echo DB_NAME=mikrogestor_prod >> .env
echo DATABASE_URL=postgresql://postgres:mikrogestor_secure_2026@db:5432/mikrogestor_prod?schema=management^&search_path=management,tenant_template,radius >> .env
echo. >> .env
echo # NextAuth >> .env
echo NEXTAUTH_SECRET=change-this-to-a-random-secret-key-min-32-chars >> .env
echo NEXTAUTH_URL=http://localhost:3000 >> .env
echo NEXT_PUBLIC_APP_URL=http://localhost:3000 >> .env
echo. >> .env
echo # VPN Configuration >> .env
echo VPN_HOST=auto >> .env
echo. >> .env
echo # Payment Gateway (Asaas) >> .env
echo ASAAS_MASTER_API_KEY=your_asaas_api_key_here >> .env
echo ASAAS_MASTER_WEBHOOK_TOKEN=your_webhook_token_here >> .env
goto :eof

:create_radius_clients
echo # ============================================================================ > config\radius\clients.conf
echo # FreeRADIUS - Clientes Autorizados >> config\radius\clients.conf
echo # ============================================================================ >> config\radius\clients.conf
echo. >> config\radius\clients.conf
echo # Cliente local (para testes) >> config\radius\clients.conf
echo client localhost { >> config\radius\clients.conf
echo     ipaddr = 127.0.0.1 >> config\radius\clients.conf
echo     secret = testing123 >> config\radius\clients.conf
echo     require_message_authenticator = no >> config\radius\clients.conf
echo     nas_type = other >> config\radius\clients.conf
echo } >> config\radius\clients.conf
echo. >> config\radius\clients.conf
echo # Cliente da rede Docker >> config\radius\clients.conf
echo client docker_network { >> config\radius\clients.conf
echo     ipaddr = 172.16.0.0/12 >> config\radius\clients.conf
echo     secret = mikrogestor_radius_secret >> config\radius\clients.conf
echo     require_message_authenticator = no >> config\radius\clients.conf
echo     nas_type = other >> config\radius\clients.conf
echo } >> config\radius\clients.conf
echo. >> config\radius\clients.conf
echo # Cliente da rede local >> config\radius\clients.conf
echo client local_network { >> config\radius\clients.conf
echo     ipaddr = 192.168.0.0/16 >> config\radius\clients.conf
echo     secret = mikrogestor_radius_secret >> config\radius\clients.conf
echo     require_message_authenticator = no >> config\radius\clients.conf
echo     nas_type = other >> config\radius\clients.conf
echo } >> config\radius\clients.conf
goto :eof

:create_radius_sql
echo # ============================================================================ > config\radius\mods-enabled\sql
echo # FreeRADIUS - Configuração SQL (PostgreSQL) >> config\radius\mods-enabled\sql
echo # ============================================================================ >> config\radius\mods-enabled\sql
echo. >> config\radius\mods-enabled\sql
echo sql { >> config\radius\mods-enabled\sql
echo     driver = "rlm_sql_postgresql" >> config\radius\mods-enabled\sql
echo     dialect = "postgresql" >> config\radius\mods-enabled\sql
echo. >> config\radius\mods-enabled\sql
echo     server = "db" >> config\radius\mods-enabled\sql
echo     port = 5432 >> config\radius\mods-enabled\sql
echo     login = "postgres" >> config\radius\mods-enabled\sql
echo     password = "mikrogestor_secure_2026" >> config\radius\mods-enabled\sql
echo     radius_db = "mikrogestor_prod" >> config\radius\mods-enabled\sql
echo. >> config\radius\mods-enabled\sql
echo     acct_table1 = "radacct" >> config\radius\mods-enabled\sql
echo     acct_table2 = "radacct" >> config\radius\mods-enabled\sql
echo     postauth_table = "radpostauth" >> config\radius\mods-enabled\sql
echo     authcheck_table = "radcheck" >> config\radius\mods-enabled\sql
echo     authreply_table = "radreply" >> config\radius\mods-enabled\sql
echo     groupcheck_table = "radgroupcheck" >> config\radius\mods-enabled\sql
echo     groupreply_table = "radgroupreply" >> config\radius\mods-enabled\sql
echo     usergroup_table = "radusergroup" >> config\radius\mods-enabled\sql
echo. >> config\radius\mods-enabled\sql
echo     read_clients = yes >> config\radius\mods-enabled\sql
echo     client_table = "nas" >> config\radius\mods-enabled\sql
echo. >> config\radius\mods-enabled\sql
echo     pool { >> config\radius\mods-enabled\sql
echo         start = 5 >> config\radius\mods-enabled\sql
echo         min = 4 >> config\radius\mods-enabled\sql
echo         max = 10 >> config\radius\mods-enabled\sql
echo         spare = 3 >> config\radius\mods-enabled\sql
echo         uses = 0 >> config\radius\mods-enabled\sql
echo         lifetime = 0 >> config\radius\mods-enabled\sql
echo         idle_timeout = 60 >> config\radius\mods-enabled\sql
echo     } >> config\radius\mods-enabled\sql
echo } >> config\radius\mods-enabled\sql
goto :eof
