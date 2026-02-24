# ✅ CREDENCIAIS DO MIKROGESTOR - ATUALIZADAS

## 🔐 **CREDENCIAIS DE LOGIN (FUNCIONANDO)**

```
Email: lyncoln.sas@gmail.com
Senha: 22101844
Role:  SUPER_ADMIN
```

## 🚀 **COMO FAZER LOGIN**

### 1. Iniciar o Sistema

Execute:

```bash
start-local.bat
```

Ou manualmente:

```bash
# Gerar Prisma Client
npx prisma generate

# Rodar aplicação
npm run dev
```

### 2. Acessar a Aplicação

Abra o navegador em:

```
http://localhost:3000
```

### 3. Fazer Login

- **Email:** `lyncoln.sas@gmail.com`
- **Senha:** `22101844`

### 4. Clicar em "Entrar"

Você será redirecionado para o painel de Super Admin.

---

## ✅ **VERIFICAÇÃO**

As credenciais foram testadas e estão funcionando:

- ✅ Hash da senha correto (60 caracteres)
- ✅ Senha verificada com bcrypt
- ✅ Usuário criado no banco de dados
- ✅ Role: SUPER_ADMIN

---

## 📊 **STATUS DO SISTEMA**

| Componente | Status | Porta |
|------------|--------|-------|
| PostgreSQL | ✅ Rodando (Docker) | 5432 |
| Redis | ✅ Rodando (Docker) | 6379 |
| Aplicação | ⚠️ Rodar localmente | 3000 |

---

## 🔧 **SE PRECISAR RESETAR A SENHA**

Execute:

```bash
npx tsx scripts/reset-user.ts
```

Este script irá:

1. Apagar todos os usuários
2. Criar novo usuário com as credenciais acima
3. Verificar que a senha funciona

---

## 📝 **OUTROS USUÁRIOS DO SISTEMA**

### Banco de Dados PostgreSQL

```
Usuário: postgres
Senha: mikrogestor_secure_2026
Database: mikrogestor_prod
Host: localhost
Porta: 5432
```

### RADIUS (Teste)

```
Usuário: testuser
Senha: testpass
```

### Redis

```
Sem autenticação
Host: localhost
Porta: 6379
```

---

## 🎉 **PRONTO PARA USAR!**

Execute `start-local.bat` e faça login com:

- **Email:** <lyncoln.sas@gmail.com>
- **Senha:** 22101844

**Acesse:** <http://localhost:3000>
