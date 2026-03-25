-- Migration: Create Tax Calculations Table
-- Description: Tracks tax calculations, withholding estimates, and sell-to-cover recommendations

CREATE TABLE IF NOT EXISTS tax_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
    user_address VARCHAR(255) NOT NULL,
    tax_jurisdiction VARCHAR(10) NOT NULL,
    tax_year INTEGER NOT NULL,
    tax_event_type VARCHAR(20) NOT NULL CHECK (tax_event_type IN ('VESTING', 'CLAIM', 'SELL', 'YEAR_END')),
    tax_event_date TIMESTAMP NOT NULL,
    token_address VARCHAR(255) NOT NULL,
    token_price_usd_at_event DECIMAL(36, 18) NOT NULL,
    vested_amount DECIMAL(36, 18) NOT NULL DEFAULT 0,
    claimed_amount DECIMAL(36, 18) NOT NULL DEFAULT 0,
    cost_basis_usd DECIMAL(36, 18) NOT NULL DEFAULT 0,
    fair_market_value_usd DECIMAL(36, 18) NOT NULL,
    taxable_income_usd DECIMAL(36, 18) NOT NULL,
    tax_rate_percent DECIMAL(5, 2) NOT NULL,
    estimated_tax_liability_usd DECIMAL(36, 18) NOT NULL,
    withholding_amount_usd DECIMAL(36, 18) NOT NULL DEFAULT 0,
    sell_to_cover_tokens DECIMAL(36, 18) NOT NULL DEFAULT 0,
    sell_to_cover_usd DECIMAL(36, 18) NOT NULL DEFAULT 0,
    remaining_tokens_after_tax DECIMAL(36, 18) NOT NULL,
    tax_oracle_provider VARCHAR(50) NOT NULL DEFAULT 'internal',
    tax_oracle_response JSON NULL,
    calculation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (calculation_status IN ('PENDING', 'CALCULATED', 'FAILED', 'WITHHELD')),
    error_message TEXT NULL,
    user_confirmed BOOLEAN NOT NULL DEFAULT false,
    auto_withhold_enabled BOOLEAN NOT NULL DEFAULT false,
    tax_filing_deadline TIMESTAMP NULL,
    estimated_payment_deadline TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_tax_calculations_vault_id ON tax_calculations(vault_id);
CREATE INDEX idx_tax_calculations_user_address ON tax_calculations(user_address);
CREATE INDEX idx_tax_calculations_jurisdiction ON tax_calculations(tax_jurisdiction);
CREATE INDEX idx_tax_calculations_tax_year ON tax_calculations(tax_year);
CREATE INDEX idx_tax_calculations_event_date ON tax_calculations(tax_event_date);
CREATE INDEX idx_tax_calculations_status ON tax_calculations(calculation_status);
CREATE INDEX idx_tax_calculations_event_type ON tax_calculations(tax_event_type);

-- Unique constraint to prevent duplicate tax calculations
CREATE UNIQUE INDEX idx_tax_calculations_unique_event ON tax_calculations(
    vault_id, 
    user_address, 
    tax_year, 
    tax_event_type, 
    tax_event_date
);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tax_calculations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_tax_calculations_updated_at
    BEFORE UPDATE ON tax_calculations
    FOR EACH ROW
    EXECUTE FUNCTION update_tax_calculations_updated_at();

-- Add comments for documentation
COMMENT ON TABLE tax_calculations IS 'Tracks tax calculations and withholding estimates for crypto vesting events';
COMMENT ON COLUMN tax_calculations.vault_id IS 'Associated vault ID';
COMMENT ON COLUMN tax_calculations.user_address IS 'Beneficiary wallet address';
COMMENT ON COLUMN tax_calculations.tax_jurisdiction IS 'Tax jurisdiction code (e.g., US, UK, DE)';
COMMENT ON COLUMN tax_calculations.tax_year IS 'Tax year for calculation';
COMMENT ON COLUMN tax_calculations.tax_event_type IS 'Type of tax event (VESTING, CLAIM, SELL, YEAR_END)';
COMMENT ON COLUMN tax_calculations.tax_event_date IS 'Date when tax event occurred';
COMMENT ON COLUMN tax_calculations.token_address IS 'Token contract address';
COMMENT ON COLUMN tax_calculations.token_price_usd_at_event IS 'Token price in USD at tax event time';
COMMENT ON COLUMN tax_calculations.vested_amount IS 'Amount of tokens vested at tax event';
COMMENT ON COLUMN tax_calculations.claimed_amount IS 'Amount of tokens claimed at tax event';
COMMENT ON COLUMN tax_calculations.cost_basis_usd IS 'Cost basis in USD for the tokens';
COMMENT ON COLUMN tax_calculations.fair_market_value_usd IS 'Fair market value in USD at tax event';
COMMENT ON COLUMN tax_calculations.taxable_income_usd IS 'Taxable income amount in USD';
COMMENT ON COLUMN tax_calculations.tax_rate_percent IS 'Applicable tax rate percentage';
COMMENT ON COLUMN tax_calculations.estimated_tax_liability_usd IS 'Estimated tax liability in USD';
COMMENT ON COLUMN tax_calculations.withholding_amount_usd IS 'Amount withheld for taxes';
COMMENT ON COLUMN tax_calculations.sell_to_cover_tokens IS 'Number of tokens to sell to cover tax liability';
COMMENT ON COLUMN tax_calculations.sell_to_cover_usd IS 'USD value of tokens to sell for tax payment';
COMMENT ON COLUMN tax_calculations.remaining_tokens_after_tax IS 'Remaining tokens after tax payment';
COMMENT ON COLUMN tax_calculations.tax_oracle_provider IS 'Tax oracle provider used for calculation';
COMMENT ON COLUMN tax_calculations.tax_oracle_response IS 'Raw response from tax oracle';
COMMENT ON COLUMN tax_calculations.calculation_status IS 'Status of tax calculation';
COMMENT ON COLUMN tax_calculations.error_message IS 'Error message if calculation failed';
COMMENT ON COLUMN tax_calculations.user_confirmed IS 'Whether user has confirmed the tax calculation';
COMMENT ON COLUMN tax_calculations.auto_withhold_enabled IS 'Whether automatic withholding is enabled';
COMMENT ON COLUMN tax_calculations.tax_filing_deadline IS 'Tax filing deadline for this jurisdiction/year';
COMMENT ON COLUMN tax_calculations.estimated_payment_deadline IS 'Estimated tax payment deadline';
