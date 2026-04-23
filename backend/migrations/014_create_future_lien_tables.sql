-- Migration: Create future lien tracking tables for vesting-to-grant-stream integration
-- Description: Enables users to commit future unvested tokens to grant stream projects

-- Create table for grant stream projects
CREATE TABLE IF NOT EXISTS grant_streams (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) NOT NULL UNIQUE, -- Contract address
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_address VARCHAR(42) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    target_amount DECIMAL(20,8) DEFAULT 0,
    current_amount DECIMAL(20,8) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}' -- Additional project metadata
);

-- Create table for future liens (commitments of unvested tokens)
CREATE TABLE IF NOT EXISTS future_liens (
    id SERIAL PRIMARY KEY,
    vault_address VARCHAR(42) NOT NULL,
    beneficiary_address VARCHAR(42) NOT NULL,
    grant_stream_id INTEGER NOT NULL REFERENCES grant_streams(id) ON DELETE CASCADE,
    committed_amount DECIMAL(20,8) NOT NULL, -- Total amount committed
    released_amount DECIMAL(20,8) DEFAULT 0, -- Amount already released to grant
    remaining_amount DECIMAL(20,8) GENERATED ALWAYS AS (committed_amount - released_amount) STORED,
    
    -- Vesting schedule tracking
    vesting_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    vesting_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    cliff_date TIMESTAMP WITH TIME ZONE,
    
    -- Release schedule (how tokens flow to grant over time)
    release_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    release_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    release_rate_type VARCHAR(20) DEFAULT 'linear', -- 'linear', 'milestone', 'immediate'
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'completed', 'cancelled'
    is_active BOOLEAN DEFAULT true,
    
    -- Transaction tracking
    creation_transaction_hash VARCHAR(66),
    contract_interaction_hash VARCHAR(66), -- Hash of contract lien creation
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_released_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT positive_committed_amount CHECK (committed_amount > 0),
    CONSTRAINT positive_released_amount CHECK (released_amount >= 0),
    CONSTRAINT valid_dates CHECK (vesting_end_date > vesting_start_date),
    CONSTRAINT valid_release_dates CHECK (release_end_date > release_start_date),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    CONSTRAINT valid_release_rate CHECK (release_rate_type IN ('linear', 'milestone', 'immediate')),
    
    -- Unique constraint to prevent duplicate liens
    UNIQUE(vault_address, beneficiary_address, grant_stream_id)
);

-- Create table for lien release events (actual token transfers to grants)
CREATE TABLE IF NOT EXISTS lien_releases (
    id SERIAL PRIMARY KEY,
    lien_id INTEGER NOT NULL REFERENCES future_liens(id) ON DELETE CASCADE,
    amount DECIMAL(20,8) NOT NULL,
    release_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Calculation details
    vested_at_release DECIMAL(20,8) NOT NULL, -- Total vested amount at release time
    previously_released DECIMAL(20,8) NOT NULL, -- Amount released before this event
    available_for_release DECIMAL(20,8) NOT NULL, -- Calculated available amount
    
    -- Transaction details
    transaction_hash VARCHAR(66),
    block_number INTEGER,
    gas_used BIGINT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT positive_release_amount CHECK (amount > 0),
    CONSTRAINT valid_available_amount CHECK (amount <= available_for_release)
);

-- Create table for lien milestones (for milestone-based release schedules)
CREATE TABLE IF NOT EXISTS lien_milestones (
    id SERIAL PRIMARY KEY,
    lien_id INTEGER NOT NULL REFERENCES future_liens(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_date TIMESTAMP WITH TIME ZONE,
    completion_date TIMESTAMP WITH TIME ZONE,
    percentage_of_total DECIMAL(5,2) NOT NULL, -- Percentage of total committed amount
    amount DECIMAL(20,8) GENERATED ALWAYS AS (lien_id.committed_amount * percentage_of_total / 100) STORED,
    is_completed BOOLEAN DEFAULT false,
    release_transaction_hash VARCHAR(66),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_percentage CHECK (percentage_of_total > 0 AND percentage_of_total <= 100),
    CONSTRAINT valid_date CHECK (completion_date IS NULL OR completion_date >= target_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_future_liens_vault_address ON future_liens(vault_address);
CREATE INDEX IF NOT EXISTS idx_future_liens_beneficiary_address ON future_liens(beneficiary_address);
CREATE INDEX IF NOT EXISTS idx_future_liens_grant_stream_id ON future_liens(grant_stream_id);
CREATE INDEX IF NOT EXISTS idx_future_liens_status ON future_liens(status);
CREATE INDEX IF NOT EXISTS idx_future_liens_active ON future_liens(is_active);
CREATE INDEX IF NOT EXISTS idx_future_liens_release_dates ON future_liens(release_start_date, release_end_date);
CREATE INDEX IF NOT EXISTS idx_lien_releases_lien_id ON lien_releases(lien_id);
CREATE INDEX IF NOT EXISTS idx_lien_releases_date ON lien_releases(release_date);
CREATE INDEX IF NOT EXISTS idx_grant_streams_address ON grant_streams(address);
CREATE INDEX IF NOT EXISTS idx_grant_streams_active ON grant_streams(is_active);
CREATE INDEX IF NOT EXISTS idx_lien_milestones_lien_id ON lien_milestones(lien_id);
CREATE INDEX IF NOT EXISTS idx_lien_milestones_completion ON lien_milestones(is_completed, target_date);

-- Create view for active lien summary
CREATE OR REPLACE VIEW active_lien_summary AS
SELECT 
    fl.id,
    fl.vault_address,
    fl.beneficiary_address,
    fl.committed_amount,
    fl.released_amount,
    fl.remaining_amount,
    fl.status,
    fl.release_start_date,
    fl.release_end_date,
    fl.release_rate_type,
    gs.name as grant_stream_name,
    gs.address as grant_stream_address,
    v.token_address as vault_token_address,
    v.total_amount as vault_total_amount,
    b.total_allocated as beneficiary_total_allocation,
    
    -- Calculated fields
    CASE 
        WHEN fl.release_rate_type = 'linear' THEN
            GREATEST(0, LEAST(
                fl.remaining_amount,
                fl.remaining_amount * 
                EXTRACT(EPOCH FROM (NOW() - fl.release_start_date)) / 
                EXTRACT(EPOCH FROM (fl.release_end_date - fl.release_start_date))
            ))
        WHEN fl.release_rate_type = 'immediate' THEN fl.remaining_amount
        ELSE 0 -- Milestone-based handled separately
    END as available_for_release,
    
    -- Time-based calculations
    EXTRACT(DAYS FROM (fl.release_end_date - NOW())) as days_remaining,
    EXTRACT(DAYS FROM (NOW() - fl.release_start_date)) as days_elapsed
    
FROM future_liens fl
JOIN grant_streams gs ON fl.grant_stream_id = gs.id
JOIN vaults v ON fl.vault_address = v.address
JOIN beneficiaries b ON fl.vault_address = b.vault_address AND fl.beneficiary_address = b.address
WHERE fl.is_active = true 
  AND fl.status IN ('pending', 'active')
  AND NOW() >= fl.release_start_date
  AND NOW() <= fl.release_end_date;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_grant_streams_updated_at BEFORE UPDATE ON grant_streams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_future_liens_updated_at BEFORE UPDATE ON future_liens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update grant stream current amount when liens are released
CREATE OR REPLACE FUNCTION update_grant_stream_current_amount()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE grant_streams 
    SET current_amount = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM lien_releases lr
        JOIN future_liens fl ON lr.lien_id = fl.id
        WHERE fl.grant_stream_id = NEW.grant_stream_id
    )
    WHERE id = NEW.grant_stream_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_grant_on_lien_release AFTER INSERT ON lien_releases
    FOR EACH ROW EXECUTE FUNCTION update_grant_stream_current_amount();

-- Add comments for documentation
COMMENT ON TABLE grant_streams IS 'Projects that can receive future token commitments';
COMMENT ON TABLE future_liens IS 'Commitments of unvested tokens to be released to grant streams over time';
COMMENT ON TABLE lien_releases IS 'Actual token release events from liens to grant streams';
COMMENT ON TABLE lien_milestones IS 'Milestone definitions for milestone-based lien releases';
COMMENT ON VIEW active_lien_summary IS 'Summary view of currently active liens with calculated release amounts';
