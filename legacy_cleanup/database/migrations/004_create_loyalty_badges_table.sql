-- Migration: Create loyalty_badges table
-- Description: Table for tracking beneficiary loyalty badges and retention monitoring
-- Version: 004
-- Date: 2025-03-28

CREATE TABLE IF NOT EXISTS loyalty_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
    badge_type VARCHAR(20) NOT NULL DEFAULT 'diamond_hands' 
        CHECK (badge_type IN ('diamond_hands', 'platinum_hodler', 'gold_holder', 'silver_holder')),
    awarded_at TIMESTAMP,
    retention_period_days INTEGER NOT NULL DEFAULT 0,
    initial_vested_amount DECIMAL(36,18) NOT NULL DEFAULT 0,
    current_balance DECIMAL(36,18) NOT NULL DEFAULT 0,
    nft_metadata_uri VARCHAR(500),
    discord_role_granted BOOLEAN NOT NULL DEFAULT FALSE,
    priority_access_granted BOOLEAN NOT NULL DEFAULT FALSE,
    monitoring_start_date TIMESTAMP NOT NULL,
    last_balance_check TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure each beneficiary can only have one of each badge type
    CONSTRAINT unique_beneficiary_badge_type UNIQUE (beneficiary_id, badge_type)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_loyalty_badges_beneficiary_id ON loyalty_badges(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_badges_badge_type ON loyalty_badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_loyalty_badges_awarded_at ON loyalty_badges(awarded_at);
CREATE INDEX IF NOT EXISTS idx_loyalty_badges_active_monitoring ON loyalty_badges(is_active, badge_type);
CREATE INDEX IF NOT EXISTS idx_loyalty_badges_last_check ON loyalty_badges(last_balance_check);

-- Add comments for documentation
COMMENT ON TABLE loyalty_badges IS 'Tracks beneficiary loyalty badges and retention monitoring for gamification';
COMMENT ON COLUMN loyalty_badges.id IS 'Unique identifier for the badge record';
COMMENT ON COLUMN loyalty_badges.beneficiary_id IS 'Reference to the beneficiary who earned this badge';
COMMENT ON COLUMN loyalty_badges.badge_type IS 'Type of loyalty badge (diamond_hands, platinum_hodler, etc.)';
COMMENT ON COLUMN loyalty_badges.awarded_at IS 'Timestamp when the badge was officially awarded';
COMMENT ON COLUMN loyalty_badges.retention_period_days IS 'Number of days the beneficiary maintained required retention';
COMMENT ON COLUMN loyalty_badges.initial_vested_amount IS 'Initial amount of vested tokens when monitoring started';
COMMENT ON COLUMN loyalty_badges.current_balance IS 'Current token balance at last check';
COMMENT ON COLUMN loyalty_badges.nft_metadata_uri IS 'URI to NFT metadata if badge is minted as NFT';
COMMENT ON COLUMN loyalty_badges.discord_role_granted IS 'Flag indicating if Discord role was granted';
COMMENT ON COLUMN loyalty_badges.priority_access_granted IS 'Flag indicating if priority access was granted';
COMMENT ON COLUMN loyalty_badges.monitoring_start_date IS 'Date when balance monitoring started';
COMMENT ON COLUMN loyalty_badges.last_balance_check IS 'Last time the balance was checked';
COMMENT ON COLUMN loyalty_badges.is_active IS 'Flag indicating if monitoring is still active';

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_loyalty_badges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_loyalty_badges_updated_at
    BEFORE UPDATE ON loyalty_badges
    FOR EACH ROW
    EXECUTE FUNCTION update_loyalty_badges_updated_at();
