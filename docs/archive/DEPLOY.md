# Guia de Deploy - Ubuntu VPS (Docker)

Este guia descreve os passos para colocar o **Mikrogestor.com** em produção em um servidor Ubuntu usando Docker.

## 📋 Pré-requisitos

- Um servidor VPS com Ubuntu 20.04 ou 22.04 LTS.
- Acesso SSH ao servidor (root ou usuário com sudo).
- Um domínio apontado para o IP do servidor (recomendado).

---

## 🚀 Passo 1: Preparar o Servidor

Acesse seu servidor via SSH e execute o script de automação:

### Usando o Script Automático (Recomendado)

Envie o arquivo `setup_production.sh` para o servidor ou crie-o lá:

1. **Upload via SCP (do seu computador):**

   ```powershell
   scp setup_production.sh root@seu-ip-vps:/root/
   ```

2. **Executar no Servidor:**

   ```bash
   chmod +x setup_production.sh
   sudo ./setup_production.sh
   ```

Este script irá automaticamente:

- Atualizar o sistema.
- Instalar Docker e Docker Compose.
- Instalar e configurar WireGuard.
- Instalar FreeRADIUS e preparar para conexão com o banco.
- Configurar Firewall (UFW) com as portas necessárias.

---

### (Alternativa Manual) Instalar Docker e Docker Compose

Se preferir não usar o script, siga os passos abaixo:

```bash
sudo apt update && sudo apt upgrade -y
```

### Instalar Docker e Docker Compose

Instale o motor Docker oficial:

```bash
# Instalar dependências
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Adicionar chave GPG do Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Adicionar repositório
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verificar instalação
sudo docker --version
sudo docker compose version
```

---

## 📦 Passo 2: Transferir o Projeto

Recomendamos transferir o **código fonte** e construir a imagem no servidor. Isso garante que o Docker gerencie o Banco de Dados e Redis automaticamente via `docker-compose`.

### Opção A: Usando Git (Recomendado)

Se você usa Github/Gitlab:

```bash
git clone https://github.com/seu-usuario/mikrogestor.git /opt/mikrogestor
cd /opt/mikrogestor
```

### Opção B: Upload Manual (SCP/SFTP)

Se preferir subir os arquivos da sua máquina local:

1. Compacte a pasta do projeto (excluindo `node_modules`, `.next`, `.git`).
2. Envie para o servidor:

   ```powershell
   # No seu Windows (PowerShell)
   scp -r nome-do-arquivo.zip root@seu-ip-vps:/opt/
   ```

3. No servidor, descompacte:

   ```bash
   sudo apt install unzip
   cd /opt
   unzip nome-do-arquivo.zip -d mikrogestor
   cd mikrogestor
   ```

---

## ⚙️ Passo 3: Configuração

Crie o arquivo `.env` de produção baseado no seu exemplo local.

```bash
# Dentro da pasta /opt/mikrogestor
cp .env .env.production
nano .env.production
```

**Importante:**

- Altere `DATABASE_URL` apenas se usar um banco externo. Se usar o do Docker, mantenha como está no `docker-compose.yml`.
- Defina `NEXTAUTH_URL` para o seu domínio (ex: `https://app.mikrogestor.com`).
- Gere um novo `NEXTAUTH_SECRET` forte.

---

## ▶️ Passo 4: Rodar a Aplicação

Inicie os containers. O Docker irá baixar o Postgres/Redis e construir sua aplicação Next.js.

```bash
# Construir e iniciar em background
sudo docker compose -f docker-compose.yml up -d --build
```

Verifique se tudo está rodando:

```bash
sudo docker compose ps
sudo docker compose logs -f app
```

A aplicação estará rodando na porta **3000** do servidor.

---

## 🔒 Passo 5: Configurar Nginx e HTTPS (SSL)

Para acessar via domínio (sem precisar digitar :3000) e ter cadeado de segurança (HTTPS).

### 1. Instalar Nginx e Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Configurar o Proxy Reverso

Crie um arquivo de configuração para o site:

```bash
sudo nano /etc/nginx/sites-available/mikrogestor
```

Cole o conteúdo abaixo (ajuste `seu-dominio.com`):

```nginx
server {
    server_name seu-dominio.com www.seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative o site e reinicie o Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/mikrogestor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Gerar Certificado SSL (HTTPS)

```bash
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

Siga as instruções na tela. O Certbot configurará o HTTPS automaticamente.

---

## ✅ Conclusão

Seu sistema agora deve estar acessível em `https://seu-dominio.com`.

### Comandos Úteis

- **Parar tudo:** `docker compose down`
- **Reiniciar app:** `docker compose restart app`
- **Ver logs:** `docker compose logs -f --tail=100`
