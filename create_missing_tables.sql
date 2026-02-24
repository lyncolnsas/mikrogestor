SET search_path TO management;

-- Create NAS table
CREATE TABLE IF NOT EXISTS nas (
    id SERIAL PRIMARY KEY,
    nasname TEXT NOT NULL UNIQUE,
    shortname TEXT,
    type TEXT DEFAULT 'other',
    ports INTEGER,
    secret TEXT NOT NULL,
    server TEXT,
    community TEXT,
    description TEXT,
    api_user TEXT DEFAULT 'admin',
    api_password TEXT,
    api_port INTEGER DEFAULT 8728,
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create Customers table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cpf_cnpj TEXT UNIQUE NOT NULL,
    phone TEXT,
    address JSONB,
    status TEXT DEFAULT 'ACTIVE',
    plan_id TEXT REFERENCES saas_plans(id),
    radius_password TEXT,
    asaas_customer_id TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

-- Create Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    status TEXT DEFAULT 'DRAFT',
    total DECIMAL(10, 2) NOT NULL,
    due_date TIMESTAMP(3) NOT NULL,
    paid_at TIMESTAMP(3),
    payment_id TEXT,
    pix_qrcode TEXT,
    payment_url TEXT,
    billing_type TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_status ON invoices(customer_id, status);
