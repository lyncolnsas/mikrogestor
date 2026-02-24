# 🚀 Mikrogestor - Sistema Completo (Radius + VPN)

Sistema completo de gestão com autenticação RADIUS e VPN WireGuard integrados.

## 📋 Componentes do Sistema

- **Aplicação Web** (Next.js) - Interface principal
- **PostgreSQL** - Banco de dados relacional
- **Redis** - Cache e filas
- **FreeRADIUS** - Servidor de autenticação AAA
- **WireGuard** - VPN para acesso seguro

## 🎯 Início Rápido

### Opção 1: Menu Interativo (Recomendado)

```bash
menu.bat
```

### Opção 2: Scripts Individuais

#### Iniciar o sistema completo

```bash
start-system.bat
```

#### Parar o sistema

```bash
stop-system.bat
```

#### Reiniciar o sistema

```bash
restart-system.bat
```

#### Ver logs

```bash
view-logs.bat
```

#### Testar todos os componentes

```bash
test-system.bat
```

## 🔧 Pré-requisitos

- **Docker Desktop** instalado e rodando
- **Windows 10/11** com PowerShell
- **Portas disponíveis:**
  - `3000` - Aplicação Web
  - `5432` - PostgreSQL
  - `6379` - Redis
  - `1812/udp` - RADIUS Authentication
  - `1813/udp` - RADIUS Accounting
  - `51820/udp` - WireGuard VPN

## 📝 Configuração Inicial

### 1. Arquivo `.env`

O script `start-system.bat` criará automaticamente um arquivo `.env` com valores padrão. **IMPORTANTE:** Edite este arquivo com suas credenciais reais antes de usar em produção.

```env
# Database
DB_USER=postgres
DB_PASSWORD=mikrogestor_secure_2026
DB_NAME=mikrogestor_prod

# NextAuth
NEXTAUTH_SECRET=change-this-to-a-random-secret-key-min-32-chars
NEXTAUTH_URL=http://localhost:3000

# VPN
VPN_HOST=auto

# Payment Gateway
ASAAS_MASTER_API_KEY=your_asaas_api_key_here
```

### 2. Configuração do RADIUS

Os arquivos de configuração do FreeRADIUS são criados automaticamente em:

- `config/radius/clients.conf` - Clientes autorizados
- `config/radius/mods-enabled/sql` - Configuração SQL

**Clientes RADIUS padrão:**

- Localhost: `secret = testing123`
- Rede Docker: `secret = mikrogestor_radius_secret`
- Rede Local: `secret = mikrogestor_radius_secret`

### 3. Configuração da VPN

O WireGuard gera automaticamente 10 peers (clientes VPN). As configurações ficam em:

```
config/wireguard/peer1/peer1.conf
config/wireguard/peer1/peer1.png (QR Code)
```

## 🧪 Testando o Sistema

Execute o script de teste completo:

```bash
test-system.bat
```

Este script verifica:

- ✅ Status dos containers
- ✅ Conexão PostgreSQL
- ✅ Conexão Redis
- ✅ Aplicação Web (HTTP)
- ✅ FreeRADIUS (portas)
- ✅ WireGuard VPN (portas e configurações)

## 🔐 Usando o RADIUS

### Testar autenticação (requer radtest)

**No WSL ou Linux:**

```bash
radtest usuario senha localhost 0 testing123
```

**Adicionar usuário no banco:**

```sql
INSERT INTO radcheck (username, attribute, op, value) 
VALUES ('usuario', 'Cleartext-Password', ':=', 'senha');
```

### Integração com NAS (Network Access Server)

Adicione seu NAS em `config/radius/clients.conf`:

```conf
client meu_nas {
    ipaddr = 192.168.1.100
    secret = meu_secret_seguro
    require_message_authenticator = no
    nas_type = other
}
```

## 🔒 Usando a VPN

### 1. Obter configuração do peer

**Via menu:**

```bash
menu.bat → [7] Obter Configuração VPN
```

**Via comando direto:**

```bash
docker exec mikrogestor_vpn cat /config/peer1/peer1.conf
```

### 2. Configurar cliente

**Desktop (Windows/Mac/Linux):**

1. Instale o [WireGuard](https://www.wireguard.com/install/)
2. Importe o arquivo `.conf`
3. Ative a conexão

**Mobile (Android/iOS):**

1. Instale o app WireGuard
2. Escaneie o QR Code:

```bash
docker exec mikrogestor_vpn cat /config/peer1/peer1.png
```

## 📊 Monitoramento

### Ver logs em tempo real

**Todos os serviços:**

```bash
docker compose -f docker-compose.prod.yml logs -f
```

**Serviço específico:**

```bash
docker compose -f docker-compose.prod.yml logs -f radius
docker compose -f docker-compose.prod.yml logs -f wireguard
```

### Status dos containers

```bash
docker compose -f docker-compose.prod.yml ps
```

### Estatísticas de uso

```bash
docker stats
```

## 🗄️ Gerenciamento do Banco de Dados

### Acessar PostgreSQL

```bash
docker exec -it mikrogestor_db psql -U postgres -d mikrogestor_prod
```

### Backup

```bash
docker exec mikrogestor_db pg_dump -U postgres mikrogestor_prod > backup.sql
```

### Restore

```bash
docker exec -i mikrogestor_db psql -U postgres mikrogestor_prod < backup.sql
```

## 🔧 Troubleshooting

### Containers não iniciam

```bash
# Ver logs de erro
docker compose -f docker-compose.prod.yml logs

# Remover volumes e reiniciar
docker compose -f docker-compose.prod.yml down -v
start-system.bat
```

### Porta já em uso

```bash
# Verificar processos usando a porta
netstat -ano | findstr :3000

# Matar processo (substitua PID)
taskkill /PID <PID> /F
```

### RADIUS não autentica

```bash
# Verificar logs do RADIUS
docker compose -f docker-compose.prod.yml logs radius

# Verificar configuração SQL
docker exec mikrogestor_radius cat /etc/raddb/mods-enabled/sql

# Testar conexão com banco
docker exec mikrogestor_db psql -U postgres -d mikrogestor_prod -c "SELECT * FROM radcheck;"
```

### VPN não conecta

```bash
# Verificar logs do WireGuard
docker compose -f docker-compose.prod.yml logs wireguard

# Verificar configuração gerada
docker exec mikrogestor_vpn cat /config/wg0.conf

# Verificar interface de rede
docker exec mikrogestor_vpn wg show
```

## 📚 Estrutura de Diretórios

```
mikrogestor/
├── config/
│   ├── radius/          # Configurações FreeRADIUS
│   │   ├── clients.conf
│   │   └── mods-enabled/sql
│   └── wireguard/       # Configurações WireGuard
│       ├── peer1/
│       ├── peer2/
│       └── ...
├── data/
│   ├── postgres/        # Dados PostgreSQL
│   └── redis/           # Dados Redis
├── docker-compose.prod.yml
├── menu.bat             # Menu principal
├── start-system.bat     # Iniciar sistema
├── stop-system.bat      # Parar sistema
├── restart-system.bat   # Reiniciar sistema
├── view-logs.bat        # Ver logs
└── test-system.bat      # Testar sistema
```

## 🌐 Endpoints

| Serviço    | Endpoint                | Descrição                    |
|------------|-------------------------|------------------------------|
| Web App    | <http://localhost:3000>   | Interface principal          |
| PostgreSQL | localhost:5432          | Banco de dados               |
| Redis      | localhost:6379          | Cache/Queue                  |
| RADIUS     | localhost:1812/udp      | Autenticação                 |
| RADIUS     | localhost:1813/udp      | Accounting                   |
| WireGuard  | localhost:51820/udp     | VPN                          |

## 🔐 Segurança

### Produção

1. **Altere todas as senhas padrão** no arquivo `.env`
2. **Use HTTPS** com certificado SSL válido
3. **Configure firewall** para limitar acesso às portas
4. **Habilite autenticação forte** no RADIUS
5. **Rotacione secrets** do WireGuard periodicamente
6. **Monitore logs** de autenticação

### Secrets RADIUS

```bash
# Gerar secret forte
openssl rand -base64 32
```

### Secret NextAuth

```bash
# Gerar secret forte
openssl rand -base64 32
```

## 📞 Suporte

Para problemas ou dúvidas:

1. Verifique os logs: `view-logs.bat`
2. Execute os testes: `test-system.bat`
3. Consulte a documentação oficial dos componentes

## 📄 Licença

Este projeto é parte do sistema Mikrogestor.
