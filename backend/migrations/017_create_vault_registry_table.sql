-- Migration: Create vault_registry table for ecosystem-wide vault discovery
-- This table maintains a global map of ContractID -> ProjectName for public discovery

CREATE TABLE IF NOT EXISTS vault_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id VARCHAR(255) NOT NULL UNIQUE,
    project_name VARCHAR(500) NOT NULL,
    creator_address VARCHAR(255) NOT NULL,
    deployment_ledger BIGINT NOT NULL,
    deployment_transaction_hash VARCHAR(255),
    token_address VARCHAR(255),
    vault_type VARCHAR(50) NOT NULL DEFAULT 'standard' CHECK (vault_type IN ('standard', 'cliff', 'dynamic')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    discovered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_vault_registry_contract_id ON vault_registry(contract_id);
CREATE INDEX IF NOT EXISTS idx_vault_registry_creator_address ON vault_registry(creator_address);
CREATE INDEX IF NOT EXISTS idx_vault_registry_project_name ON vault_registry(project_name);
CREATE INDEX IF NOT EXISTS idx_vault_registry_deployment_ledger ON vault_registry(deployment_ledger);
CREATE INDEX IF NOT EXISTS idx_vault_registry_is_active ON vault_registry(is_active);
CREATE INDEX IF NOT EXISTS idx_vault_registry_discovered_at ON vault_registry(discovered_at);
CREATE INDEX IF NOT EXISTS idx_vault_registry_vault_type ON vault_registry(vault_type);

-- Create a GIN index on the metadata JSONB column for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_vault_registry_metadata_gin ON vault_registry USING GIN(metadata);

-- Add comments for documentation
COMMENT ON TABLE vault_registry IS 'Registry of all vault contracts deployed on the Stellar network for ecosystem-wide discovery';
COMMENT ON COLUMN vault_registry.contract_id IS 'Stellar contract address/hash of the vault';
COMMENT ON COLUMN vault_registry.project_name IS 'Human-readable project name for the vault';
COMMENT ON COLUMN vault_registry.creator_address IS 'Address of the vault creator/owner';
COMMENT ON COLUMN vault_registry.deployment_ledger IS 'Ledger number when the vault was deployed';
COMMENT ON COLUMN vault_registry.deployment_transaction_hash IS 'Transaction hash of vault deployment';
COMMENT ON COLUMN vault_registry.token_address IS 'Token address associated with the vault';
COMMENT ON COLUMN vault_registry.vault_type IS 'Type of vault contract (standard, cliff, dynamic)';
COMMENT ON COLUMN vault_registry.is_active IS 'Whether this vault is currently active';
COMMENT ON COLUMN vault_registry.metadata IS 'Additional metadata about the vault (JSON format)';
COMMENT ON COLUMN vault_registry.discovered_at IS 'When this vault was discovered by the indexer';
COMMENT ON COLUMN vault_registry.updated_at IS 'Last time this record was updated';

-- Create trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_vault_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_vault_registry_updated_at
    BEFORE UPDATE ON vault_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_vault_registry_updated_at();

-- Insert initial indexer state for vault registry
INSERT INTO indexer_state (service_name, last_ingested_ledger, updated_at)
VALUES ('vault-registry-indexer', 0, NOW())
ON CONFLICT (service_name) DO NOTHING;
