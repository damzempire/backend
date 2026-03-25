-- Migration: Create Tax Jurisdictions Table
-- Description: Stores tax rules, rates, and compliance requirements for different jurisdictions

CREATE TABLE IF NOT EXISTS tax_jurisdictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jurisdiction_code VARCHAR(10) NOT NULL UNIQUE,
    jurisdiction_name VARCHAR(255) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    tax_year_type VARCHAR(20) NOT NULL DEFAULT 'CALENDAR' CHECK (tax_year_type IN ('CALENDAR', 'FISCAL', 'CUSTOM')),
    fiscal_year_start DATE NULL,
    fiscal_year_end DATE NULL,
    tax_filing_deadline DATE NULL,
    estimated_payment_deadlines JSON NULL,
    crypto_tax_treatment VARCHAR(20) NOT NULL DEFAULT 'CAPITAL_GAINS' CHECK (crypto_tax_treatment IN ('CAPITAL_GAINS', 'ORDINARY_INCOME', 'HYBRID', 'SPECIAL')),
    vesting_tax_event BOOLEAN NOT NULL DEFAULT true,
    short_term_capital_gains_rate DECIMAL(5, 2) NULL,
    long_term_capital_gains_rate DECIMAL(5, 2) NULL,
    ordinary_income_tax_rates JSON NULL,
    long_term_holding_period_days INTEGER NOT NULL DEFAULT 365,
    tax_withholding_required BOOLEAN NOT NULL DEFAULT false,
    default_withholding_rate DECIMAL(5, 2) NULL,
    sell_to_cover_allowed BOOLEAN NOT NULL DEFAULT true,
    tax_reporting_requirements JSON NULL,
    tax_oracle_config JSON NULL,
    compliance_notes TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE UNIQUE INDEX idx_tax_jurisdictions_code ON tax_jurisdictions(jurisdiction_code);
CREATE INDEX idx_tax_jurisdictions_active ON tax_jurisdictions(is_active);
CREATE INDEX idx_tax_jurisdictions_treatment ON tax_jurisdictions(crypto_tax_treatment);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tax_jurisdictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_tax_jurisdictions_updated_at
    BEFORE UPDATE ON tax_jurisdictions
    FOR EACH ROW
    EXECUTE FUNCTION update_tax_jurisdictions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE tax_jurisdictions IS 'Tax jurisdiction configurations for global tax calculations';
COMMENT ON COLUMN tax_jurisdictions.jurisdiction_code IS 'ISO country code or jurisdiction identifier';
COMMENT ON COLUMN tax_jurisdictions.jurisdiction_name IS 'Full name of the tax jurisdiction';
COMMENT ON COLUMN tax_jurisdictions.currency IS 'Default currency for tax calculations';
COMMENT ON COLUMN tax_jurisdictions.tax_year_type IS 'Type of tax year (CALENDAR, FISCAL, CUSTOM)';
COMMENT ON COLUMN tax_jurisdictions.fiscal_year_start IS 'Start date of fiscal year (for non-calendar years)';
COMMENT ON COLUMN tax_jurisdictions.fiscal_year_end IS 'End date of fiscal year (for non-calendar years)';
COMMENT ON COLUMN tax_jurisdictions.tax_filing_deadline IS 'Standard tax filing deadline (MM-DD format)';
COMMENT ON COLUMN tax_jurisdictions.estimated_payment_deadlines IS 'Array of estimated tax payment deadlines';
COMMENT ON COLUMN tax_jurisdictions.crypto_tax_treatment IS 'How cryptocurrency is treated for tax purposes';
COMMENT ON COLUMN tax_jurisdictions.vesting_tax_event IS 'Whether vesting is considered a taxable event';
COMMENT ON COLUMN tax_jurisdictions.short_term_capital_gains_rate IS 'Short-term capital gains tax rate (%)';
COMMENT ON COLUMN tax_jurisdictions.long_term_capital_gains_rate IS 'Long-term capital gains tax rate (%)';
COMMENT ON COLUMN tax_jurisdictions.ordinary_income_tax_rates IS 'Ordinary income tax brackets and rates';
COMMENT ON COLUMN tax_jurisdictions.long_term_holding_period_days IS 'Days required for long-term capital gains treatment';
COMMENT ON COLUMN tax_jurisdictions.tax_withholding_required IS 'Whether tax withholding is required';
COMMENT ON COLUMN tax_jurisdictions.default_withholding_rate IS 'Default withholding rate (%)';
COMMENT ON COLUMN tax_jurisdictions.sell_to_cover_allowed IS 'Whether sell-to-cover strategies are permitted';
COMMENT ON COLUMN tax_jurisdictions.tax_reporting_requirements IS 'Specific tax reporting requirements and forms';
COMMENT ON COLUMN tax_jurisdictions.tax_oracle_config IS 'Configuration for external tax oracle integration';
COMMENT ON COLUMN tax_jurisdictions.compliance_notes IS 'Additional compliance notes and warnings';
COMMENT ON COLUMN tax_jurisdictions.is_active IS 'Whether this jurisdiction configuration is active';
COMMENT ON COLUMN tax_jurisdictions.effective_date IS 'Date when this configuration becomes effective';

-- Insert default jurisdiction configurations
INSERT INTO tax_jurisdictions (
    jurisdiction_code, jurisdiction_name, currency, tax_year_type,
    tax_filing_deadline, estimated_payment_deadlines, crypto_tax_treatment,
    vesting_tax_event, short_term_capital_gains_rate, long_term_capital_gains_rate,
    ordinary_income_tax_rates, long_term_holding_period_days, tax_withholding_required,
    sell_to_cover_allowed
) VALUES 
(
    'US', 'United States', 'USD', 'CALENDAR',
    '04-15', '["04-15", "06-15", "09-15", "01-15"]', 'CAPITAL_GAINS',
    true, 37.0, 20.0,
    '[{"threshold": 0, "rate": 10}, {"threshold": 10275, "rate": 12}, {"threshold": 41775, "rate": 22}, {"threshold": 89450, "rate": 24}, {"threshold": 190750, "rate": 32}, {"threshold": 364200, "rate": 35}, {"threshold": 539900, "rate": 37}]',
    365, false, true
),
(
    'UK', 'United Kingdom', 'GBP', 'FISCAL',
    '01-31', '["07-31", "10-31", "01-31", "04-30"]', 'CAPITAL_GAINS',
    true, 20.0, 10.0,
    '[{"threshold": 0, "rate": 19}, {"threshold": 12570, "rate": 20}, {"threshold": 50270, "rate": 40}, {"threshold": 125140, "rate": 45}]',
    365, false, true
),
(
    'DE', 'Germany', 'EUR', 'CALENDAR',
    '05-31', '["03-10", "06-10", "09-10", "12-10"]', 'CAPITAL_GAINS',
    true, 45.0, 26.375,
    '[{"threshold": 0, "rate": 0}, {"threshold": 10908, "rate": 14}, {"threshold": 14854, "rate": 24}, {"threshold": 58796, "rate": 42}, {"threshold": 277826, "rate": 45}]',
    365, false, true
),
(
    'JP', 'Japan', 'JPY', 'CALENDAR',
    '03-15', '["07-31", "11-30", "01-31", "03-15"]', 'MISC',
    true, 55.0, 15.0,
    '[{"threshold": 0, "rate": 5}, {"threshold": 1950000, "rate": 10}, {"threshold": 3300000, "rate": 20}, {"threshold": 6950000, "rate": 23}, {"threshold": 9000000, "rate": 33}, {"threshold": 18000000, "rate": 40}, {"threshold": 40000000, "rate": 45}]',
    365, false, true
),
(
    'CA', 'Canada', 'CAD', 'CALENDAR',
    '04-30', '["03-15", "06-15", "09-15", "12-15"]', 'CAPITAL_GAINS',
    true, 33.0, 15.0,
    '[{"threshold": 0, "rate": 15}, {"threshold": 53359, "rate": 20.5}, {"threshold": 106717, "rate": 26}, {"threshold": 165430, "rate": 29.32}, {"threshold": 235675, "rate": 33}, {"threshold": 235676, "rate": 37}]',
    365, false, true
),
(
    'AU', 'Australia', 'AUD', 'FISCAL',
    '10-31', '["10-28", "01-28", "04-28", "07-28"]', 'CAPITAL_GAINS',
    true, 47.0, 10.0,
    '[{"threshold": 0, "rate": 0}, {"threshold": 18200, "rate": 19}, {"threshold": 45000, "rate": 32.5}, {"threshold": 120000, "rate": 37}, {"threshold": 180000, "rate": 45}]',
    365, false, true
)
ON CONFLICT (jurisdiction_code) DO NOTHING;
