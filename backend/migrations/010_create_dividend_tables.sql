-- Create dividend_rounds table for managing dividend distribution rounds
-- This table stores information about each dividend distribution round

CREATE TABLE dividend_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_address VARCHAR(42) NOT NULL,
    total_dividend_amount DECIMAL(36,18) NOT NULL,
    dividend_token VARCHAR(42) NOT NULL,
    snapshot_timestamp TIMESTAMP NOT NULL,
    calculation_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    distribution_timestamp TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'calculating', 'ready', 'distributing', 'completed', 'failed')),
    total_eligible_holders INTEGER NOT NULL DEFAULT 0,
    total_eligible_balance DECIMAL(36,18) NOT NULL DEFAULT 0,
    vested_treatment VARCHAR(20) NOT NULL DEFAULT 'full' CHECK (vested_treatment IN ('full', 'proportional', 'vested_only')),
    unvested_multiplier DECIMAL(10,8) NOT NULL DEFAULT 1.0,
    distribution_mechanism VARCHAR(20) NOT NULL DEFAULT 'side_drip' CHECK (distribution_mechanism IN ('side_drip', 'claim', 'reinvest')),
    metadata JSONB,
    created_by VARCHAR(42) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments to columns
COMMENT ON TABLE dividend_rounds IS 'Dividend distribution rounds for token holders';
COMMENT ON COLUMN dividend_rounds.id IS 'Primary key UUID';
COMMENT ON COLUMN dividend_rounds.token_address IS 'Token address paying dividends';
COMMENT ON COLUMN dividend_rounds.total_dividend_amount IS 'Total amount of dividend being distributed';
COMMENT ON COLUMN dividend_rounds.dividend_token IS 'Token used for dividend payment (USDC, XLM, etc.)';
COMMENT ON COLUMN dividend_rounds.snapshot_timestamp IS 'Timestamp when holder snapshot was taken';
COMMENT ON COLUMN dividend_rounds.calculation_timestamp IS 'Timestamp when calculations were performed';
COMMENT ON COLUMN dividend_rounds.distribution_timestamp IS 'Timestamp when distribution was completed';
COMMENT ON COLUMN dividend_rounds.status IS 'Status of the dividend round';
COMMENT ON COLUMN dividend_rounds.total_eligible_holders IS 'Number of eligible vault holders';
COMMENT ON COLUMN dividend_rounds.total_eligible_balance IS 'Total eligible token balance across all vaults';
COMMENT ON COLUMN dividend_rounds.vested_treatment IS 'How vested vs unvested tokens are treated';
COMMENT ON COLUMN dividend_rounds.unvested_multiplier IS 'Multiplier for unvested tokens (0.0-1.0)';
COMMENT ON COLUMN dividend_rounds.distribution_mechanism IS 'How dividends are distributed';
COMMENT ON COLUMN dividend_rounds.metadata IS 'Additional metadata about the dividend round';
COMMENT ON COLUMN dividend_rounds.created_by IS 'Admin address who created this dividend round';
COMMENT ON COLUMN dividend_rounds.created_at IS 'Dividend round creation timestamp';
COMMENT ON COLUMN dividend_rounds.updated_at IS 'Dividend round last update timestamp';

-- Create indexes for dividend_rounds
CREATE INDEX idx_dividend_rounds_token_address ON dividend_rounds(token_address);
CREATE INDEX idx_dividend_rounds_status ON dividend_rounds(status);
CREATE INDEX idx_dividend_rounds_snapshot_timestamp ON dividend_rounds(snapshot_timestamp);
CREATE INDEX idx_dividend_rounds_created_at ON dividend_rounds(created_at);
CREATE INDEX idx_dividend_rounds_token_status ON dividend_rounds(token_address, status);

-- Create dividend_snapshots table for holding balance snapshots
CREATE TABLE dividend_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dividend_round_id UUID NOT NULL REFERENCES dividend_rounds(id) ON DELETE CASCADE,
    vault_address VARCHAR(42) NOT NULL,
    beneficiary_address VARCHAR(42) NOT NULL,
    total_balance DECIMAL(36,18) NOT NULL,
    vested_balance DECIMAL(36,18) NOT NULL,
    unvested_balance DECIMAL(36,18) NOT NULL,
    cliff_date TIMESTAMP,
    vesting_start_date TIMESTAMP,
    vesting_end_date TIMESTAMP,
    vesting_percentage DECIMAL(10,8) NOT NULL DEFAULT 0,
    is_eligible BOOLEAN NOT NULL DEFAULT TRUE,
    ineligibility_reason VARCHAR(255),
    snapshot_timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments to dividend_snapshots columns
COMMENT ON TABLE dividend_snapshots IS 'Balance snapshots for dividend calculations';
COMMENT ON COLUMN dividend_snapshots.id IS 'Primary key UUID';
COMMENT ON COLUMN dividend_snapshots.dividend_round_id IS 'Associated dividend round ID';
COMMENT ON COLUMN dividend_snapshots.vault_address IS 'Vault contract address';
COMMENT ON COLUMN dividend_snapshots.beneficiary_address IS 'Beneficiary wallet address';
COMMENT ON COLUMN dividend_snapshots.total_balance IS 'Total token balance at snapshot time';
COMMENT ON COLUMN dividend_snapshots.vested_balance IS 'Vested balance at snapshot time';
COMMENT ON COLUMN dividend_snapshots.unvested_balance IS 'Unvested balance at snapshot time';
COMMENT ON COLUMN dividend_snapshots.cliff_date IS 'Cliff date for this beneficiary';
COMMENT ON COLUMN dividend_snapshots.vesting_start_date IS 'Vesting start date for this beneficiary';
COMMENT ON COLUMN dividend_snapshots.vesting_end_date IS 'Vesting end date for this beneficiary';
COMMENT ON COLUMN dividend_snapshots.vesting_percentage IS 'Percentage of tokens vested at snapshot time';
COMMENT ON COLUMN dividend_snapshots.is_eligible IS 'Whether this beneficiary is eligible for dividends';
COMMENT ON COLUMN dividend_snapshots.ineligibility_reason IS 'Reason for ineligibility if applicable';
COMMENT ON COLUMN dividend_snapshots.snapshot_timestamp IS 'Timestamp when snapshot was taken';
COMMENT ON COLUMN dividend_snapshots.created_at IS 'Snapshot creation timestamp';
COMMENT ON COLUMN dividend_snapshots.updated_at IS 'Snapshot last update timestamp';

-- Create indexes for dividend_snapshots
CREATE INDEX idx_dividend_snapshots_dividend_round_id ON dividend_snapshots(dividend_round_id);
CREATE INDEX idx_dividend_snapshots_vault_address ON dividend_snapshots(vault_address);
CREATE INDEX idx_dividend_snapshots_beneficiary_address ON dividend_snapshots(beneficiary_address);
CREATE INDEX idx_dividend_snapshots_is_eligible ON dividend_snapshots(is_eligible);
CREATE INDEX idx_dividend_snapshots_snapshot_timestamp ON dividend_snapshots(snapshot_timestamp);
CREATE INDEX idx_dividend_snapshots_round_beneficiary ON dividend_snapshots(dividend_round_id, beneficiary_address);
CREATE INDEX idx_dividend_snapshots_round_eligible ON dividend_snapshots(dividend_round_id, is_eligible);

-- Create dividend_distributions table for tracking individual dividend payments
CREATE TABLE dividend_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dividend_round_id UUID NOT NULL REFERENCES dividend_rounds(id) ON DELETE CASCADE,
    vault_address VARCHAR(42) NOT NULL,
    beneficiary_address VARCHAR(42) NOT NULL,
    held_balance DECIMAL(36,18) NOT NULL,
    vested_balance DECIMAL(36,18) NOT NULL,
    unvested_balance DECIMAL(36,18) NOT NULL,
    eligible_balance DECIMAL(36,18) NOT NULL,
    pro_rata_share DECIMAL(18,8) NOT NULL,
    dividend_amount DECIMAL(36,18) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'calculated', 'sent', 'failed', 'claimed')),
    transaction_hash VARCHAR(66),
    distributed_at TIMESTAMP,
    claimed_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments to dividend_distributions columns
COMMENT ON TABLE dividend_distributions IS 'Individual dividend distribution records';
COMMENT ON COLUMN dividend_distributions.id IS 'Primary key UUID';
COMMENT ON COLUMN dividend_distributions.dividend_round_id IS 'Associated dividend round ID';
COMMENT ON COLUMN dividend_distributions.vault_address IS 'Vault contract address';
COMMENT ON COLUMN dividend_distributions.beneficiary_address IS 'Beneficiary wallet address';
COMMENT ON COLUMN dividend_distributions.held_balance IS 'Token balance held at snapshot time';
COMMENT ON COLUMN dividend_distributions.vested_balance IS 'Vested portion of held balance';
COMMENT ON COLUMN dividend_distributions.unvested_balance IS 'Unvested portion of held balance';
COMMENT ON COLUMN dividend_distributions.eligible_balance IS 'Balance eligible for dividend after treatment rules';
COMMENT ON COLUMN dividend_distributions.pro_rata_share IS 'Pro-rata share percentage (0.00000000 - 1.00000000)';
COMMENT ON COLUMN dividend_distributions.dividend_amount IS 'Calculated dividend amount for this beneficiary';
COMMENT ON COLUMN dividend_distributions.status IS 'Status of this specific distribution';
COMMENT ON COLUMN dividend_distributions.transaction_hash IS 'Transaction hash of the dividend transfer';
COMMENT ON COLUMN dividend_distributions.distributed_at IS 'Timestamp when dividend was distributed';
COMMENT ON COLUMN dividend_distributions.claimed_at IS 'Timestamp when dividend was claimed (if claim mechanism)';
COMMENT ON COLUMN dividend_distributions.error_message IS 'Error message if distribution failed';
COMMENT ON COLUMN dividend_distributions.metadata IS 'Additional distribution metadata';
COMMENT ON COLUMN dividend_distributions.created_at IS 'Distribution creation timestamp';
COMMENT ON COLUMN dividend_distributions.updated_at IS 'Distribution last update timestamp';

-- Create indexes for dividend_distributions
CREATE INDEX idx_dividend_distributions_dividend_round_id ON dividend_distributions(dividend_round_id);
CREATE INDEX idx_dividend_distributions_vault_address ON dividend_distributions(vault_address);
CREATE INDEX idx_dividend_distributions_beneficiary_address ON dividend_distributions(beneficiary_address);
CREATE INDEX idx_dividend_distributions_status ON dividend_distributions(status);
CREATE INDEX idx_dividend_distributions_distributed_at ON dividend_distributions(distributed_at);
CREATE INDEX idx_dividend_distributions_round_beneficiary ON dividend_distributions(dividend_round_id, beneficiary_address);
CREATE INDEX idx_dividend_distributions_round_status ON dividend_distributions(dividend_round_id, status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_dividend_rounds_updated_at BEFORE UPDATE ON dividend_rounds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dividend_snapshots_updated_at BEFORE UPDATE ON dividend_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dividend_distributions_updated_at BEFORE UPDATE ON dividend_distributions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
