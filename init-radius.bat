@echo off
chcp 65001 >nul

:: ============================================================================
:: MIKROGESTOR - Inicializar Database RADIUS
:: ============================================================================

title Mikrogestor - Inicializar RADIUS Database

set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "RESET=[0m"

echo.
echo %BLUE%╔════════════════════════════════════════════════════════════════╗%RESET%
echo %BLUE%║          MIKROGESTOR - INICIALIZAR RADIUS DATABASE             ║%RESET%
echo %BLUE%╚════════════════════════════════════════════════════════════════╝%RESET%
echo.

:: Verificar se o container do PostgreSQL está rodando
docker ps | findstr mikrogestor_db >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%✗ Container PostgreSQL não está rodando!%RESET%
    echo %YELLOW%  Execute start-system.bat primeiro.%RESET%
    pause
    exit /b 1
)

echo %GREEN%✓ Container PostgreSQL está rodando%RESET%
echo.
echo %YELLOW%Inicializando schema RADIUS...%RESET%
echo.

:: Executar script SQL
docker exec -i mikrogestor_db psql -U postgres -d mikrogestor_prod < scripts\init-radius-db.sql

if %errorlevel% equ 0 (
    echo.
    echo %GREEN%✅ Schema RADIUS criado com sucesso!%RESET%
    echo.
    echo %BLUE%Informações criadas:%RESET%
    echo   • Tabelas: radcheck, radreply, radacct, radpostauth, nas
    echo   • Usuário de teste: testuser / testpass
    echo   • NAS local: 127.0.0.1 (secret: testing123)
    echo.
    echo %YELLOW%Para testar:%RESET%
    echo   radtest testuser testpass localhost 0 testing123
    echo.
) else (
    echo.
    echo %RED%❌ Erro ao criar schema RADIUS!%RESET%
    echo %YELLOW%Verifique os logs acima para mais detalhes.%RESET%
)

pause
