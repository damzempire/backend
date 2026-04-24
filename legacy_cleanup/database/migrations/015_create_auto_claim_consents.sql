-- Migration: Create auto_claim_consents table
-- Purpose: Track beneficiary consent for automatic batch claim processing (Enterprise Payroll)
-- Created: 2026-03-29

CREATE TABLE IF NOT EXISTS auto_claim_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_address VARCHAR(255) NOT NULL,
  vault_address VARCHAR(255) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  consent_given_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  consent_metadata JSONB,
  max_claim_percentage DECIMAL(5, 2) DEFAULT 100.00,
  min_claim_amount DECIMAL(36, 18),
  claim_frequency VARCHAR(50) DEFAULT 'immediate',
  last_claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_beneficiary_vault UNIQUE (beneficiary_address, vault_address)
);

-- Indexes for performance
CREATE INDEX idx_auto_claim_consents_beneficiary ON auto_claim_consents(beneficiary_address);
CREATE INDEX idx_auto_claim_consents_vault ON auto_claim_consents(vault_address);
CREATE INDEX idx_auto_claim_consents_enabled ON auto_claim_consents(is_enabled);

-- Comments
COMMENT ON TABLE auto_claim_consents IS 'Beneficiary consent for automated batch claim processing';
COMMENT ON COLUMN auto_claim_consents.beneficiary_address IS 'Beneficiary wallet address';
COMMENT ON COLUMN auto_claim_consents.vault_address IS 'Vault contract address';
COMMENT ON COLUMN auto_claim_consents.is_enabled IS 'Whether auto-claim is enabled for this beneficiary';
COMMENT ON COLUMN auto_claim_consents.consent_given_at IS 'When consent was given';
COMMENT ON COLUMN auto_claim_consents.consent_metadata IS 'Additional metadata about the consent';
COMMENT ON COLUMN auto_claim_consents.max_claim_percentage IS 'Maximum percentage of vested amount that can be auto-claimed (0-100)';
COMMENT ON COLUMN auto_claim_consents.min_claim_amount IS 'Minimum amount threshold for auto-claim';
COMMENT ON COLUMN auto_claim_consents.claim_frequency IS 'How frequently to process auto-claims: immediate, daily, weekly, monthly';
COMMENT ON COLUMN auto_claim_consents.last_claimed_at IS 'When the last auto-claim was processed';
