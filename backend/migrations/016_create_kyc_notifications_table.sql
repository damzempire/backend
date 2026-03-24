-- Migration: Create KYC Notifications Table
-- Description: Tracks all KYC compliance notifications sent to users

CREATE TABLE IF NOT EXISTS kyc_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address VARCHAR(255) NOT NULL,
    kyc_status_id UUID NOT NULL REFERENCES kyc_statuses(id) ON DELETE CASCADE,
    notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN ('EXPIRATION_WARNING', 'EXPIRED', 'SOFT_LOCK', 'REVERIFY_REQUIRED', 'VERIFICATION_COMPLETE', 'MANUAL_REVIEW')),
    urgency_level VARCHAR(20) NOT NULL CHECK (urgency_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    channels JSON NOT NULL DEFAULT '[]',
    delivery_status JSON NOT NULL DEFAULT '{}',
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    action_required BOOLEAN NOT NULL DEFAULT true,
    action_type VARCHAR(30) NULL CHECK (action_type IN ('REVERIFY_KYC', 'UPDATE_DOCUMENTS', 'CONTACT_SUPPORT', 'REVIEW_STATUS')),
    action_url VARCHAR(500) NULL,
    action_deadline TIMESTAMP NULL,
    days_until_expiration INTEGER NULL,
    kyc_status_at_notification VARCHAR(20) NOT NULL,
    expiration_date_at_notification TIMESTAMP NULL,
    template_used VARCHAR(50) NULL,
    metadata JSON NULL,
    error_message TEXT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_kyc_notifications_user_address ON kyc_notifications(user_address);
CREATE INDEX idx_kyc_notifications_kyc_status_id ON kyc_notifications(kyc_status_id);
CREATE INDEX idx_kyc_notifications_type ON kyc_notifications(notification_type);
CREATE INDEX idx_kyc_notifications_urgency ON kyc_notifications(urgency_level);
CREATE INDEX idx_kyc_notifications_sent_at ON kyc_notifications(sent_at);
CREATE INDEX idx_kyc_notifications_action_required ON kyc_notifications(action_required);
CREATE INDEX idx_kyc_notifications_read_at ON kyc_notifications(read_at);
CREATE INDEX idx_kyc_notifications_next_retry ON kyc_notifications(next_retry_at);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_kyc_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_kyc_notifications_updated_at
    BEFORE UPDATE ON kyc_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_kyc_notifications_updated_at();

-- Add comments for documentation
COMMENT ON TABLE kyc_notifications IS 'Tracks all KYC compliance notifications sent to users for audit trails';
COMMENT ON COLUMN kyc_notifications.user_address IS 'User wallet address';
COMMENT ON COLUMN kyc_notifications.kyc_status_id IS 'Associated KYC status record';
COMMENT ON COLUMN kyc_notifications.notification_type IS 'Type of notification sent';
COMMENT ON COLUMN kyc_notifications.urgency_level IS 'Urgency level of the notification';
COMMENT ON COLUMN kyc_notifications.title IS 'Notification title';
COMMENT ON COLUMN kyc_notifications.message IS 'Notification message content';
COMMENT ON COLUMN kyc_notifications.channels IS 'Channels through which notification was sent (email, push, sms, in_app)';
COMMENT ON COLUMN kyc_notifications.delivery_status IS 'Delivery status per channel (sent, failed, pending)';
COMMENT ON COLUMN kyc_notifications.sent_at IS 'Timestamp when notification was sent';
COMMENT ON COLUMN kyc_notifications.read_at IS 'Timestamp when notification was read by user';
COMMENT ON COLUMN kyc_notifications.action_required IS 'Whether user action is required';
COMMENT ON COLUMN kyc_notifications.action_type IS 'Type of action required from user';
COMMENT ON COLUMN kyc_notifications.action_url IS 'URL for user to take required action';
COMMENT ON COLUMN kyc_notifications.action_deadline IS 'Deadline for user to take action';
COMMENT ON COLUMN kyc_notifications.days_until_expiration IS 'Days until KYC expiration at time of notification';
COMMENT ON COLUMN kyc_notifications.kyc_status_at_notification IS 'KYC status at time notification was sent';
COMMENT ON COLUMN kyc_notifications.expiration_date_at_notification IS 'KYC expiration date at time of notification';
COMMENT ON COLUMN kyc_notifications.template_used IS 'Notification template identifier used';
COMMENT ON COLUMN kyc_notifications.metadata IS 'Additional metadata for the notification';
COMMENT ON COLUMN kyc_notifications.error_message IS 'Error message if notification delivery failed';
COMMENT ON COLUMN kyc_notifications.retry_count IS 'Number of delivery retry attempts';
COMMENT ON COLUMN kyc_notifications.next_retry_at IS 'Timestamp for next retry attempt';

-- Create view for unread notifications
CREATE OR REPLACE VIEW kyc_unread_notifications AS
SELECT 
    id,
    user_address,
    kyc_status_id,
    notification_type,
    urgency_level,
    title,
    message,
    sent_at,
    action_required,
    action_type,
    action_url,
    action_deadline,
    days_until_expiration,
    template_used,
    metadata,
    created_at,
    updated_at,
    CASE 
        WHEN action_deadline IS NOT NULL AND action_deadline < CURRENT_TIMESTAMP THEN true
        ELSE false
    END as is_expired
FROM kyc_notifications 
WHERE read_at IS NULL
ORDER BY urgency_level DESC, sent_at DESC;

COMMENT ON VIEW kyc_unread_notifications IS 'View of unread KYC notifications for users';

-- Create view for notifications requiring action
CREATE OR REPLACE VIEW kyc_action_required_notifications AS
SELECT 
    id,
    user_address,
    kyc_status_id,
    notification_type,
    urgency_level,
    title,
    message,
    sent_at,
    action_type,
    action_url,
    action_deadline,
    days_until_expiration,
    template_used,
    metadata,
    created_at,
    updated_at,
    CASE 
        WHEN action_deadline IS NOT NULL AND action_deadline < CURRENT_TIMESTAMP THEN true
        ELSE false
    END as is_expired,
    CASE 
        WHEN action_deadline IS NOT NULL THEN
            EXTRACT(DAY FROM (action_deadline - CURRENT_DATE))
        ELSE NULL
    END as days_until_deadline
FROM kyc_notifications 
WHERE action_required = true 
    AND read_at IS NULL
ORDER BY urgency_level DESC, action_deadline ASC;

COMMENT ON VIEW kyc_action_required_notifications IS 'View of notifications requiring user action';

-- Create function to get user notification statistics
CREATE OR REPLACE FUNCTION get_user_notification_stats(user_addr VARCHAR(255), days_range INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    start_date TIMESTAMP;
    stats JSON;
BEGIN
    start_date := CURRENT_DATE - INTERVAL '1 day' * days_range;
    
    SELECT json_build_object(
        'totalNotifications', COUNT(*),
        'unreadNotifications', COUNT(*) FILTER (WHERE read_at IS NULL),
        'actionRequired', COUNT(*) FILTER (WHERE action_required = true AND read_at IS NULL),
        'expiredActions', COUNT(*) FILTER (WHERE action_required = true AND read_at IS NULL AND action_deadline < CURRENT_TIMESTAMP),
        'urgencyBreakdown', json_build_object(
            'CRITICAL', COUNT(*) FILTER (WHERE urgency_level = 'CRITICAL'),
            'HIGH', COUNT(*) FILTER (WHERE urgency_level = 'HIGH'),
            'MEDIUM', COUNT(*) FILTER (WHERE urgency_level = 'MEDIUM'),
            'LOW', COUNT(*) FILTER (WHERE urgency_level = 'LOW')
        ),
        'typeBreakdown', json_build_object(
            'EXPIRATION_WARNING', COUNT(*) FILTER (WHERE notification_type = 'EXPIRATION_WARNING'),
            'EXPIRED', COUNT(*) FILTER (WHERE notification_type = 'EXPIRED'),
            'SOFT_LOCK', COUNT(*) FILTER (WHERE notification_type = 'SOFT_LOCK'),
            'REVERIFY_REQUIRED', COUNT(*) FILTER (WHERE notification_type = 'REVERIFY_REQUIRED'),
            'VERIFICATION_COMPLETE', COUNT(*) FILTER (WHERE notification_type = 'VERIFICATION_COMPLETE'),
            'MANUAL_REVIEW', COUNT(*) FILTER (WHERE notification_type = 'MANUAL_REVIEW')
        )
    ) INTO stats
    FROM kyc_notifications 
    WHERE user_address = user_addr 
        AND sent_at >= start_date;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_notification_stats IS 'Get notification statistics for a user within a date range';

-- Create function to cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    cutoff_date TIMESTAMP;
    deleted_count INTEGER;
BEGIN
    cutoff_date := CURRENT_DATE - INTERVAL '1 day' * retention_days;
    
    DELETE FROM kyc_notifications 
    WHERE sent_at < cutoff_date 
        AND read_at IS NOT NULL 
        AND action_required = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_notifications IS 'Clean up old read notifications that don\'t require action';

-- Create trigger for automatic cleanup (run monthly)
-- This would typically be called by a scheduled job, not a trigger
CREATE OR REPLACE FUNCTION schedule_notification_cleanup()
RETURNS void AS $$
BEGIN
    -- This function would be called by a cron job monthly
    PERFORM cleanup_old_notifications(365);
END;
$$ LANGUAGE plpgsql;
