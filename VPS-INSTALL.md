# 🚀 MIKROGESTOR NETWORK - Guia de Instalação VPS (Ubuntu)

Este documento descreve a arquitetura e os passos para instalar o ecossistema Mikrogestor em um servidor VPS Ubuntu para produção, garantindo alta performance e segurança.

---

## 🏗️ Arquitetura do Sistema

O Mikrogestor é orquestrado via **Docker**, dividindo as responsabilidades em 4 serviços principais:

1.  **APP CORE (Next.js 15)**: O cérebro do sistema. Gerencia o Dashboard, a API SaaS, o provisionamento de scripts e o servidor **WireGuard** embutido para túneis VPN.
2.  **RADIUS SERVER (FreeRADIUS)**: O motor de autenticação. Conecta-se diretamente ao banco de dados para validar logins PPPoE e Hotspot em milissegundos.
3.  **DATABASE (PostgreSQL 16)**: Repositório central de dados (Clientes, Financeiro, Leads, Configurações de Rede).
4.  **CACHE & QUEUE (Redis 7)**: Gerencia filas de tarefas (envio de WhatsApp/E-mail) e cache de sessões para navegação fluida.

---

## 🛠️ Pré-requisitos (VPS Recomendada)

*   **Sistema Operacional**: Ubuntu 22.04 LTS ou superior.
*   **Hardware Mínimo**: 2 vCPUs, 4GB RAM, 20GB SSD.
*   **Rede**: IP Público (Fixo) com as seguintes portas abertas no Firewall:
    *   `TCP 3000`: Painel Mikrogestor (Web).
    *   `UDP 1812 / 1813`: Autenticação e Bilhetagem RADIUS.
    *   `UDP 51820`: Túnel VPN WireGuard.

---

## ⚡ Instalação Rápida (Script Automático)

Siga os comandos abaixo para realizar a instalação completa de forma automática:

```bash
# 1. Baixe o script de instalação
curl -O https://raw.githubusercontent.com/lyncolnsas/mikrogestor/main/setup-vps.sh

# 2. Dê permissão de execução
chmod +x setup-vps.sh

# 3. Execute o script
sudo ./setup-vps.sh
```

---

## 🔧 Configuração Manual (Passo a Passo)

### 1. Preparar o Servidor
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git docker.io docker-compose-v2
```

### 2. Clonar e Configurar
```bash
git clone https://github.com/lyncolnsas/mikrogestor.git
cd mikrogestor
cp .env.example .env
```

> **Ação Necessária**: Edite o arquivo `.env` para configurar suas senhas de banco de dados e a URL pública do seu servidor (DNS ou IP).

### 3. Subir a Infraestrutura
```bash
# Constrói o sistema e sobe em segundo plano
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Sincronizar Banco de Dados (Prisma)
Este comando cria todas as tabelas e schemas necessários (Management, Tenants, etc.):
```bash
docker exec -it mikrogestor_app npx prisma db push
```

---

## 🔄 Comandos Úteis (Operação)

### Visualizar Logs em Tempo Real
```bash
docker compose -f docker-compose.prod.yml logs -f app
```

### Atualizar o Sistema (Update)
```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
docker exec -it mikrogestor_app npx prisma db push
```

### Reiniciar Tudo
```bash
docker compose -f docker-compose.prod.yml restart
```

---

## 🛡️ Segurança Adicional (Nginx + SSL)

Recomendamos utilizar o **Nginx** como Proxy Reverso para habilitar HTTPS (Porta 443).
Configuração básica disponível na pasta `docs/nginx/mikrogestor.conf`.

---
*Equipe Mikrogestor Network - 2025*
