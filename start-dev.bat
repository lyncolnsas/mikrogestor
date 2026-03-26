@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================================
:: MIKROGESTOR - Ambiente de Desenvolvimento (App + VPN + DB + Redis)
:: ============================================================================

title Mikrogestor - Desenvolvimento (Docker)

set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "RESET=[0m"

echo.
echo %BLUE%╔════════════════════════════════════════════════════════════════╗%RESET%
echo %BLUE%║          MIKROGESTOR - DESENVOLVIMENTO (DOCKER)                ║%RESET%
echo %BLUE%║          Single Container (App + WireGuard)                    ║%RESET%
echo %BLUE%╚════════════════════════════════════════════════════════════════╝%RESET%
echo.

:: 1. Verificar Docker
echo %YELLOW%[1/4] Verificando Docker...%RESET%
docker compose version >nul 2>&1
if !errorlevel! neq 0 (
    echo %RED%✗ Docker Compose não encontrado!%RESET%
    pause
    exit /b 1
)
echo %GREEN%✓ Docker e Compose detectados%RESET%

:: 2. Parar containers antigos
echo.
echo %YELLOW%[2/4] Parando containers antigos...%RESET%
docker compose -f docker-compose.yml down >nul 2>&1
docker compose -f docker-compose.prod.yml down >nul 2>&1
echo %GREEN%✓ Containers parados%RESET%

:: 3. Iniciar Ambiente
echo.
echo %YELLOW%[3/4] Iniciando containers de desenvolvimento...%RESET%
echo %BLUE%      (Isso pode demorar na primeira vez para baixar imagens...)%RESET%
docker compose -f docker-compose.yml up -d --build --remove-orphans

if !errorlevel! neq 0 (
    echo %RED%✗ Erro ao iniciar containers!%RESET%
    pause
    exit /b 1
)

:: Sincronizar Banco de Dados
echo.
echo %YELLOW%[*] Sincronizando banco de dados (Prisma)...%RESET%
docker compose exec -T app npx prisma db push --accept-data-loss


:: 4. Status
echo.
echo %YELLOW%[4/4] Verificando status...%RESET%
timeout /t 5 /nobreak >nul
docker compose -f docker-compose.yml ps

echo.
echo %BLUE%════════════════════════════════════════════════════════════════%RESET%
echo %GREEN%✅ Ambiente de Desenvolvimento Iniciado!%RESET%
echo.
echo %GREEN%📱 Aplicação Web:%RESET%       http://localhost:3000
echo %GREEN%🔒 VPN (WireGuard):%RESET%     localhost:51820/udp
echo.
echo %YELLOW%📝 Logs em tempo real:%RESET%
echo    docker compose -f docker-compose.yml logs -f
echo.
echo %YELLOW%🛑 Para parar:%RESET%
echo    docker compose -f docker-compose.yml down
echo.

choice /C SN /M "Deseja visualizar os logs em tempo real"
if !errorlevel! equ 1 (
    docker compose -f docker-compose.yml logs -f
)

goto :eof
