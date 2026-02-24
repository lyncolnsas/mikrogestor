# VPN Quota System - Quick Start Guide

## 🚀 Ativação do Sistema

### 1. Executar Migração do Banco de Dados

```bash
# Aplicar migração
npx prisma migrate deploy

# Regenerar Prisma Client
npx prisma generate
```

### 2. Configurar Variável de Ambiente

Adicione ao seu `.env`:

```env
CRON_SECRET=seu-token-secreto-aqui
```

### 3. Configurar Limites de VPN nos Planos

Execute no banco de dados ou via interface admin:

```sql
-- Definir limites para cada plano
UPDATE management.saas_plans SET vpn_limit = 1 WHERE name = 'Basic';
UPDATE management.saas_plans SET vpn_limit = 3 WHERE name = 'Pro';
UPDATE management.saas_plans SET vpn_limit = 10 WHERE name = 'Enterprise';
```

## ✅ Verificação

### Testar Criação de VPN

1. Criar ISP com plano Basic (1 VPN)
2. Tentar criar 2ª VPN → Deve retornar erro

### Testar Downgrade

1. Criar ISP com plano Pro (3 VPNs)
2. Criar 3 VPNs
3. Admin muda para plano Basic
4. Verificar banner de aviso no painel ISP
5. Executar cron manualmente:

```bash
curl -X GET http://localhost:3003/api/cron/vpn-downgrade \
  -H "Authorization: Bearer seu-token-secreto-aqui"
```

## 📊 Monitoramento

### Logs do Cron Job

```bash
# Vercel
vercel logs --follow

# Local
# Verificar console do servidor
```

### Verificar Downgrades Agendados

```sql
SELECT 
  t.name as tenant_name,
  s.downgrade_scheduled_at,
  sp1.name as current_plan,
  sp2.name as target_plan
FROM management.saas_subscriptions s
JOIN management.tenants t ON t.id = s.tenant_id
JOIN management.saas_plans sp1 ON sp1.id = s.plan_id
LEFT JOIN management.saas_plans sp2 ON sp2.id = s.downgrade_target_plan_id
WHERE s.downgrade_scheduled_at IS NOT NULL;
```

## 🔧 Troubleshooting

### Erro: "Tenant não possui assinatura ativa"

- Verificar se o ISP tem uma subscription criada
- Verificar se a subscription está vinculada a um plano

### Cron não está executando

- Verificar `CRON_SECRET` no ambiente
- Verificar logs do Vercel Cron
- Testar endpoint manualmente

### VPNs não sendo desativadas

- Verificar se `downgradeScheduledAt` está no passado
- Executar cron manualmente para debug
- Verificar logs do servidor
