# 🔧 Troubleshooting - Mikrogestor

## ❌ Erro: "pull access denied for mikrogestor/core"

### Problema

```
✘ app Error  pull access denied for mikrogestor/core, repository does not exist or may require 'docker login'
```

### Causa

O `docker-compose.prod.yml` estava configurado para baixar uma imagem do Docker Hub que não existe.

### ✅ Solução Aplicada

1. **Atualizado `docker-compose.prod.yml`:**
   - Mudou de `image: mikrogestor/core:latest` (pull)
   - Para `build: context: .` (build local)

2. **Atualizado `start-system.bat`:**
   - Adicionado passo de build antes de iniciar containers
   - Agora constrói a imagem localmente na primeira execução

### Como Usar Agora

```bash
# Simplesmente execute (ele vai construir automaticamente):
start-system.bat
```

A primeira execução vai demorar mais (5-10 minutos) porque vai:

1. Instalar dependências Node.js
2. Executar Prisma generate
3. Fazer build do Next.js
4. Criar a imagem Docker

Execuções subsequentes serão muito mais rápidas (cache).

---

## 🐛 Outros Problemas Comuns

### 1. Porta já em uso

**Erro:**

```
Error: bind: address already in use
```

**Solução:**

```bash
# Ver o que está usando a porta
netstat -ano | findstr :3000

# Matar processo (substitua <PID>)
taskkill /PID <PID> /F

# Ou parar todos os containers
docker compose -f docker-compose.prod.yml down
```

### 2. Container não inicia

**Sintomas:**

- Container fica reiniciando
- Status "Restarting"

**Diagnóstico:**

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs app

# Ver logs em tempo real
docker compose -f docker-compose.prod.yml logs -f app
```

**Soluções comuns:**

- Verificar `.env` (senhas corretas?)
- Verificar se PostgreSQL está UP
- Verificar se Redis está UP

### 3. Erro de conexão com banco

**Erro:**

```
Error: P1001: Can't reach database server
```

**Solução:**

```bash
# Verificar se PostgreSQL está rodando
docker compose -f docker-compose.prod.yml ps postgres

# Ver logs do PostgreSQL
docker compose -f docker-compose.prod.yml logs postgres

# Reiniciar PostgreSQL
docker compose -f docker-compose.prod.yml restart postgres
```

### 4. Erro no Prisma

**Erro:**

```
Error: Prisma schema not found
```

**Solução:**

```bash
# Reconstruir a imagem
docker compose -f docker-compose.prod.yml build --no-cache app
docker compose -f docker-compose.prod.yml up -d
```

### 5. RADIUS não autentica

**Sintomas:**

- `radtest` retorna "Access-Reject"
- Usuários não conseguem autenticar

**Diagnóstico:**

```bash
# Ver logs do RADIUS
docker compose -f docker-compose.prod.yml logs radius

# Verificar se schema foi criado
docker exec -it mikrogestor_db psql -U postgres -d mikrogestor_prod -c "\dt radius.*"

# Verificar usuários
docker exec -it mikrogestor_db psql -U postgres -d mikrogestor_prod -c "SELECT * FROM radius.radcheck;"
```

**Soluções:**

1. Executar `init-radius.bat` se não executou ainda
2. Verificar secret em `config/radius/clients.conf`
3. Verificar se usuário existe no banco

### 6. VPN não conecta

**Sintomas:**

- Cliente WireGuard não conecta
- Timeout ao tentar conectar

**Diagnóstico:**

```bash
# Ver logs do WireGuard
docker compose -f docker-compose.prod.yml logs wireguard

# Verificar configuração
docker exec mikrogestor_vpn cat /config/wg0.conf

# Verificar interface
docker exec mikrogestor_vpn wg show
```

**Soluções:**

1. Verificar se porta 51820/UDP está aberta no firewall
2. Verificar se `VPN_HOST` no `.env` está correto
3. Regenerar configuração de peer

### 7. Build muito lento

**Problema:**
Build da imagem demora muito tempo

**Soluções:**

```bash
# Limpar cache do Docker
docker builder prune

# Usar build com cache
docker compose -f docker-compose.prod.yml build

# Se ainda estiver lento, verificar:
# - Espaço em disco
# - Recursos do Docker Desktop (aumentar RAM/CPU)
```

### 8. Erro de memória

**Erro:**

```
JavaScript heap out of memory
```

**Solução:**

```bash
# Aumentar memória do Docker Desktop:
# Settings → Resources → Memory → 4GB ou mais

# Ou editar Dockerfile e adicionar:
# ENV NODE_OPTIONS="--max-old-space-size=4096"
```

### 9. Limpar tudo e recomeçar

**Quando usar:**

- Sistema está completamente quebrado
- Quer começar do zero

**Comando:**

```bash
# ⚠️ CUIDADO: Isso apaga TODOS os dados!
docker compose -f docker-compose.prod.yml down -v
docker system prune -a --volumes

# Depois reiniciar
start-system.bat
```

---

## 📋 Checklist de Diagnóstico

Quando algo não funcionar, siga esta ordem:

- [ ] 1. Verificar se Docker Desktop está rodando
- [ ] 2. Executar `test-system.bat`
- [ ] 3. Ver logs: `view-logs.bat`
- [ ] 4. Verificar arquivo `.env`
- [ ] 5. Verificar portas (netstat)
- [ ] 6. Reiniciar containers: `restart-system.bat`
- [ ] 7. Reconstruir imagem: `docker compose -f docker-compose.prod.yml build --no-cache`
- [ ] 8. Último recurso: limpar tudo e recomeçar

---

## 🆘 Comandos Úteis de Diagnóstico

```bash
# Status de todos os containers
docker compose -f docker-compose.prod.yml ps

# Logs de todos os serviços
docker compose -f docker-compose.prod.yml logs

# Logs de serviço específico
docker compose -f docker-compose.prod.yml logs [app|postgres|redis|radius|wireguard]

# Entrar em um container
docker exec -it mikrogestor_app sh
docker exec -it mikrogestor_db psql -U postgres -d mikrogestor_prod

# Ver uso de recursos
docker stats

# Ver redes
docker network ls
docker network inspect mikrogestor_default

# Ver volumes
docker volume ls

# Inspecionar container
docker inspect mikrogestor_app
```

---

## 📞 Ainda com problemas?

1. Execute: `test-system.bat`
2. Copie a saída completa
3. Verifique os logs: `view-logs.bat`
4. Consulte a documentação: `SYSTEM-README.md`
