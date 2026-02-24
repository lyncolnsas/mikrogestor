@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================================
:: MIKROGESTOR - Reiniciar Sistema
:: ============================================================================

title Mikrogestor - Reiniciar Sistema

set "BLUE=[94m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "RESET=[0m"

echo.
echo %YELLOW%Reiniciando sistema Mikrogestor...%RESET%
echo.

docker compose -f docker-compose.prod.yml restart

if %errorlevel% equ 0 (
    echo.
    echo %GREEN%✅ Sistema reiniciado com sucesso!%RESET%
    echo.
    echo %BLUE%Status dos serviços:%RESET%
    docker compose -f docker-compose.prod.yml ps
) else (
    echo.
    echo %RED%❌ Erro ao reiniciar o sistema!%RESET%
)

echo.
pause
