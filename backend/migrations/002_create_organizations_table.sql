-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500),
    website_url VARCHAR(500),
    discord_url VARCHAR(500),
    admin_address VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on admin_address for faster lookups
CREATE INDEX idx_organizations_admin_address ON organizations(admin_address);

-- Create index on created_at for sorting
CREATE INDEX idx_organizations_created_at ON organizations(created_at);

-- Add comment to the table
COMMENT ON TABLE organizations IS 'Stores off-chain metadata about organizations that create vaults';