@echo off
:: ============================================================================
:: MIKROGESTOR - DESBLOQUEADOR DE PORTAS (WinNat/HNS)
:: ============================================================================
:: Este script resolve o erro de 'bind: soquete proibido' no Docker Desktop.

:: 1. Verificar privilégios de Administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Rodando com Privilégios de Administrador.
) else (
    echo [ERR] Por favor, clique com o botão direito e selecione 'Executar como Administrador'.
    pause
    exit /b
)

echo.
echo ============================================================================
echo [1/3] Reiniciando Servico de Rede do Windows (WinNat)...
net stop winnat
net start winnat
echo [OK] WinNat Reiniciado. Portas liberadas.
echo.

echo [2/3] Reiniciando Host Network Service (HNS)...
net stop hns
net start hns
echo [OK] HNS Reiniciado. Docker deve conseguir conectar aos soquetes agora.
echo.

echo [3/3] Limpando Cache de DNS...
ipconfig /flushdns
echo [OK] Cache DNS Limpo.
echo.

echo ============================================================================
echo [CONCLUIDO] As portas UD 51820 e outras ja devem estar acessiveis ao Docker.
echo Tente rodar o 'docker-compose up -d' novamente agora.
echo ============================================================================
pause
