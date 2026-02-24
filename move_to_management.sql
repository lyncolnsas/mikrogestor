-- Create management schema if not exists
CREATE SCHEMA IF NOT EXISTS management;

-- Move tables from public to management schema safely
ALTER TABLE IF EXISTS public.saas_plans SET SCHEMA management;
ALTER TABLE IF EXISTS public.tenants SET SCHEMA management;
ALTER TABLE IF EXISTS public.saas_invoices SET SCHEMA management;
ALTER TABLE IF EXISTS public.users SET SCHEMA management;
ALTER TABLE IF EXISTS public.saas_notifications SET SCHEMA management;
ALTER TABLE IF EXISTS public.saas_notification_reads SET SCHEMA management;
ALTER TABLE IF EXISTS public.tenant_provisioning_logs SET SCHEMA management;
ALTER TABLE IF EXISTS public.saas_audit_logs SET SCHEMA management;
ALTER TABLE IF EXISTS public.vpn_servers SET SCHEMA management;
ALTER TABLE IF EXISTS public.vpn_tunnels SET SCHEMA management;
ALTER TABLE IF EXISTS public.vpn_server_stats SET SCHEMA management;
ALTER TABLE IF EXISTS public.vpn_traffic_logs SET SCHEMA management;
ALTER TABLE IF EXISTS public.saas_subscriptions SET SCHEMA management;
ALTER TABLE IF EXISTS public.tenant_landing_configs SET SCHEMA management;
ALTER TABLE IF EXISTS public.testimonials SET SCHEMA management;
ALTER TABLE IF EXISTS public.faqs SET SCHEMA management;
ALTER TABLE IF EXISTS public.financial_adjustments SET SCHEMA management;
ALTER TABLE IF EXISTS public.service_orders SET SCHEMA management;
ALTER TABLE IF EXISTS public.tenant_notifications SET SCHEMA management;
ALTER TABLE IF EXISTS public.tenant_notification_reads SET SCHEMA management;

-- Move migrations table too so Prisma knows history
ALTER TABLE IF EXISTS public._prisma_migrations SET SCHEMA management;
