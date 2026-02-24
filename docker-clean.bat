@echo off
TITLE Docker + Windows - Limpeza Completa
COLOR 0E

:: Solicitar privilegios de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ============================================================
    echo   ERRO: Este script precisa de privilegios de Administrador
    echo ============================================================
    echo.
    echo Clique com botao direito e selecione "Executar como Administrador"
    echo.
    pause
    exit /b 1
)

echo ============================================================
echo   DOCKER + WINDOWS - LIMPEZA COMPLETA
echo ============================================================
echo.
echo [!] ATENCAO: Este script ira remover:
echo.
echo     DOCKER:
echo     - Todos os containers (parados e em execucao)
echo     - Todas as imagens Docker
echo     - Todos os volumes (DADOS DO BANCO SERAO PERDIDOS!)
echo     - Todo o cache de build
echo     - Todas as redes nao utilizadas
echo.
echo     WINDOWS:
echo     - Arquivos temporarios (%%TEMP%%)
echo     - Cache do Windows (Prefetch, SoftwareDistribution)
echo     - Lixeira (todos os usuarios)
echo     - Cache de navegadores
echo     - Liberacao de memoria RAM
echo.
echo [!] Certifique-se de fazer backup de dados importantes!
echo.
pause

:: ============================================================
:: PARTE 1: LIMPEZA DO DOCKER
:: ============================================================

echo.
echo ============================================================
echo   PARTE 1/2: LIMPEZA DO DOCKER
echo ============================================================

:: Verificar se Docker esta rodando
echo.
echo [1/6] Verificando status do Docker...
docker info >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    COLOR 0C
    echo [AVISO] Docker nao esta rodando! Pulando limpeza do Docker.
    echo         Inicie o Docker Desktop se quiser limpar containers/imagens.
    timeout /t 3 >nul
    goto WINDOWS_CLEANUP
)
echo [OK] Docker esta rodando.

:: Parar todos os containers
echo.
echo [2/6] Parando todos os containers...
FOR /F "tokens=*" %%i IN ('docker ps -q 2^>nul') DO (
    docker stop %%i
)
echo [OK] Containers parados.

:: Remover todos os containers
echo.
echo [3/6] Removendo todos os containers...
docker container prune -af
echo [OK] Containers removidos.

:: Remover todas as imagens
echo.
echo [4/6] Removendo todas as imagens Docker...
docker image prune -af
FOR /F "tokens=*" %%i IN ('docker images -aq 2^>nul') DO (
    docker rmi %%i -f 2>nul
)
echo [OK] Imagens removidas.

:: Remover todos os volumes
echo.
echo [5/6] Removendo todos os volumes...
docker volume prune -af
echo [OK] Volumes removidos.

:: Remover diretórios locais de dados (Bind Mounts)
echo.
echo [5b/6] Removendo diretórios locais de dados (data\postgres, data\redis)...
if exist "data\postgres" (
    echo     - Removendo data\postgres...
    rmdir /s /q "data\postgres"
)
if exist "data\redis" (
    echo     - Removendo data\redis...
    rmdir /s /q "data\redis"
)
echo [OK] Diretórios locais limpos.

:: Limpeza completa do sistema Docker
echo.
echo [6/6] Executando limpeza completa do sistema Docker...
docker system prune -af --volumes
echo [OK] Limpeza Docker finalizada.

:: ============================================================
:: PARTE 2: LIMPEZA DO WINDOWS
:: ============================================================

:WINDOWS_CLEANUP
echo.
echo ============================================================
echo   PARTE 2/2: LIMPEZA DO WINDOWS
echo ============================================================

:: Limpar arquivos temporarios do usuario
echo.
echo [1/8] Limpando arquivos temporarios do usuario...
del /f /s /q "%TEMP%\*" 2>nul
rd /s /q "%TEMP%" 2>nul
mkdir "%TEMP%" 2>nul
echo [OK] Temp do usuario limpo.

:: Limpar arquivos temporarios do Windows
echo.
echo [2/8] Limpando arquivos temporarios do Windows...
del /f /s /q "C:\Windows\Temp\*" 2>nul
rd /s /q "C:\Windows\Temp" 2>nul
mkdir "C:\Windows\Temp" 2>nul
echo [OK] Temp do Windows limpo.

:: Limpar Prefetch
echo.
echo [3/8] Limpando cache Prefetch...
del /f /s /q "C:\Windows\Prefetch\*" 2>nul
echo [OK] Prefetch limpo.

:: Limpar cache de atualizacoes do Windows
echo.
echo [4/8] Limpando cache de atualizacoes (SoftwareDistribution)...
net stop wuauserv >nul 2>&1
del /f /s /q "C:\Windows\SoftwareDistribution\Download\*" 2>nul
net start wuauserv >nul 2>&1
echo [OK] Cache de atualizacoes limpo.

:: Limpar Lixeira
echo.
echo [5/8] Esvaziando Lixeira de todos os usuarios...
rd /s /q "C:\$Recycle.Bin" 2>nul
echo [OK] Lixeira esvaziada.

:: Limpar cache de navegadores (Chrome, Edge)
echo.
echo [6/8] Limpando cache de navegadores...
taskkill /f /im chrome.exe >nul 2>&1
taskkill /f /im msedge.exe >nul 2>&1
timeout /t 2 >nul
del /f /s /q "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache\*" 2>nul
del /f /s /q "%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cache\*" 2>nul
echo [OK] Cache de navegadores limpo.

:: Limpar cache de DNS
echo.
echo [7/8] Limpando cache de DNS...
ipconfig /flushdns >nul 2>&1
echo [OK] Cache DNS limpo.

:: Liberar memoria RAM (Empty Working Sets)
echo.
echo [8/8] Liberando memoria RAM...
echo Aguarde, processando...
powershell -Command "Get-Process | ForEach-Object { $_.CloseMainWindow() | Out-Null }" 2>nul
powershell -Command "[System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers()" 2>nul
echo [OK] Memoria liberada.

:: ============================================================
:: RESUMO FINAL
:: ============================================================

echo.
echo ============================================================
echo   LIMPEZA COMPLETA FINALIZADA!
echo ============================================================
echo.
echo DOCKER:
docker system df 2>nul
echo.
echo WINDOWS:
echo - Arquivos temporarios: Removidos
echo - Cache do sistema: Limpo
echo - Lixeira: Esvaziada
echo - Memoria RAM: Liberada
echo.
echo ============================================================
echo.
echo [!] RECOMENDACAO: Reinicie o computador para liberar mais memoria.
echo.
pause
