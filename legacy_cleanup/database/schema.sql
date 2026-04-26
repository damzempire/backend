-- Multi-Language Legal Hash Storage Schema for Vesting Vault
-- Supports SHA-256 hashes of Token Purchase Agreements in multiple languages
-- Tracks primary language used during digital signing

-- Investors table
CREATE TABLE investors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supported languages
CREATE TABLE languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL, -- e.g., 'en', 'es', 'zh'
    name VARCHAR(100) NOT NULL, -- e.g., 'English', 'Spanish', 'Mandarin'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token Purchase Agreements (main agreement records)
CREATE TABLE token_purchase_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES investors(id),
    agreement_version VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'draft' -- draft, signed, archived
);

-- Multi-language legal hashes for agreements
CREATE TABLE legal_agreement_hashes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agreement_id UUID NOT NULL REFERENCES token_purchase_agreements(id),
    language_id UUID NOT NULL REFERENCES languages(id),
    sha256_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of the legal document
    content_text TEXT, -- Full text content (optional, for reference)
    is_primary BOOLEAN DEFAULT FALSE, -- Indicates this was the primary language used for signing
    signed_at TIMESTAMP, -- When this version was signed
    signer_wallet_address VARCHAR(42), -- Wallet address of the signer
    digital_signature VARCHAR(255), -- Digital signature proof
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(agreement_id, language_id) -- One hash per language per agreement
);

-- Audit trail for legal agreement changes
CREATE TABLE legal_agreement_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agreement_id UUID NOT NULL REFERENCES token_purchase_agreements(id),
    language_id UUID NOT NULL REFERENCES languages(id),
    action VARCHAR(50) NOT NULL, -- created, updated, signed, primary_set
    old_hash VARCHAR(64), -- Previous hash if applicable
    new_hash VARCHAR(64), -- New hash
    changed_by VARCHAR(255), -- Who made the change
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB -- Additional context
);

-- Indexes for performance
CREATE INDEX idx_investors_wallet ON investors(wallet_address);
CREATE INDEX idx_agreements_investor ON token_purchase_agreements(investor_id);
CREATE INDEX idx_legal_hashes_agreement ON legal_agreement_hashes(agreement_id);
CREATE INDEX idx_legal_hashes_language ON legal_agreement_hashes(language_id);
CREATE INDEX idx_legal_hashes_primary ON legal_agreement_hashes(is_primary);
CREATE INDEX idx_audit_agreement ON legal_agreement_audit_log(agreement_id);

-- Insert default languages
INSERT INTO languages (code, name) VALUES 
('en', 'English'),
('es', 'Spanish'),
('zh', 'Mandarin'),
('fr', 'French'),
('de', 'German'),
('ja', 'Japanese'),
('ko', 'Korean');

-- Function to ensure only one primary language per agreement
CREATE OR REPLACE FUNCTION ensure_single_primary_language()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a new primary language, unset all others for this agreement
    IF NEW.is_primary = TRUE THEN
        UPDATE legal_agreement_hashes 
        SET is_primary = FALSE 
        WHERE agreement_id = NEW.agreement_id 
        AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single primary language constraint
CREATE TRIGGER trigger_single_primary_language
    BEFORE INSERT OR UPDATE ON legal_agreement_hashes
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_language();
