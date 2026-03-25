-- Create Vaults table
CREATE TABLE IF NOT EXISTS vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_address VARCHAR(42) NOT NULL UNIQUE,
    owner_address VARCHAR(42) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    total_amount DECIMAL(36,18) NOT NULL DEFAULT 0,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    cliff_date TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create SubSchedules table
CREATE TABLE IF NOT EXISTS sub_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    top_up_amount DECIMAL(36,18) NOT NULL,
    top_up_transaction_hash VARCHAR(66) NOT NULL UNIQUE,
    top_up_timestamp TIMESTAMP NOT NULL,
    cliff_duration INTEGER NULL,
    cliff_date TIMESTAMP NULL,
    vesting_start_date TIMESTAMP NOT NULL,
    vesting_duration INTEGER NOT NULL,
    amount_released DECIMAL(36,18) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Vaults table
CREATE INDEX IF NOT EXISTS idx_vaults_address ON vaults(vault_address);
CREATE INDEX IF NOT EXISTS idx_vaults_owner ON vaults(owner_address);
CREATE INDEX IF NOT EXISTS idx_vaults_token ON vaults(token_address);
CREATE INDEX IF NOT EXISTS idx_vaults_active ON vaults(is_active);

-- Indexes for SubSchedules table
CREATE INDEX IF NOT EXISTS idx_sub_schedules_vault_id ON sub_schedules(vault_id);
CREATE INDEX IF NOT EXISTS idx_sub_schedules_tx_hash ON sub_schedules(top_up_transaction_hash);
CREATE INDEX IF NOT EXISTS idx_sub_schedules_timestamp ON sub_schedules(top_up_timestamp);
CREATE INDEX IF NOT EXISTS idx_sub_schedules_cliff_date ON sub_schedules(cliff_date);
CREATE INDEX IF NOT EXISTS idx_sub_schedules_active ON sub_schedules(is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_vaults_updated_at BEFORE UPDATE ON vaults
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_schedules_updated_at BEFORE UPDATE ON sub_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
