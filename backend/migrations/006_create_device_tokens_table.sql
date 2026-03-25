-- Create Device Tokens table for FCM push notifications
CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address VARCHAR(42) NOT NULL,
    device_token TEXT NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    app_version VARCHAR(50) NULL,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Device Tokens table
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_address ON device_tokens(user_address);
CREATE INDEX IF NOT EXISTS idx_device_tokens_is_active ON device_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_device_tokens_platform ON device_tokens(platform);

-- Trigger for updated_at
CREATE TRIGGER update_device_tokens_updated_at BEFORE UPDATE ON device_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();