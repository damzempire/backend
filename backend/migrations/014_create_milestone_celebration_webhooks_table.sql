-- Create milestone_celebration_webhooks table
CREATE TABLE IF NOT EXISTS milestone_celebration_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    webhook_url VARCHAR(512) NOT NULL,
    webhook_type VARCHAR(20) NOT NULL DEFAULT 'discord' CHECK (webhook_type IN ('discord', 'telegram', 'custom')),
    is_active BOOLEAN DEFAULT true,
    secret_token VARCHAR(255),
    milestone_types JSONB DEFAULT '["cliff_end", "vesting_complete"]',
    min_amount_threshold DECIMAL(36, 18) DEFAULT 0,
    custom_message_template TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_milestone_celebration_webhooks_org_id ON milestone_celebration_webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_milestone_celebration_webhooks_type ON milestone_celebration_webhooks(webhook_type);
CREATE INDEX IF NOT EXISTS idx_milestone_celebration_webhooks_active ON milestone_celebration_webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_milestone_celebration_webhooks_url ON milestone_celebration_webhooks(webhook_url);

-- Add GIN index for JSONB milestone_types column for efficient querying
CREATE INDEX IF NOT EXISTS idx_milestone_celebration_webhooks_milestone_types ON milestone_celebration_webhooks USING GIN(milestone_types);

-- Add comments for documentation
COMMENT ON TABLE milestone_celebration_webhooks IS 'Stores webhook configurations for milestone celebration notifications to Discord/Telegram bots';
COMMENT ON COLUMN milestone_celebration_webhooks.organization_id IS 'Reference to the organization that owns this webhook';
COMMENT ON COLUMN milestone_celebration_webhooks.webhook_url IS 'Discord/Telegram bot webhook URL';
COMMENT ON COLUMN milestone_celebration_webhooks.webhook_type IS 'Type of webhook endpoint (discord, telegram, or custom)';
COMMENT ON COLUMN milestone_celebration_webhooks.is_active IS 'Whether this webhook is currently active';
COMMENT ON COLUMN milestone_celebration_webhooks.secret_token IS 'Optional secret for webhook signature validation';
COMMENT ON COLUMN milestone_celebration_webhooks.milestone_types IS 'Array of milestone types to trigger webhooks for';
COMMENT ON COLUMN milestone_celebration_webhooks.min_amount_threshold IS 'Minimum vested amount to trigger celebration';
COMMENT ON COLUMN milestone_celebration_webhooks.custom_message_template IS 'Custom message template for celebrations';
