CREATE TABLE IF NOT EXISTS vault_balance_monitor_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL UNIQUE REFERENCES vaults(id) ON DELETE CASCADE,
    token_address VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'healthy',
    last_checked_at TIMESTAMP NULL,
    last_alerted_at TIMESTAMP NULL,
    last_discrepancy_signature VARCHAR(128) NULL,
    last_on_chain_balance DECIMAL(36,18) NULL,
    last_expected_unvested_balance DECIMAL(36,18) NULL,
    last_expected_unclaimed_balance DECIMAL(36,18) NULL,
    last_difference DECIMAL(36,18) NULL,
    last_error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_balance_monitor_states_status
    ON vault_balance_monitor_states(status);

CREATE INDEX IF NOT EXISTS idx_vault_balance_monitor_states_token_address
    ON vault_balance_monitor_states(token_address);

CREATE TRIGGER update_vault_balance_monitor_states_updated_at BEFORE UPDATE ON vault_balance_monitor_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
