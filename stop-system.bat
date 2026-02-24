@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================================
:: MIKROGESTOR - Parar Sistema
:: ============================================================================

title Mikrogestor - Parar Sistema

set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "RESET=[0m"

echo.
echo %YELLOW%Parando todos os serviços do Mikrogestor...%RESET%
echo.

docker compose -f docker-compose.prod.yml down

if %errorlevel% equ 0 (
    echo.
    echo %GREEN%✅ Sistema parado com sucesso!%RESET%
) else (
    echo.
    echo %RED%❌ Erro ao parar o sistema!%RESET%
)

echo.
pause
