@echo off
TITLE Docker - Limpeza Segura (Preserva Volumes)
COLOR 0A

echo ============================================================
echo   DOCKER - LIMPEZA SEGURA
echo ============================================================
echo.
echo Este script ira remover:
echo     [x] Containers parados
echo     [x] Imagens nao utilizadas
echo     [x] Cache de build
echo     [x] Redes nao utilizadas
echo.
echo     [ ] Volumes (PRESERVADOS - dados do banco)
echo.
pause

:: Verificar Docker
echo.
echo [1/4] Verificando Docker...
docker info >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    COLOR 0C
    echo [ERRO] Docker nao esta rodando!
    pause
    exit /b 1
)
echo [OK] Docker rodando.

:: Remover containers parados
echo.
echo [2/4] Removendo containers parados...
docker container prune -f
echo [OK] Containers parados removidos.

:: Remover imagens nao utilizadas
echo.
echo [3/4] Removendo imagens nao utilizadas...
docker image prune -af
echo [OK] Imagens removidas.

:: Limpeza do sistema (SEM volumes)
echo.
echo [4/4] Limpeza final (preservando volumes)...
docker system prune -af
echo [OK] Limpeza concluida.

:: Status final
echo.
echo ============================================================
echo   LIMPEZA SEGURA CONCLUIDA!
echo ============================================================
echo.
echo Uso atual do Docker:
docker system df
echo.
echo [!] NOTA: Volumes foram PRESERVADOS para manter dados do banco.
echo     Para remover volumes, use: docker-clean.bat
echo.
pause
