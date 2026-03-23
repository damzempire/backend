-- Create admins table for HSM and admin management
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    address VARCHAR(66) NOT NULL UNIQUE,
    name VARCHAR(255),
    email VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'operator')),
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMP,
    created_by VARCHAR(66) REFERENCES admins(address),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admins_address ON admins(address);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);
CREATE INDEX IF NOT EXISTS idx_admins_permissions ON admins USING GIN(permissions);

-- Create default super admin if environment variable is set
-- This should be done manually in production for security
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_settings WHERE name = 'current_setting' AND setting = 'on') THEN
        INSERT INTO admins (address, name, email, role, permissions, is_active)
        VALUES (
            COALESCE(NULLIF(TRIM('${DEFAULT_SUPER_ADMIN_ADDRESS}'), ''), '0x0000000000000000000000000000000000000000'),
            'Super Admin',
            'admin@company.com',
            'super_admin',
            '{
                "can_create_vaults": true,
                "can_revoke_access": true,
                "can_transfer_vaults": true,
                "can_topup_vaults": true,
                "can_release_tokens": true,
                "can_view_reports": true,
                "can_manage_admins": true,
                "can_access_hsm": true
            }',
            true
        ) ON CONFLICT (address) DO NOTHING;
    END IF;
END $$;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_admin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_admin_updated_at();

-- Add RLS (Row Level Security) for additional security
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to see their own record
CREATE POLICY admins_own_record ON admins
    FOR ALL
    TO authenticated_users
    USING (address = current_setting('app.current_user_address', true));

-- Create policy for super admins to see all admins
CREATE POLICY admins_super_admin_view ON admins
    FOR SELECT
    TO authenticated_users
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE address = current_setting('app.current_user_address', true)
            AND role = 'super_admin' 
            AND is_active = true
        )
    );

-- Create policy for super admins to manage other admins
CREATE POLICY admins_super_admin_manage ON admins
    FOR ALL
    TO authenticated_users
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE address = current_setting('app.current_user_address', true)
            AND role = 'super_admin' 
            AND is_active = true
        )
    );
