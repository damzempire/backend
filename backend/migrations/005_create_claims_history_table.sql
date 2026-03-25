-- Create Claims History table for tracking token claims and USD values
CREATE TABLE IF NOT EXISTS claims_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address VARCHAR(42) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    amount_claimed DECIMAL(36,18) NOT NULL,
    claim_timestamp TIMESTAMP NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL UNIQUE,
    block_number BIGINT NOT NULL,
    price_at_claim_usd DECIMAL(36,18) NULL COMMENT 'Token price in USD at the time of claim for realized gains calculation',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Claims History table
CREATE INDEX IF NOT EXISTS idx_claims_history_user_address ON claims_history(user_address);
CREATE INDEX IF NOT EXISTS idx_claims_history_token_address ON claims_history(token_address);
CREATE INDEX IF NOT EXISTS idx_claims_history_claim_timestamp ON claims_history(claim_timestamp);
CREATE INDEX IF NOT EXISTS idx_claims_history_transaction_hash ON claims_history(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_claims_history_price_not_null ON claims_history(price_at_claim_usd) WHERE price_at_claim_usd IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_claims_history_updated_at BEFORE UPDATE ON claims_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();