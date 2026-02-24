CREATE TABLE IF NOT EXISTS "management"."financial_configs" (
    "id" TEXT NOT NULL,
    "gateway_credentials" JSONB,
    "interest_rate" DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    "penalty_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "grace_period" INTEGER NOT NULL DEFAULT 5,
    "auto_block" BOOLEAN NOT NULL DEFAULT true,
    "auto_unblock" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_configs_pkey" PRIMARY KEY ("id")
);
