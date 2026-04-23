-- Migration: Create annual vesting statements table
-- Description: Stores generated annual vesting statements for beneficiaries with digital signatures

CREATE TABLE IF NOT EXISTS annual_vesting_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    statement_data JSONB NOT NULL,
    pdf_file_path VARCHAR(500),
    digital_signature TEXT,
    transparency_key_public_address VARCHAR(255),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accessed_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Statement summary fields for quick queries
    total_vested_amount DECIMAL(36, 18) DEFAULT 0,
    total_claimed_amount DECIMAL(36, 18) DEFAULT 0,
    total_unclaimed_amount DECIMAL(36, 18) DEFAULT 0,
    total_fmv_usd DECIMAL(36, 18) DEFAULT 0,
    total_realized_gains_usd DECIMAL(36, 18) DEFAULT 0,
    number_of_vaults INTEGER DEFAULT 0,
    number_of_claims INTEGER DEFAULT 0,
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_year UNIQUE (user_address, year)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_annual_statements_user_address ON annual_vesting_statements(user_address);
CREATE INDEX IF NOT EXISTS idx_annual_statements_year ON annual_vesting_statements(year);
CREATE INDEX IF NOT EXISTS idx_annual_statements_generated_at ON annual_vesting_statements(generated_at);
CREATE INDEX IF NOT EXISTS idx_annual_statements_user_year ON annual_vesting_statements(user_address, year);

-- Add comments for documentation
COMMENT ON TABLE annual_vesting_statements IS 'Stores annual vesting statements with digital signatures for audit purposes';
COMMENT ON COLUMN annual_vesting_statements.statement_data IS 'JSON containing detailed vesting activity, claims, and FMV calculations for the year';
COMMENT ON COLUMN annual_vesting_statements.digital_signature IS 'Digital signature of the PDF using backend transparency private key';
COMMENT ON COLUMN annual_vesting_statements.transparency_key_public_address IS 'Public address of the transparency key used for signing';
COMMENT ON COLUMN annual_vesting_statements.pdf_file_path IS 'Path to the generated PDF file in storage';
COMMENT ON COLUMN annual_vesting_statements.accessed_at IS 'Last time the statement was accessed/downloaded by the user';
COMMENT ON COLUMN annual_vesting_statements.is_archived IS 'Whether the statement has been archived for compliance purposes';
