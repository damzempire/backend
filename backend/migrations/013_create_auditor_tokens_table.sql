-- Migration: Create auditor_tokens table for read-only auditor API access
-- Auditors are issued temporary, scoped tokens for due diligence reviews

CREATE TABLE IF NOT EXISTS auditor_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(128) NOT NULL,
    auditor_name VARCHAR(255) NOT NULL,
    auditor_firm VARCHAR(255),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    issued_by VARCHAR(255) NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT ARRAY['vesting_schedules', 'withdrawal_history', 'contract_hashes'],
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_at TIMESTAMP,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditor_tokens_org_id ON auditor_tokens(org_id);
CREATE INDEX IF NOT EXISTS idx_auditor_tokens_token_hash ON auditor_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_auditor_tokens_expires_at ON auditor_tokens(expires_at);
