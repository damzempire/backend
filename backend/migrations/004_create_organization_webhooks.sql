-- Migration: Create organization_webhooks table
CREATE TABLE IF NOT EXISTS organization_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    webhook_url VARCHAR(512) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_webhooks_org_id ON organization_webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_webhooks_url ON organization_webhooks(webhook_url);
