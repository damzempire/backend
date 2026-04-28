CREATE TABLE IF NOT EXISTS vault_liquidity_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL UNIQUE REFERENCES vaults(id) ON DELETE CASCADE,
    token_address VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'healthy',
    quote_asset VARCHAR(255) NOT NULL,
    last_checked_at TIMESTAMP NULL,
    last_alerted_at TIMESTAMP NULL,
    last_slippage DECIMAL(18,8) NULL,
    reference_price DECIMAL(36,18) NULL,
    execution_price DECIMAL(36,18) NULL,
    sell_amount DECIMAL(36,18) NULL,
    quote_amount_received DECIMAL(36,18) NULL,
    insufficient_depth BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_liquidity_alerts_status
    ON vault_liquidity_alerts(status);

CREATE INDEX IF NOT EXISTS idx_vault_liquidity_alerts_token_address
    ON vault_liquidity_alerts(token_address);

CREATE TRIGGER update_vault_liquidity_alerts_updated_at BEFORE UPDATE ON vault_liquidity_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
