-- Add is_blacklisted column to vaults table
ALTER TABLE vaults ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT false;

-- Add comment to clarify the purpose of the column
COMMENT ON COLUMN vaults.is_blacklisted IS 'Whether this vault has been blacklisted due to integrity failure';

-- Add index for performance on filtering blacklisted vaults
CREATE INDEX IF NOT EXISTS idx_vaults_blacklisted ON vaults(is_blacklisted);
