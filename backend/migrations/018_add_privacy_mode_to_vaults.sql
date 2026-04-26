-- Add privacy mode fields to vaults table
-- This migration adds support for zero-knowledge privacy metadata masking

ALTER TABLE vaults 
ADD COLUMN privacy_mode_enabled BOOLEAN DEFAULT FALSE NOT NULL COMMENT 'Whether privacy mode is enabled for this vault',
ADD COLUMN privacy_metadata JSON DEFAULT NULL COMMENT 'Additional privacy settings and metadata';

-- Create index for efficient querying of privacy-enabled vaults
CREATE INDEX idx_vaults_privacy_mode ON vaults(privacy_mode_enabled);

-- Add comment to explain the privacy feature
ALTER TABLE vaults COMMENT = 'Vaults table with privacy masking support for high-profile investors';
