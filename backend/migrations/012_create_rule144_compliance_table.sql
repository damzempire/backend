-- Migration: Create Rule 144 Compliance Tracking Table
-- Description: Tracks SEC Rule 144 compliance for restricted securities holding periods

CREATE TABLE IF NOT EXISTS rule144_compliance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    user_address VARCHAR(255) NOT NULL,
    token_address VARCHAR(255) NOT NULL,
    initial_acquisition_date TIMESTAMP NOT NULL,
    holding_period_months INTEGER NOT NULL DEFAULT 6,
    holding_period_end_date TIMESTAMP NOT NULL,
    is_restricted_security BOOLEAN NOT NULL DEFAULT true,
    exemption_type VARCHAR(20) NOT NULL DEFAULT 'NONE' CHECK (exemption_type IN ('NONE', 'RULE144A', 'RULE144B', 'RULE144C', 'OTHER')),
    compliance_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (compliance_status IN ('PENDING', 'COMPLIANT', 'RESTRICTED')),
    last_claim_attempt_date TIMESTAMP NULL,
    total_amount_acquired DECIMAL(36, 18) NOT NULL DEFAULT 0,
    amount_withdrawn_compliant DECIMAL(36, 18) NOT NULL DEFAULT 0,
    amount_withdrawn_restricted DECIMAL(36, 18) NOT NULL DEFAULT 0,
    jurisdiction VARCHAR(10) NOT NULL DEFAULT 'US',
    verified_by VARCHAR(255) NULL,
    verification_date TIMESTAMP NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_rule144_compliance_vault_id ON rule144_compliance(vault_id);
CREATE INDEX idx_rule144_compliance_user_address ON rule144_compliance(user_address);
CREATE INDEX idx_rule144_compliance_token_address ON rule144_compliance(token_address);
CREATE INDEX idx_rule144_compliance_holding_period_end ON rule144_compliance(holding_period_end_date);
CREATE INDEX idx_rule144_compliance_status ON rule144_compliance(compliance_status);
CREATE INDEX idx_rule144_compliance_restricted ON rule144_compliance(is_restricted_security);

-- Unique constraint to prevent duplicate compliance records per vault/user
CREATE UNIQUE INDEX idx_rule144_compliance_unique_vault_user ON rule144_compliance(vault_id, user_address);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rule144_compliance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_rule144_compliance_updated_at
    BEFORE UPDATE ON rule144_compliance
    FOR EACH ROW
    EXECUTE FUNCTION update_rule144_compliance_updated_at();

-- Add comments for documentation
COMMENT ON TABLE rule144_compliance IS 'Tracks SEC Rule 144 compliance for restricted securities holding periods';
COMMENT ON COLUMN rule144_compliance.vault_id IS 'Associated vault ID';
COMMENT ON COLUMN rule144_compliance.user_address IS 'Beneficiary wallet address';
COMMENT ON COLUMN rule144_compliance.token_address IS 'Token contract address';
COMMENT ON COLUMN rule144_compliance.initial_acquisition_date IS 'Date when tokens were initially acquired';
COMMENT ON COLUMN rule144_compliance.holding_period_months IS 'Required holding period in months (6 or 12 per Rule 144)';
COMMENT ON COLUMN rule144_compliance.holding_period_end_date IS 'Date when holding period expires';
COMMENT ON COLUMN rule144_compliance.is_restricted_security IS 'Whether this is a restricted security under Rule 144';
COMMENT ON COLUMN rule144_compliance.exemption_type IS 'Type of exemption if applicable';
COMMENT ON COLUMN rule144_compliance.compliance_status IS 'Current compliance status';
COMMENT ON COLUMN rule144_compliance.last_claim_attempt_date IS 'Date of last claim attempt';
COMMENT ON COLUMN rule144_compliance.total_amount_acquired IS 'Total amount of tokens initially acquired';
COMMENT ON COLUMN rule144_compliance.amount_withdrawn_compliant IS 'Amount withdrawn after holding period compliance';
COMMENT ON COLUMN rule144_compliance.amount_withdrawn_restricted IS 'Amount withdrawn before holding period (should be 0)';
COMMENT ON COLUMN rule144_compliance.jurisdiction IS 'Jurisdiction for compliance (US, EU, etc.)';
COMMENT ON COLUMN rule144_compliance.verified_by IS 'Admin address that verified this compliance record';
COMMENT ON COLUMN rule144_compliance.verification_date IS 'Date when compliance was verified';
COMMENT ON COLUMN rule144_compliance.notes IS 'Additional notes about compliance status';
