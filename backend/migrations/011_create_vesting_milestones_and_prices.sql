-- Migration: Create vesting milestones and historical prices tables for tax reporting

-- Create vesting_milestones table to track each vesting event
CREATE TABLE IF NOT EXISTS vesting_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    sub_schedule_id UUID NOT NULL REFERENCES sub_schedules(id) ON DELETE CASCADE,
    beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
    milestone_date TIMESTAMP NOT NULL,
    milestone_type VARCHAR(20) NOT NULL CHECK (milestone_type IN ('cliff_end', 'vesting_increment', 'vesting_complete')),
    vested_amount DECIMAL(36,18) NOT NULL,
    cumulative_vested DECIMAL(36,18) NOT NULL,
    token_address VARCHAR(255) NOT NULL,
    price_usd DECIMAL(36,18),
    vwap_24h_usd DECIMAL(36,18),
    price_source VARCHAR(50),
    price_fetched_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create historical_token_prices table for caching price data
CREATE TABLE IF NOT EXISTS historical_token_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_address VARCHAR(255) NOT NULL,
    price_date DATE NOT NULL,
    price_usd DECIMAL(36,18) NOT NULL,
    vwap_24h_usd DECIMAL(36,18),
    volume_24h_usd DECIMAL(36,18),
    market_cap_usd DECIMAL(36,18),
    price_source VARCHAR(50) NOT NULL DEFAULT 'stellar_dex',
    data_quality VARCHAR(20) NOT NULL DEFAULT 'good' CHECK (data_quality IN ('excellent', 'good', 'fair', 'poor')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(token_address, price_date, price_source)
);

-- Create cost_basis_reports table for tax reporting
CREATE TABLE IF NOT EXISTS cost_basis_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address VARCHAR(255) NOT NULL,
    token_address VARCHAR(255) NOT NULL,
    report_year INTEGER NOT NULL,
    total_vested_amount DECIMAL(36,18) NOT NULL DEFAULT 0,
    total_cost_basis_usd DECIMAL(36,18) NOT NULL DEFAULT 0,
    total_milestones INTEGER NOT NULL DEFAULT 0,
    report_data JSONB,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_address, token_address, report_year)
);

-- Indexes for vesting_milestones
CREATE INDEX IF NOT EXISTS idx_vesting_milestones_vault_id ON vesting_milestones(vault_id);
CREATE INDEX IF NOT EXISTS idx_vesting_milestones_sub_schedule_id ON vesting_milestones(sub_schedule_id);
CREATE INDEX IF NOT EXISTS idx_vesting_milestones_beneficiary_id ON vesting_milestones(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_vesting_milestones_date ON vesting_milestones(milestone_date);
CREATE INDEX IF NOT EXISTS idx_vesting_milestones_token_date ON vesting_milestones(token_address, milestone_date);
CREATE INDEX IF NOT EXISTS idx_vesting_milestones_type ON vesting_milestones(milestone_type);

-- Indexes for historical_token_prices
CREATE INDEX IF NOT EXISTS idx_historical_prices_token_address ON historical_token_prices(token_address);
CREATE INDEX IF NOT EXISTS idx_historical_prices_date ON historical_token_prices(price_date);
CREATE INDEX IF NOT EXISTS idx_historical_prices_token_date ON historical_token_prices(token_address, price_date);
CREATE INDEX IF NOT EXISTS idx_historical_prices_source ON historical_token_prices(price_source);

-- Indexes for cost_basis_reports
CREATE INDEX IF NOT EXISTS idx_cost_basis_reports_user ON cost_basis_reports(user_address);
CREATE INDEX IF NOT EXISTS idx_cost_basis_reports_token ON cost_basis_reports(token_address);
CREATE INDEX IF NOT EXISTS idx_cost_basis_reports_year ON cost_basis_reports(report_year);
CREATE INDEX IF NOT EXISTS idx_cost_basis_reports_user_token ON cost_basis_reports(user_address, token_address);

-- Add comments
COMMENT ON TABLE vesting_milestones IS 'Tracks each vesting milestone with price data for tax reporting';
COMMENT ON COLUMN vesting_milestones.milestone_type IS 'Type of vesting milestone: cliff_end, vesting_increment, vesting_complete';
COMMENT ON COLUMN vesting_milestones.vested_amount IS 'Amount vested at this specific milestone';
COMMENT ON COLUMN vesting_milestones.cumulative_vested IS 'Total amount vested up to this milestone';
COMMENT ON COLUMN vesting_milestones.vwap_24h_usd IS '24-hour Volume Weighted Average Price in USD';

COMMENT ON TABLE historical_token_prices IS 'Cached historical price data from Stellar DEX and other sources';
COMMENT ON COLUMN historical_token_prices.vwap_24h_usd IS '24-hour Volume Weighted Average Price in USD';
COMMENT ON COLUMN historical_token_prices.data_quality IS 'Quality rating of price data based on volume and source reliability';

COMMENT ON TABLE cost_basis_reports IS 'Generated tax reports showing cost basis for vested tokens';
COMMENT ON COLUMN cost_basis_reports.report_data IS 'Detailed breakdown of vesting milestones and cost basis calculations';

-- Update triggers
CREATE TRIGGER update_vesting_milestones_updated_at 
    BEFORE UPDATE ON vesting_milestones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_historical_token_prices_updated_at 
    BEFORE UPDATE ON historical_token_prices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_basis_reports_updated_at 
    BEFORE UPDATE ON cost_basis_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();