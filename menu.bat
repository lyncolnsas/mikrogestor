@echo off
chcp 65001 >nul

:: ============================================================================
:: MIKROGESTOR - Menu Principal
:: ============================================================================

title Mikrogestor - Menu Principal

set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "RESET=[0m"

:: Debug pause (remove after verifying it works)
:: pause

:menu
cls
echo.
echo %BLUE%================================================================%RESET%
echo %BLUE%                    MIKROGESTOR - MENU                          %RESET%
echo %BLUE%          Sistema Completo: App + Radius + VPN                  %RESET%
echo %BLUE%================================================================%RESET%
echo.
echo %GREEN%  [1]%RESET% Iniciar Sistema Completo (Producao)
echo %GREEN%  [8]%RESET% Iniciar Ambiente Dev (Docker)
echo %GREEN%  [2]%RESET% Parar Sistema
echo %GREEN%  [3]%RESET% Reiniciar Sistema
echo %GREEN%  [4]%RESET% Ver Logs
echo %GREEN%  [5]%RESET% Testar Sistema
echo %GREEN%  [6]%RESET% Status dos Servicos
echo %GREEN%  [7]%RESET% Obter Configuracao VPN
echo %GREEN%  [0]%RESET% Sair
echo.

choice /C 123456780 /N /M "Digite sua escolha: "
set choice=%errorlevel%

if %choice% equ 1 goto start_system
if %choice% equ 2 goto stop_system
if %choice% equ 3 goto restart_system
if %choice% equ 4 goto view_logs
if %choice% equ 5 goto test_system
if %choice% equ 6 goto status
if %choice% equ 7 goto vpn_config
if %choice% equ 8 goto start_dev
if %choice% equ 9 exit /b 0

:start_system
cls
call start-system.bat
goto menu

:start_dev
cls
call start-dev.bat
goto menu

:stop_system
cls
call stop-system.bat
goto menu

:restart_system
cls
call restart-system.bat
goto menu

:view_logs
cls
call view-logs.bat
goto menu

:test_system
cls
call test-system.bat
goto menu

:status
cls
echo.
echo %BLUE%================================================================%RESET%
echo %BLUE%                    STATUS DOS SERVICOS                         %RESET%
echo %BLUE%================================================================%RESET%
echo.
docker compose -f docker-compose.prod.yml ps
echo.
pause
goto menu

:vpn_config
cls
echo.
echo %BLUE%================================================================%RESET%
echo %BLUE%                CONFIGURACAO VPN (WIREGUARD)                    %RESET%
echo %BLUE%================================================================%RESET%
echo.
echo %YELLOW%Escolha o peer (cliente VPN):%RESET%
echo.
echo  [1] Peer 1
echo  [2] Peer 2
echo  [3] Peer 3
echo  [4] Listar todos os peers disponiveis
echo  [0] Voltar
echo.

choice /C 12340 /N /M "Digite sua escolha: "
set peer_choice=%errorlevel%

if %peer_choice% equ 5 goto menu
if %peer_choice% equ 4 (
    echo.
    echo %YELLOW%Peers disponiveis:%RESET%
    docker exec mikrogestor_vpn ls -1 /config | findstr peer
    echo.
    pause
    goto vpn_config
)

set peer_num=%peer_choice%
echo.
echo %YELLOW%Configuracao do Peer %peer_num%:%RESET%
echo.
docker exec mikrogestor_vpn cat /config/peer%peer_num%/peer%peer_num%.conf
echo.
echo %GREEN%Para usar no celular, escaneie o QR Code:%RESET%
echo docker exec mikrogestor_vpn cat /config/peer%peer_num%/peer%peer_num%.png
echo.
echo %GREEN%Ou salve a configuracao acima em um arquivo .conf%RESET%
echo.
pause
goto menu
