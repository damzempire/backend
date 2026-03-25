-- Migration: Add token_type field to vaults table
-- This field enables support for dynamic balance tokens (fee-on-transfer, rebase, tax tokens)

-- Create ENUM type for token_type
CREATE TYPE token_type_enum AS ENUM ('static', 'dynamic');

-- Add token_type column to vaults table
ALTER TABLE vaults 
ADD COLUMN token_type token_type_enum NOT NULL DEFAULT 'static';

-- Add comment to explain the field
COMMENT ON COLUMN vaults.token_type IS 'Token type: static (default) or dynamic (fee-on-transfer, rebase, tax tokens)';
