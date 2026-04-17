-- Migration: Create approved_contract_registry table
-- Purpose: Store hashes of audited and approved Soroban WASM files to prevent impersonation scams
-- Created: 2026-03-29

CREATE TABLE IF NOT EXISTS approved_contract_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_address VARCHAR(255) NOT NULL UNIQUE,
  wasm_hash VARCHAR(255) NOT NULL UNIQUE,
  project_name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  audit_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  security_audit_report_url TEXT,
  auditor_address VARCHAR(255),
  audit_timestamp TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_blacklisted BOOLEAN NOT NULL DEFAULT false,
  blacklist_reason TEXT,
  blacklisted_at TIMESTAMP WITH TIME ZONE,
  blacklisted_by VARCHAR(255),
  metadata JSONB,
  compatibility_version VARCHAR(50),
  immutable_terms_hash VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_approved_contract_registry_wasm_hash ON approved_contract_registry(wasm_hash);
CREATE INDEX idx_approved_contract_registry_audit_status ON approved_contract_registry(audit_status);
CREATE INDEX idx_approved_contract_registry_is_active ON approved_contract_registry(is_active);
CREATE INDEX idx_approved_contract_registry_is_blacklisted ON approved_contract_registry(is_blacklisted);
CREATE INDEX idx_approved_contract_registry_project_name ON approved_contract_registry(project_name);

-- Comments
COMMENT ON TABLE approved_contract_registry IS 'Registry of approved Soroban contract WASM hashes to prevent impersonation scams';
COMMENT ON COLUMN approved_contract_registry.contract_address IS 'Stellar contract address of the approved vault';
COMMENT ON COLUMN approved_contract_registry.wasm_hash IS 'SHA256 hash of the audited WASM file';
COMMENT ON COLUMN approved_contract_registry.project_name IS 'Human-readable project name';
COMMENT ON COLUMN approved_contract_registry.version IS 'Contract version (e.g., "1.0.0")';
COMMENT ON COLUMN approved_contract_registry.audit_status IS 'Current audit status: pending, auditing, approved, rejected';
COMMENT ON COLUMN approved_contract_registry.security_audit_report_url IS 'URL to the security audit report';
COMMENT ON COLUMN approved_contract_registry.auditor_address IS 'Address of the auditor/organization that approved this contract';
COMMENT ON COLUMN approved_contract_registry.is_active IS 'Whether this contract is currently active and approved';
COMMENT ON COLUMN approved_contract_registry.is_blacklisted IS 'If true, this contract is flagged as malicious/impersonation';
COMMENT ON COLUMN approved_contract_registry.blacklist_reason IS 'Reason for blacklisting (if applicable)';
