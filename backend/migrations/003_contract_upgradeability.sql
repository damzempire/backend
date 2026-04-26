-- Migration: Contract Upgradeability via WASM Hash Rotation
-- Description: Add tables for proxy-style contract upgrade functionality
-- Version: 1.0.0
-- Date: 2024-03-26

-- Create certified builds table
CREATE TABLE IF NOT EXISTS certified_builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    build_id VARCHAR(255) NOT NULL UNIQUE,
    wasm_hash VARCHAR(64) NOT NULL UNIQUE,
    version VARCHAR(50) NOT NULL,
    commit_hash VARCHAR(255) NOT NULL,
    build_timestamp TIMESTAMP NOT NULL,
    builder_address VARCHAR(56) NOT NULL,
    build_metadata JSONB,
    verification_signature TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    security_audit_passed BOOLEAN DEFAULT false,
    audit_report_url VARCHAR(500),
    compatibility_version VARCHAR(50),
    immutable_terms_compatible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for certified_builds
CREATE INDEX IF NOT EXISTS idx_certified_builds_wasm_hash ON certified_builds(wasm_hash);
CREATE INDEX IF NOT EXISTS idx_certified_builds_build_id ON certified_builds(build_id);
CREATE INDEX IF NOT EXISTS idx_certified_builds_version ON certified_builds(version);
CREATE INDEX IF NOT EXISTS idx_certified_builds_is_active ON certified_builds(is_active);
CREATE INDEX IF NOT EXISTS idx_certified_builds_security_audit_passed ON certified_builds(security_audit_passed);
CREATE INDEX IF NOT EXISTS idx_certified_builds_compatibility_version ON certified_builds(compatibility_version);

-- Create contract upgrade proposals table
CREATE TABLE IF NOT EXISTS contract_upgrade_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_address VARCHAR(56) NOT NULL,
    current_wasm_hash VARCHAR(64) NOT NULL,
    proposed_wasm_hash VARCHAR(64) NOT NULL,
    upgrade_reason TEXT NOT NULL,
    certified_build_id VARCHAR(255),
    proposed_by VARCHAR(56) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'proposed' 
        CHECK (status IN ('proposed', 'pending_verification', 'verified', 'pending_approval', 'approved', 'rejected', 'executed', 'failed')),
    required_signatures INTEGER NOT NULL DEFAULT 2,
    total_signers INTEGER NOT NULL DEFAULT 3,
    signers JSONB NOT NULL,
    immutable_terms_hash VARCHAR(64) NOT NULL,
    verification_result JSONB,
    execution_tx_hash VARCHAR(255),
    expires_at TIMESTAMP,
    executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for contract_upgrade_proposals
CREATE INDEX IF NOT EXISTS idx_contract_upgrade_proposals_vault_address ON contract_upgrade_proposals(vault_address);
CREATE INDEX IF NOT EXISTS idx_contract_upgrade_proposals_status ON contract_upgrade_proposals(status);
CREATE INDEX IF NOT EXISTS idx_contract_upgrade_proposals_proposed_by ON contract_upgrade_proposals(proposed_by);
CREATE INDEX IF NOT EXISTS idx_contract_upgrade_proposals_proposed_wasm_hash ON contract_upgrade_proposals(proposed_wasm_hash);
CREATE INDEX IF NOT EXISTS idx_contract_upgrade_proposals_expires_at ON contract_upgrade_proposals(expires_at);
CREATE INDEX IF NOT EXISTS idx_contract_upgrade_proposals_created_at ON contract_upgrade_proposals(created_at);

-- Create contract upgrade signatures table
CREATE TABLE IF NOT EXISTS contract_upgrade_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES contract_upgrade_proposals(id) ON DELETE CASCADE,
    signer_address VARCHAR(56) NOT NULL,
    signature TEXT NOT NULL,
    decision VARCHAR(10) NOT NULL CHECK (decision IN ('approve', 'reject')),
    signing_reason TEXT,
    is_valid BOOLEAN DEFAULT true,
    validation_error TEXT,
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proposal_id, signer_address)
);

-- Create indexes for contract_upgrade_signatures
CREATE INDEX IF NOT EXISTS idx_contract_upgrade_signatures_proposal_id ON contract_upgrade_signatures(proposal_id);
CREATE INDEX IF NOT EXISTS idx_contract_upgrade_signatures_signer_address ON contract_upgrade_signatures(signer_address);
CREATE INDEX IF NOT EXISTS idx_contract_upgrade_signatures_decision ON contract_upgrade_signatures(decision);
CREATE INDEX IF NOT EXISTS idx_contract_upgrade_signatures_is_valid ON contract_upgrade_signatures(is_valid);
CREATE INDEX IF NOT EXISTS idx_contract_upgrade_signatures_expires_at ON contract_upgrade_signatures(expires_at);

-- Create contract upgrade audit logs table
CREATE TABLE IF NOT EXISTS contract_upgrade_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID REFERENCES contract_upgrade_proposals(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL 
        CHECK (action IN (
            'proposal_created', 'verification_started', 'verification_completed', 'verification_failed',
            'signature_added', 'signature_revoked', 'proposal_approved', 'proposal_rejected',
            'execution_started', 'execution_completed', 'execution_failed',
            'proposal_expired', 'proposal_cancelled'
        )),
    performed_by VARCHAR(56) NOT NULL,
    action_details JSONB,
    previous_state JSONB,
    new_state JSONB,
    ip_address INET,
    user_agent TEXT,
    transaction_hash VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for contract_upgrade_audit_logs
CREATE INDEX IF NOT EXISTS idx_contract_upgrade_audit_logs_proposal_id ON contract_upgrade_audit_logs(proposal_id);
CREATE INDEX IF NOT EXISTS idx_contract_upgrade_audit_logs_action ON contract_upgrade_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_contract_upgrade_audit_logs_performed_by ON contract_upgrade_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_contract_upgrade_audit_logs_created_at ON contract_upgrade_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_contract_upgrade_audit_logs_transaction_hash ON contract_upgrade_audit_logs(transaction_hash);

-- Add foreign key constraints if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_contract_upgrade_signatures_proposal_id'
    ) THEN
        ALTER TABLE contract_upgrade_signatures 
        ADD CONSTRAINT fk_contract_upgrade_signatures_proposal_id 
        FOREIGN KEY (proposal_id) REFERENCES contract_upgrade_proposals(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_contract_upgrade_audit_logs_proposal_id'
    ) THEN
        ALTER TABLE contract_upgrade_audit_logs 
        ADD CONSTRAINT fk_contract_upgrade_audit_logs_proposal_id 
        FOREIGN KEY (proposal_id) REFERENCES contract_upgrade_proposals(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_certified_builds_updated_at ON certified_builds;
CREATE TRIGGER update_certified_builds_updated_at 
    BEFORE UPDATE ON certified_builds 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contract_upgrade_proposals_updated_at ON contract_upgrade_proposals;
CREATE TRIGGER update_contract_upgrade_proposals_updated_at 
    BEFORE UPDATE ON contract_upgrade_proposals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contract_upgrade_signatures_updated_at ON contract_upgrade_signatures;
CREATE TRIGGER update_contract_upgrade_signatures_updated_at 
    BEFORE UPDATE ON contract_upgrade_signatures 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample certified build for testing
INSERT INTO certified_builds (
    build_id,
    wasm_hash,
    version,
    commit_hash,
    build_timestamp,
    builder_address,
    verification_signature,
    build_metadata,
    security_audit_passed,
    audit_report_url,
    compatibility_version,
    immutable_terms_compatible
) VALUES (
    'demo-build-001',
    'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890',
    '1.1.0',
    'abc123def456789',
    CURRENT_TIMESTAMP,
    'GDEMOBUILDER123456789ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHI',
    'demo_signature_for_testing_purposes_only',
    '{"contract_type": "vesting_vault", "immutable_terms_compatible": true, "compatibility_version": "1.1.0"}',
    true,
    'https://audit.example.com/demo-report',
    '1.1.0',
    true
) ON CONFLICT (build_id) DO NOTHING;

-- Create views for common queries
CREATE OR REPLACE VIEW upgrade_proposal_summary AS
SELECT 
    p.id,
    p.vault_address,
    p.status,
    p.proposed_wasm_hash,
    p.upgrade_reason,
    p.proposed_by,
    p.created_at,
    p.expires_at,
    COUNT(s.id) FILTER (WHERE s.decision = 'approve' AND s.is_valid = true) as approvals,
    COUNT(s.id) FILTER (WHERE s.decision = 'reject' AND s.is_valid = true) as rejections,
    p.required_signatures,
    p.total_signers
FROM contract_upgrade_proposals p
LEFT JOIN contract_upgrade_signatures s ON p.id = s.proposal_id
GROUP BY p.id, p.vault_address, p.status, p.proposed_wasm_hash, p.upgrade_reason, p.proposed_by, p.created_at, p.expires_at, p.required_signatures, p.total_signers;

CREATE OR REPLACE VIEW certified_build_summary AS
SELECT 
    id,
    build_id,
    wasm_hash,
    version,
    security_audit_passed,
    is_active,
    immutable_terms_compatible,
    created_at,
    build_metadata
FROM certified_builds;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON certified_builds TO vesting_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON contract_upgrade_proposals TO vesting_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON contract_upgrade_signatures TO vesting_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON contract_upgrade_audit_logs TO vesting_app;
-- GRANT SELECT ON upgrade_proposal_summary TO vesting_app;
-- GRANT SELECT ON certified_build_summary TO vesting_app;

-- Add comments for documentation
COMMENT ON TABLE certified_builds IS 'Stores certified WASM builds with security audit information';
COMMENT ON TABLE contract_upgrade_proposals IS 'Stores upgrade proposals for vault contracts';
COMMENT ON TABLE contract_upgrade_signatures IS 'Stores multi-signature approvals for upgrade proposals';
COMMENT ON TABLE contract_upgrade_audit_logs IS 'Comprehensive audit trail for upgrade operations';

COMMENT ON COLUMN certified_builds.wasm_hash IS 'SHA-256 hash of the WASM build';
COMMENT ON COLUMN certified_builds.build_metadata IS 'JSON metadata about the build including contract type and compatibility';
COMMENT ON COLUMN certified_builds.immutable_terms_compatible IS 'Whether the build preserves immutable vesting terms';

COMMENT ON COLUMN contract_upgrade_proposals.immutable_terms_hash IS 'Hash of immutable terms to ensure they are preserved';
COMMENT ON COLUMN contract_upgrade_proposals.verification_result IS 'Results of WASM hash verification';
COMMENT ON COLUMN contract_upgrade_proposals.expires_at IS 'When the proposal expires and can no longer be executed';

COMMENT ON COLUMN contract_upgrade_signatures.validation_error IS 'Error message if signature validation failed';
COMMENT ON COLUMN contract_upgrade_signatures.expires_at IS 'When the signature expires and becomes invalid';

COMMENT ON COLUMN contract_upgrade_audit_logs.action_details IS 'Detailed information about the action performed';
COMMENT ON COLUMN contract_upgrade_audit_logs.previous_state IS 'State of the proposal before the action';
COMMENT ON COLUMN contract_upgrade_audit_logs.new_state IS 'State of the proposal after the action';

-- Migration completed successfully
SELECT 'Contract upgradeability migration completed successfully' as status;
