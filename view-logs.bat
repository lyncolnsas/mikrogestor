@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================================
:: MIKROGESTOR - Visualizar Logs
:: ============================================================================

title Mikrogestor - Logs do Sistema

set "BLUE=[94m"
set "YELLOW=[93m"
set "RESET=[0m"

echo.
echo %BLUE%════════════════════════════════════════════════════════════════%RESET%
echo %BLUE%                    LOGS DO SISTEMA                              %RESET%
echo %BLUE%════════════════════════════════════════════════════════════════%RESET%
echo.
echo %YELLOW%Escolha o serviço para visualizar os logs:%RESET%
echo.
echo  [1] Todos os serviços
echo  [2] Aplicação (App)
echo  [3] PostgreSQL (Database)
echo  [4] Redis (Cache)
echo  [5] FreeRADIUS (Autenticação)
echo  [6] WireGuard (VPN)
echo  [0] Sair
echo.

choice /C 1234560 /N /M "Digite sua escolha: "
set choice=%errorlevel%

echo.

if %choice% equ 1 (
    echo %YELLOW%Exibindo logs de TODOS os serviços...%RESET%
    docker compose -f docker-compose.prod.yml logs -f
) else if %choice% equ 2 (
    echo %YELLOW%Exibindo logs da APLICAÇÃO...%RESET%
    docker compose -f docker-compose.prod.yml logs -f app
) else if %choice% equ 3 (
    echo %YELLOW%Exibindo logs do POSTGRESQL...%RESET%
    docker compose -f docker-compose.prod.yml logs -f postgres
) else if %choice% equ 4 (
    echo %YELLOW%Exibindo logs do REDIS...%RESET%
    docker compose -f docker-compose.prod.yml logs -f redis
) else if %choice% equ 5 (
    echo %YELLOW%Exibindo logs do FREERADIUS...%RESET%
    docker compose -f docker-compose.prod.yml logs -f radius
) else if %choice% equ 6 (
    echo %YELLOW%Exibindo logs do WIREGUARD...%RESET%
    docker compose -f docker-compose.prod.yml logs -f wireguard
) else (
    exit /b 0
)
