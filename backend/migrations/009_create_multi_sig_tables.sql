-- Create multi_sig_configs table for vault multi-signature configurations
-- This table stores the configuration for multi-signature revocation requirements

CREATE TABLE multi_sig_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_address VARCHAR(42) NOT NULL UNIQUE,
    required_signatures INTEGER NOT NULL DEFAULT 2,
    total_signers INTEGER NOT NULL DEFAULT 3,
    signers JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(42) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments to columns
COMMENT ON TABLE multi_sig_configs IS 'Multi-signature configuration for vault revocation';
COMMENT ON COLUMN multi_sig_configs.id IS 'Primary key UUID';
COMMENT ON COLUMN multi_sig_configs.vault_address IS 'Vault contract address';
COMMENT ON COLUMN multi_sig_configs.required_signatures IS 'Number of signatures required for revocation';
COMMENT ON COLUMN multi_sig_configs.total_signers IS 'Total number of authorized signers';
COMMENT ON COLUMN multi_sig_configs.signers IS 'JSON array of authorized signer addresses';
COMMENT ON COLUMN multi_sig_configs.is_active IS 'Whether multi-sig configuration is active';
COMMENT ON COLUMN multi_sig_configs.created_by IS 'Admin address who created this configuration';
COMMENT ON COLUMN multi_sig_configs.created_at IS 'Configuration creation timestamp';
COMMENT ON COLUMN multi_sig_configs.updated_at IS 'Configuration last update timestamp';

-- Create indexes for multi_sig_configs
CREATE INDEX idx_multi_sig_configs_vault_address ON multi_sig_configs(vault_address);
CREATE INDEX idx_multi_sig_configs_is_active ON multi_sig_configs(is_active);
CREATE INDEX idx_multi_sig_configs_created_by ON multi_sig_configs(created_by);

-- Create revocation_proposals table for multi-signature revocation proposals
CREATE TABLE revocation_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_address VARCHAR(42) NOT NULL,
    beneficiary_address VARCHAR(42) NOT NULL,
    amount_to_revoke DECIMAL(36,18) NOT NULL,
    reason TEXT NOT NULL,
    proposed_by VARCHAR(42) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed')),
    required_signatures INTEGER NOT NULL DEFAULT 2,
    current_signatures INTEGER NOT NULL DEFAULT 0,
    transaction_hash VARCHAR(66),
    executed_at TIMESTAMP,
    expires_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments to revocation_proposals columns
COMMENT ON TABLE revocation_proposals IS 'Multi-signature revocation proposals';
COMMENT ON COLUMN revocation_proposals.id IS 'Primary key UUID';
COMMENT ON COLUMN revocation_proposals.vault_address IS 'Vault contract address';
COMMENT ON COLUMN revocation_proposals.beneficiary_address IS 'Beneficiary wallet address to revoke from';
COMMENT ON COLUMN revocation_proposals.amount_to_revoke IS 'Amount of tokens to revoke';
COMMENT ON COLUMN revocation_proposals.reason IS 'Reason for revocation proposal';
COMMENT ON COLUMN revocation_proposals.proposed_by IS 'Admin address who initiated the proposal';
COMMENT ON COLUMN revocation_proposals.status IS 'Proposal status (pending, approved, rejected, executed, failed)';
COMMENT ON COLUMN revocation_proposals.required_signatures IS 'Number of signatures required for approval';
COMMENT ON COLUMN revocation_proposals.current_signatures IS 'Current number of collected signatures';
COMMENT ON COLUMN revocation_proposals.transaction_hash IS 'Transaction hash of executed revocation';
COMMENT ON COLUMN revocation_proposals.executed_at IS 'Timestamp when proposal was executed';
COMMENT ON COLUMN revocation_proposals.expires_at IS 'Proposal expiration timestamp';
COMMENT ON COLUMN revocation_proposals.metadata IS 'Additional metadata for the proposal';
COMMENT ON COLUMN revocation_proposals.created_at IS 'Proposal creation timestamp';
COMMENT ON COLUMN revocation_proposals.updated_at IS 'Proposal last update timestamp';

-- Create indexes for revocation_proposals
CREATE INDEX idx_revocation_proposals_vault_address ON revocation_proposals(vault_address);
CREATE INDEX idx_revocation_proposals_beneficiary_address ON revocation_proposals(beneficiary_address);
CREATE INDEX idx_revocation_proposals_proposed_by ON revocation_proposals(proposed_by);
CREATE INDEX idx_revocation_proposals_status ON revocation_proposals(status);
CREATE INDEX idx_revocation_proposals_expires_at ON revocation_proposals(expires_at);
CREATE INDEX idx_revocation_proposals_created_at ON revocation_proposals(created_at);
CREATE INDEX idx_revocation_proposals_vault_status ON revocation_proposals(vault_address, status);

-- Create revocation_signatures table for collected signatures
CREATE TABLE revocation_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES revocation_proposals(id) ON DELETE CASCADE,
    signer_address VARCHAR(42) NOT NULL,
    signature TEXT NOT NULL,
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments to revocation_signatures columns
COMMENT ON TABLE revocation_signatures IS 'Signatures collected for revocation proposals';
COMMENT ON COLUMN revocation_signatures.id IS 'Primary key UUID';
COMMENT ON COLUMN revocation_signatures.proposal_id IS 'Associated revocation proposal ID';
COMMENT ON COLUMN revocation_signatures.signer_address IS 'Admin address who signed the proposal';
COMMENT ON COLUMN revocation_signatures.signature IS 'Cryptographic signature of the proposal payload';
COMMENT ON COLUMN revocation_signatures.signed_at IS 'Timestamp when signature was created';
COMMENT ON COLUMN revocation_signatures.is_valid IS 'Whether the signature is valid';
COMMENT ON COLUMN revocation_signatures.metadata IS 'Additional signature metadata';
COMMENT ON COLUMN revocation_signatures.created_at IS 'Signature creation timestamp';
COMMENT ON COLUMN revocation_signatures.updated_at IS 'Signature last update timestamp';

-- Create indexes for revocation_signatures
CREATE INDEX idx_revocation_signatures_proposal_id ON revocation_signatures(proposal_id);
CREATE INDEX idx_revocation_signatures_signer_address ON revocation_signatures(signer_address);
CREATE INDEX idx_revocation_signatures_signed_at ON revocation_signatures(signed_at);
CREATE INDEX idx_revocation_signatures_is_valid ON revocation_signatures(is_valid);

-- Create unique constraint for proposal-signer combination
CREATE UNIQUE INDEX idx_revocation_signatures_proposal_signer ON revocation_signatures(proposal_id, signer_address);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_multi_sig_configs_updated_at BEFORE UPDATE ON multi_sig_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_revocation_proposals_updated_at BEFORE UPDATE ON revocation_proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_revocation_signatures_updated_at BEFORE UPDATE ON revocation_signatures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
