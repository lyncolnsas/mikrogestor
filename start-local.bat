@echo off
echo ========================================
echo   MIKROGESTOR - Inicialização Local
echo ========================================
echo.

echo [1/4] Parando containers desnecessários...
docker compose -f docker-compose.yml stop app radius vpn

echo.
echo [2/4] Verificando banco de dados...
docker exec mikrogestor_db pg_isready -U postgres

echo.
echo [3/4] Gerando Prisma Client...
call npx prisma generate

echo.
echo [4/4] Iniciando aplicação...
echo.
echo ========================================
echo   Acesse: http://localhost:3000
echo   Email: admin@mikrogestor.com
echo   Senha: admin123
echo ========================================
echo.

call npm run dev
