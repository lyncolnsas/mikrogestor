# 🚀 GUIA RÁPIDO - Mikrogestor Sistema Completo

## ⚡ Início em 3 Passos

### 1️⃣ Iniciar o Sistema

```bash
start-system.bat
```

Ou use o menu interativo:

```bash
menu.bat
```

### 2️⃣ Inicializar RADIUS (Primeira vez)

```bash
init-radius.bat
```

### 3️⃣ Testar Tudo

```bash
test-system.bat
```

## 📱 Acessos Rápidos

| Serviço | URL/Comando |
|---------|-------------|
| **Web App** | <http://localhost:3000> |
| **Ver Logs** | `view-logs.bat` |
| **Parar Sistema** | `stop-system.bat` |
| **Reiniciar** | `restart-system.bat` |

## 🔐 Credenciais Padrão

### RADIUS (Teste)

- **Usuário:** `testuser`
- **Senha:** `testpass`
- **Secret:** `testing123`

### PostgreSQL

- **Usuário:** `postgres`
- **Senha:** `mikrogestor_secure_2026`
- **Database:** `mikrogestor_prod`

⚠️ **IMPORTANTE:** Altere as senhas em produção!

## 🔒 VPN - Configuração Rápida

### Obter configuração do cliente

```bash
docker exec mikrogestor_vpn cat /config/peer1/peer1.conf
```

### Ver QR Code (Mobile)

```bash
# Salvar QR Code
docker exec mikrogestor_vpn cat /config/peer1/peer1.png > peer1-qr.png
```

## 🧪 Testes Rápidos

### Testar RADIUS (WSL/Linux)

```bash
radtest testuser testpass localhost 0 testing123
```

### Testar PostgreSQL

```bash
docker exec -it mikrogestor_db psql -U postgres -d mikrogestor_prod
```

### Testar Redis

```bash
docker exec -it mikrogestor_redis redis-cli ping
```

## 📊 Comandos Úteis

### Ver status

```bash
docker compose -f docker-compose.prod.yml ps
```

### Ver logs específicos

```bash
# RADIUS
docker compose -f docker-compose.prod.yml logs -f radius

# VPN
docker compose -f docker-compose.prod.yml logs -f wireguard

# App
docker compose -f docker-compose.prod.yml logs -f app
```

### Reiniciar serviço específico

```bash
docker compose -f docker-compose.prod.yml restart radius
docker compose -f docker-compose.prod.yml restart wireguard
```

## 🗄️ Gerenciar Usuários RADIUS

### Adicionar usuário

```sql
-- Conectar ao banco
docker exec -it mikrogestor_db psql -U postgres -d mikrogestor_prod

-- Adicionar usuário
SELECT add_radius_user('novouser', 'senha123', 'admin');
```

### Listar usuários

```sql
SELECT * FROM radius.v_radius_users;
```

### Alterar senha

```sql
SELECT change_radius_password('novouser', 'novasenha');
```

### Remover usuário

```sql
SELECT remove_radius_user('novouser');
```

## 🔧 Troubleshooting Rápido

### Sistema não inicia

```bash
# Limpar tudo e reiniciar
docker compose -f docker-compose.prod.yml down -v
start-system.bat
```

### Porta em uso

```bash
# Ver o que está usando a porta
netstat -ano | findstr :3000

# Matar processo (substitua PID)
taskkill /PID <PID> /F
```

### RADIUS não autentica

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs radius

# Verificar usuários no banco
docker exec -it mikrogestor_db psql -U postgres -d mikrogestor_prod -c "SELECT * FROM radius.radcheck;"
```

## 📁 Arquivos Importantes

| Arquivo | Descrição |
|---------|-----------|
| `.env` | Variáveis de ambiente |
| `config/radius/clients.conf` | Clientes RADIUS |
| `config/wireguard/` | Configurações VPN |
| `docker-compose.prod.yml` | Orquestração Docker |

## 🎯 Próximos Passos

1. ✅ Sistema iniciado
2. ✅ RADIUS configurado
3. ✅ VPN funcionando
4. 📝 Configurar clientes VPN
5. 📝 Adicionar usuários RADIUS
6. 📝 Integrar com NAS (roteadores, switches)
7. 📝 Configurar backup automático

## 📚 Documentação Completa

Para mais detalhes, consulte: `SYSTEM-README.md`

## 🆘 Suporte

1. Execute: `test-system.bat`
2. Verifique logs: `view-logs.bat`
3. Consulte: `SYSTEM-README.md`
