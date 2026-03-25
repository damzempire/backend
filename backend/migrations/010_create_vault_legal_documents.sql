CREATE TABLE IF NOT EXISTS vault_legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL DEFAULT 'TOKEN_PURCHASE_AGREEMENT',
    document_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    file_size_bytes INTEGER NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    uploaded_by VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    last_verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_legal_documents_vault_type
    ON vault_legal_documents(vault_id, document_type);

CREATE INDEX IF NOT EXISTS idx_vault_legal_documents_sha256_hash
    ON vault_legal_documents(sha256_hash);

CREATE TRIGGER update_vault_legal_documents_updated_at BEFORE UPDATE ON vault_legal_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
