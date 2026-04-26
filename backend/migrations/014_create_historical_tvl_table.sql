-- Create historical_tvl table for tracking TVL changes over time
-- This table enables correlation analysis between TVL and price movements

CREATE TABLE IF NOT EXISTS historical_tvl (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL UNIQUE,
    total_value_locked DECIMAL(36,18) NOT NULL DEFAULT 0,
    active_vaults_count INTEGER NOT NULL DEFAULT 0,
    tvl_change_24h DECIMAL(36,18),
    tvl_change_percentage_24h DECIMAL(10,6),
    total_vault_balance DECIMAL(36,18) NOT NULL DEFAULT 0,
    token_address VARCHAR(255),
    snapshot_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    data_quality VARCHAR(10) NOT NULL DEFAULT 'good' CHECK (data_quality IN ('excellent', 'good', 'fair', 'poor')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_historical_tvl_snapshot_date ON historical_tvl(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_historical_tvl_snapshot_timestamp ON historical_tvl(snapshot_timestamp);
CREATE INDEX IF NOT EXISTS idx_historical_tvl_token_address ON historical_tvl(token_address);
CREATE INDEX IF NOT EXISTS idx_historical_tvl_date_token ON historical_tvl(snapshot_date, token_address);

-- Add comments for documentation
COMMENT ON TABLE historical_tvl IS 'Historical snapshots of Total Value Locked (TVL) for correlation analysis with price movements';
COMMENT ON COLUMN historical_tvl.id IS 'Unique identifier for the TVL snapshot';
COMMENT ON COLUMN historical_tvl.snapshot_date IS 'Date of the TVL snapshot (YYYY-MM-DD format)';
COMMENT ON COLUMN historical_tvl.total_value_locked IS 'Total value locked across all active vaults at snapshot time in USD';
COMMENT ON COLUMN historical_tvl.active_vaults_count IS 'Number of active vaults at snapshot time';
COMMENT ON COLUMN historical_tvl.tvl_change_24h IS 'TVL change in the last 24 hours (USD)';
COMMENT ON COLUMN historical_tvl.tvl_change_percentage_24h IS 'TVL change percentage in the last 24 hours';
COMMENT ON COLUMN historical_tvl.total_vault_balance IS 'Total balance across all vaults (raw token amount)';
COMMENT ON COLUMN historical_tvl.token_address IS 'Primary token address for the vaults (if applicable)';
COMMENT ON COLUMN historical_tvl.snapshot_timestamp IS 'Exact timestamp when snapshot was taken';
COMMENT ON COLUMN historical_tvl.data_quality IS 'Quality rating of the TVL snapshot data (excellent, good, fair, poor)';

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_historical_tvl_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_historical_tvl_updated_at
    BEFORE UPDATE ON historical_tvl
    FOR EACH ROW
    EXECUTE FUNCTION update_historical_tvl_updated_at();
