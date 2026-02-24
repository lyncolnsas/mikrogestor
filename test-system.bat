@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================================
:: MIKROGESTOR - Teste Completo do Sistema
:: ============================================================================

title Mikrogestor - Teste do Sistema

set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "RESET=[0m"

echo.
echo %BLUE%╔════════════════════════════════════════════════════════════════╗%RESET%
echo %BLUE%║          MIKROGESTOR - TESTE COMPLETO DO SISTEMA               ║%RESET%
echo %BLUE%╚════════════════════════════════════════════════════════════════╝%RESET%
echo.

:: ============================================================================
:: 1. VERIFICAR SE OS CONTAINERS ESTÃO RODANDO
:: ============================================================================
echo %YELLOW%[1/6] Verificando status dos containers...%RESET%
echo.

docker compose -f docker-compose.prod.yml ps

echo.
set /p continue="Todos os containers estão UP? (S/N): "
if /i not "%continue%"=="S" (
    echo %RED%✗ Inicie o sistema primeiro com start-system.bat%RESET%
    pause
    exit /b 1
)

:: ============================================================================
:: 2. TESTAR POSTGRESQL
:: ============================================================================
echo.
echo %YELLOW%[2/6] Testando conexão PostgreSQL...%RESET%

docker exec mikrogestor_db pg_isready -U postgres >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ PostgreSQL está respondendo%RESET%
) else (
    echo %RED%✗ PostgreSQL não está respondendo%RESET%
)

:: ============================================================================
:: 3. TESTAR REDIS
:: ============================================================================
echo.
echo %YELLOW%[3/6] Testando conexão Redis...%RESET%

docker exec mikrogestor_redis redis-cli ping >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ Redis está respondendo%RESET%
) else (
    echo %RED%✗ Redis não está respondendo%RESET%
)

:: ============================================================================
:: 4. TESTAR APLICAÇÃO WEB
:: ============================================================================
echo.
echo %YELLOW%[4/6] Testando aplicação web...%RESET%

curl -s -o nul -w "%%{http_code}" http://localhost:3000 > temp_status.txt
set /p http_status=<temp_status.txt
del temp_status.txt

if "%http_status%"=="200" (
    echo %GREEN%✓ Aplicação web está respondendo (HTTP %http_status%)%RESET%
) else if "%http_status%"=="000" (
    echo %RED%✗ Aplicação web não está acessível%RESET%
) else (
    echo %YELLOW%! Aplicação web retornou HTTP %http_status%%RESET%
)

:: ============================================================================
:: 5. TESTAR RADIUS
:: ============================================================================
echo.
echo %YELLOW%[5/6] Testando FreeRADIUS...%RESET%

:: Verifica se o container está rodando
docker ps | findstr mikrogestor_radius >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ FreeRADIUS container está rodando%RESET%
    
    :: Tenta verificar se as portas estão abertas
    netstat -an | findstr ":1812" >nul 2>&1
    if %errorlevel% equ 0 (
        echo %GREEN%✓ Porta RADIUS 1812/udp está aberta%RESET%
    ) else (
        echo %YELLOW%! Porta RADIUS 1812/udp não detectada%RESET%
    )
) else (
    echo %RED%✗ FreeRADIUS container não está rodando%RESET%
)

:: ============================================================================
:: 6. TESTAR WIREGUARD VPN
:: ============================================================================
echo.
echo %YELLOW%[6/6] Testando WireGuard VPN...%RESET%

:: Verifica se o container está rodando
docker ps | findstr mikrogestor_vpn >nul 2>&1
if %errorlevel% equ 0 (
    echo %GREEN%✓ WireGuard container está rodando%RESET%
    
    :: Verifica se a porta está aberta
    netstat -an | findstr ":51820" >nul 2>&1
    if %errorlevel% equ 0 (
        echo %GREEN%✓ Porta WireGuard 51820/udp está aberta%RESET%
    ) else (
        echo %YELLOW%! Porta WireGuard 51820/udp não detectada%RESET%
    )
    
    :: Verifica se os arquivos de configuração foram gerados
    if exist "config\wireguard\peer1\peer1.conf" (
        echo %GREEN%✓ Configurações de peers geradas%RESET%
        echo %BLUE%  → Arquivos de configuração em: config\wireguard\%RESET%
    ) else (
        echo %YELLOW%! Configurações de peers ainda não geradas%RESET%
        echo %YELLOW%  Aguarde alguns segundos e verifique novamente%RESET%
    )
) else (
    echo %RED%✗ WireGuard container não está rodando%RESET%
)

:: ============================================================================
:: RESUMO
:: ============================================================================
echo.
echo %BLUE%════════════════════════════════════════════════════════════════%RESET%
echo %BLUE%                    RESUMO DOS TESTES                            %RESET%
echo %BLUE%════════════════════════════════════════════════════════════════%RESET%
echo.
echo %GREEN%✅ SERVIÇOS TESTADOS:%RESET%
echo    • PostgreSQL (Database)
echo    • Redis (Cache/Queue)
echo    • Aplicação Web
echo    • FreeRADIUS (Autenticação)
echo    • WireGuard (VPN)
echo.
echo %YELLOW%📝 PRÓXIMOS PASSOS:%RESET%
echo.
echo %BLUE%1. Acessar a aplicação:%RESET%
echo    http://localhost:3000
echo.
echo %BLUE%2. Testar autenticação RADIUS:%RESET%
echo    radtest usuario senha localhost 0 testing123
echo    (Requer instalação do radtest no Windows ou use WSL)
echo.
echo %BLUE%3. Obter configuração VPN:%RESET%
echo    docker exec mikrogestor_vpn cat /config/peer1/peer1.conf
echo    (Use este arquivo no cliente WireGuard)
echo.
echo %BLUE%4. Visualizar QR Code VPN:%RESET%
echo    docker exec mikrogestor_vpn cat /config/peer1/peer1.png
echo    (Escaneie com o app WireGuard no celular)
echo.
echo %BLUE%5. Ver logs em tempo real:%RESET%
echo    view-logs.bat
echo.
echo %BLUE%════════════════════════════════════════════════════════════════%RESET%
echo.
pause
