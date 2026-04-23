-- Migration: Create partner_management and partner_usage_tracking tables
-- Purpose: Manage institutional partners with tiered API access and usage tracking
-- Created: 2026-03-29

-- Partner Management Table
CREATE TABLE IF NOT EXISTS partner_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name VARCHAR(255) NOT NULL UNIQUE,
  partner_tier VARCHAR(50) NOT NULL DEFAULT 'basic',
  api_key VARCHAR(255) NOT NULL UNIQUE,
  api_secret_hash VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_address VARCHAR(255),
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  rate_limit_per_day INTEGER NOT NULL DEFAULT 10000,
  max_requests_per_batch INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  suspension_reason TEXT,
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspended_by VARCHAR(255),
  metadata JSONB,
  features_enabled VARCHAR(255)[],
  custom_limits JSONB,
  approved_by VARCHAR(255),
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Partner Usage Tracking Table
CREATE TABLE IF NOT EXISTS partner_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner_management(id) ON DELETE CASCADE,
  api_key VARCHAR(255) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  request_method VARCHAR(10) NOT NULL,
  response_status INTEGER,
  response_time_ms INTEGER,
  request_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  request_size_bytes BIGINT,
  response_size_bytes BIGINT,
  error_message TEXT,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  metadata JSONB,
  billing_period VARCHAR(7) NOT NULL
);

-- Indexes for partner_management
CREATE INDEX idx_partner_management_api_key ON partner_management(api_key);
CREATE INDEX idx_partner_management_partner_name ON partner_management(partner_name);
CREATE INDEX idx_partner_management_tier ON partner_management(partner_tier);
CREATE INDEX idx_partner_management_active ON partner_management(is_active);
CREATE INDEX idx_partner_management_suspended ON partner_management(is_suspended);
CREATE INDEX idx_partner_management_contact_email ON partner_management(contact_email);

-- Indexes for partner_usage_tracking
CREATE INDEX idx_partner_usage_partner_id ON partner_usage_tracking(partner_id);
CREATE INDEX idx_partner_usage_api_key ON partner_usage_tracking(api_key);
CREATE INDEX idx_partner_usage_timestamp ON partner_usage_tracking(request_timestamp);
CREATE INDEX idx_partner_usage_billing_period ON partner_usage_tracking(billing_period);
CREATE INDEX idx_partner_usage_endpoint ON partner_usage_tracking(endpoint);
CREATE INDEX idx_partner_usage_partner_timestamp ON partner_usage_tracking(partner_id, request_timestamp);

-- Comments
COMMENT ON TABLE partner_management IS 'Institutional partner management with tiered API access';
COMMENT ON COLUMN partner_management.partner_name IS 'Official name of the partner organization';
COMMENT ON COLUMN partner_management.partner_tier IS 'Partner tier: basic, silver, gold, platinum, enterprise';
COMMENT ON COLUMN partner_management.api_key IS 'Tiered API key for partner access (starts with pk_)';
COMMENT ON COLUMN partner_management.api_secret_hash IS 'Hashed API secret for authentication';
COMMENT ON COLUMN partner_management.rate_limit_per_minute IS 'API requests per minute allowed for this partner';
COMMENT ON COLUMN partner_management.rate_limit_per_day IS 'API requests per day allowed for this partner (-1 for unlimited)';
COMMENT ON COLUMN partner_management.max_requests_per_batch IS 'Maximum requests in a single batch';
COMMENT ON COLUMN partner_management.is_active IS 'Whether this partner is currently active';
COMMENT ON COLUMN partner_management.is_suspended IS 'Whether partner access is suspended';
COMMENT ON COLUMN partner_management.features_enabled IS 'List of premium features enabled for this partner';
COMMENT ON COLUMN partner_management.custom_limits IS 'Custom rate limits for specific endpoints';

COMMENT ON TABLE partner_usage_tracking IS 'API usage tracking for institutional partners';
COMMENT ON COLUMN partner_usage_tracking.partner_id IS 'Reference to partner management ID';
COMMENT ON COLUMN partner_usage_tracking.api_key IS 'API key used for the request';
COMMENT ON COLUMN partner_usage_tracking.endpoint IS 'API endpoint accessed';
COMMENT ON COLUMN partner_usage_tracking.request_method IS 'HTTP method (GET, POST, etc.)';
COMMENT ON COLUMN partner_usage_tracking.response_status IS 'HTTP response status code';
COMMENT ON COLUMN partner_usage_tracking.response_time_ms IS 'Response time in milliseconds';
COMMENT ON COLUMN partner_usage_tracking.billing_period IS 'Billing period (YYYY-MM format)';
