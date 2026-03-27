CREATE TABLE annual_vesting_statements (
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
    
    -- Summary fields for quick queries
    total_vested_amount DECIMAL(36, 18) DEFAULT 0,
    total_claimed_amount DECIMAL(36, 18) DEFAULT 0,
    total_unclaimed_amount DECIMAL(36, 18) DEFAULT 0,
    total_fmv_usd DECIMAL(36, 18) DEFAULT 0,
    total_realized_gains_usd DECIMAL(36, 18) DEFAULT 0,
    number_of_vaults INTEGER DEFAULT 0,
    number_of_claims INTEGER DEFAULT 0,
    
    CONSTRAINT unique_user_year UNIQUE (user_address, year)
);