-- Migration: Create KYC Statuses Table
-- Description: Tracks KYC/AML verification status and expiration monitoring

CREATE TABLE IF NOT EXISTS kyc_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address VARCHAR(255) NOT NULL UNIQUE,
    sep12_customer_id VARCHAR(255) NULL,
    kyc_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (kyc_status IN ('VERIFIED', 'PENDING', 'REJECTED', 'EXPIRED', 'SOFT_LOCKED')),
    kyc_level VARCHAR(20) NOT NULL DEFAULT 'BASIC' CHECK (kyc_level IN ('BASIC', 'ENHANCED', 'INSTITUTIONAL')),
    verification_date TIMESTAMP NULL,
    expiration_date TIMESTAMP NULL,
    risk_score DECIMAL(3,2) NOT NULL DEFAULT 0.00 CHECK (risk_score >= 0.00 AND risk_score <= 1.00),
    risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    last_screening_date TIMESTAMP NULL,
    next_screening_date TIMESTAMP NULL,
    soft_lock_enabled BOOLEAN NOT NULL DEFAULT false,
    soft_lock_reason TEXT NULL,
    soft_lock_date TIMESTAMP NULL,
    notifications_sent JSON NULL DEFAULT '[]',
    last_notification_date TIMESTAMP NULL,
    notification_preferences JSON NULL DEFAULT '{"email": true, "push": true, "sms": false, "in_app": true}',
    verification_provider VARCHAR(50) NOT NULL DEFAULT 'stellar',
    provider_reference_id VARCHAR(255) NULL,
    sep12_response_data JSON NULL,
    compliance_notes TEXT NULL,
    manual_review_required BOOLEAN NOT NULL DEFAULT false,
    manual_review_date TIMESTAMP NULL,
    reviewed_by VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE UNIQUE INDEX idx_kyc_statuses_user_address ON kyc_statuses(user_address);
CREATE INDEX idx_kyc_statuses_status ON kyc_statuses(kyc_status);
CREATE INDEX idx_kyc_statuses_expiration_date ON kyc_statuses(expiration_date);
CREATE INDEX idx_kyc_statuses_risk_level ON kyc_statuses(risk_level);
CREATE INDEX idx_kyc_statuses_soft_lock ON kyc_statuses(soft_lock_enabled);
CREATE INDEX idx_kyc_statuses_provider ON kyc_statuses(verification_provider);
CREATE INDEX idx_kyc_statuses_sep12_id ON kyc_statuses(sep12_customer_id);
CREATE INDEX idx_kyc_statuses_active ON kyc_statuses(is_active);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_kyc_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_kyc_statuses_updated_at
    BEFORE UPDATE ON kyc_statuses
    FOR EACH ROW
    EXECUTE FUNCTION update_kyc_statuses_updated_at();

-- Add comments for documentation
COMMENT ON TABLE kyc_statuses IS 'Tracks KYC/AML verification status and expiration monitoring for ongoing due diligence';
COMMENT ON COLUMN kyc_statuses.user_address IS 'User wallet address';
COMMENT ON COLUMN kyc_statuses.sep12_customer_id IS 'SEP-12 customer ID from Stellar KYC service';
COMMENT ON COLUMN kyc_statuses.kyc_status IS 'Current KYC verification status';
COMMENT ON COLUMN kyc_statuses.kyc_level IS 'KYC verification level (BASIC, ENHANCED, INSTITUTIONAL)';
COMMENT ON COLUMN kyc_statuses.verification_date IS 'Date when KYC was last verified';
COMMENT ON COLUMN kyc_statuses.expiration_date IS 'KYC status expiration date';
COMMENT ON COLUMN kyc_statuses.risk_score IS 'Risk assessment score (0.00-1.00)';
COMMENT ON COLUMN kyc_statuses.risk_level IS 'Risk level based on assessment (LOW, MEDIUM, HIGH, CRITICAL)';
COMMENT ON COLUMN kyc_statuses.last_screening_date IS 'Date of last AML screening';
COMMENT ON COLUMN kyc_statuses.next_screening_date IS 'Scheduled next AML screening date';
COMMENT ON COLUMN kyc_statuses.soft_lock_enabled IS 'Whether soft-lock is enabled for this user';
COMMENT ON COLUMN kyc_statuses.soft_lock_reason IS 'Reason for soft-lock activation';
COMMENT ON COLUMN kyc_statuses.soft_lock_date IS 'Date when soft-lock was applied';
COMMENT ON COLUMN kyc_statuses.notifications_sent IS 'Track sent notifications with timestamps';
COMMENT ON COLUMN kyc_statuses.last_notification_date IS 'Date of last notification sent';
COMMENT ON COLUMN kyc_statuses.notification_preferences IS 'User notification preferences';
COMMENT ON COLUMN kyc_statuses.verification_provider IS 'KYC verification provider (stellar, chainalysis, etc.)';
COMMENT ON COLUMN kyc_statuses.provider_reference_id IS 'Reference ID from verification provider';
COMMENT ON COLUMN kyc_statuses.sep12_response_data IS 'Raw SEP-12 API response data';
COMMENT ON COLUMN kyc_statuses.compliance_notes IS 'Internal compliance notes and observations';
COMMENT ON COLUMN kyc_statuses.manual_review_required IS 'Whether manual compliance review is required';
COMMENT ON COLUMN kyc_statuses.manual_review_date IS 'Date when manual review was last performed';
COMMENT ON COLUMN kyc_statuses.reviewed_by IS 'Admin who performed manual review';
COMMENT ON COLUMN kyc_statuses.is_active IS 'Whether this KYC record is active';

-- Create view for users with expiring KYC (within 7 days)
CREATE OR REPLACE VIEW kyc_expiring_soon AS
SELECT 
    id,
    user_address,
    kyc_status,
    kyc_level,
    verification_date,
    expiration_date,
    risk_score,
    risk_level,
    soft_lock_enabled,
    notifications_sent,
    last_notification_date,
    verification_provider,
    created_at,
    updated_at,
    (expiration_date - CURRENT_DATE) AS days_until_expiration
FROM kyc_statuses 
WHERE 
    is_active = true 
    AND kyc_status NOT IN ('EXPIRED', 'SOFT_LOCKED')
    AND expiration_date IS NOT NULL
    AND expiration_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY expiration_date ASC;

COMMENT ON VIEW kyc_expiring_soon IS 'View of users with KYC expiring within 7 days';

-- Create view for soft-locked users
CREATE OR REPLACE VIEW kyc_soft_locked_users AS
SELECT 
    id,
    user_address,
    kyc_status,
    kyc_level,
    verification_date,
    expiration_date,
    risk_score,
    risk_level,
    soft_lock_reason,
    soft_lock_date,
    notifications_sent,
    last_notification_date,
    verification_provider,
    created_at,
    updated_at,
    (expiration_date - CURRENT_DATE) AS days_until_expiration
FROM kyc_statuses 
WHERE 
    is_active = true 
    AND soft_lock_enabled = true
ORDER BY soft_lock_date DESC;

COMMENT ON VIEW kyc_soft_locked_users IS 'View of users with soft-locked accounts';

-- Create function to check if user can claim
CREATE OR REPLACE FUNCTION can_user_claim(user_addr VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    kyc_record RECORD;
BEGIN
    SELECT * INTO kyc_record 
    FROM kyc_statuses 
    WHERE user_address = user_addr 
        AND is_active = true;
    
    -- If no KYC record found, user cannot claim
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if KYC is verified and not expired
    IF kyc_record.kyc_status = 'VERIFIED' 
       AND (kyc_record.expiration_date IS NULL OR kyc_record.expiration_date > CURRENT_DATE)
       AND NOT kyc_record.soft_lock_enabled THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_user_claim IS 'Check if user is allowed to claim based on KYC status';

-- Create function to get user compliance status
CREATE OR REPLACE FUNCTION get_user_compliance_status(user_addr VARCHAR(255))
RETURNS JSON AS $$
DECLARE
    kyc_record RECORD;
    days_until INTEGER;
    status_json JSON;
BEGIN
    SELECT * INTO kyc_record 
    FROM kyc_statuses 
    WHERE user_address = user_addr 
        AND is_active = true;
    
    -- If no KYC record found
    IF NOT FOUND THEN
        RETURN json_build_object(
            'status', 'NOT_FOUND',
            'canClaim', FALSE,
            'urgency', 'HIGH',
            'message', 'KYC verification required',
            'action', 'Complete KYC verification process'
        );
    END IF;
    
    -- Calculate days until expiration
    days_until := NULL;
    IF kyc_record.expiration_date IS NOT NULL THEN
        days_until := EXTRACT(DAY FROM (kyc_record.expiration_date - CURRENT_DATE));
    END IF;
    
    -- Build status based on KYC status
    IF kyc_record.kyc_status = 'SOFT_LOCKED' THEN
        status_json := json_build_object(
            'status', 'SOFT_LOCKED',
            'canClaim', FALSE,
            'urgency', 'CRITICAL',
            'message', 'Claims temporarily locked due to compliance requirements',
            'action', 'Complete re-verification immediately',
            'softLockReason', kyc_record.soft_lock_reason
        );
    ELSIF kyc_record.expiration_date IS NOT NULL AND kyc_record.expiration_date <= CURRENT_DATE THEN
        status_json := json_build_object(
            'status', 'EXPIRED',
            'canClaim', FALSE,
            'urgency', 'CRITICAL',
            'message', 'KYC verification has expired',
            'action', 'Complete re-verification immediately',
            'expirationDate', kyc_record.expiration_date
        );
    ELSIF days_until IS NOT NULL AND days_until <= 7 AND days_until > 0 THEN
        status_json := json_build_object(
            'status', 'EXPIRING_SOON',
            'canClaim', days_until > 3,
            'urgency', CASE WHEN days_until <= 3 THEN 'CRITICAL' ELSE 'HIGH' END,
            'message', 'KYC verification expires in ' || days_until || ' days',
            'action', 'Complete re-verification before expiration',
            'daysUntilExpiration', days_until,
            'expirationDate', kyc_record.expiration_date
        );
    ELSIF kyc_record.kyc_status = 'VERIFIED' THEN
        status_json := json_build_object(
            'status', 'VERIFIED',
            'canClaim', TRUE,
            'urgency', 'LOW',
            'message', 'KYC verification is current',
            'action', 'Monitor for expiration',
            'daysUntilExpiration', days_until
        );
    ELSE
        status_json := json_build_object(
            'status', kyc_record.kyc_status,
            'canClaim', FALSE,
            'urgency', 'HIGH',
            'message', 'KYC verification required',
            'action', 'Complete KYC verification process'
        );
    END IF;
    
    RETURN status_json;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_compliance_status IS 'Get comprehensive compliance status for a user';
