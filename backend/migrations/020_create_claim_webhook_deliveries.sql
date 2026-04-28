CREATE TABLE IF NOT EXISTS claim_webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_webhook_id UUID NOT NULL REFERENCES organization_webhooks(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    event_type VARCHAR(64) NOT NULL DEFAULT 'tokens_claimed',
    event_key VARCHAR(255) NOT NULL,
    transaction_hash VARCHAR(255) NOT NULL,
    beneficiary_address VARCHAR(255) NOT NULL,
    target_url VARCHAR(512) NOT NULL,
    payload JSONB NOT NULL,
    payload_signature VARCHAR(255) NULL,
    delivery_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP NULL,
    next_attempt_at TIMESTAMP NULL,
    last_http_status INTEGER NULL,
    last_response_body TEXT NULL,
    last_error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_claim_webhook_deliveries_unique_event
    ON claim_webhook_deliveries(organization_webhook_id, event_key);

CREATE INDEX IF NOT EXISTS idx_claim_webhook_deliveries_status
    ON claim_webhook_deliveries(delivery_status);

CREATE INDEX IF NOT EXISTS idx_claim_webhook_deliveries_tx_hash
    ON claim_webhook_deliveries(transaction_hash);

CREATE INDEX IF NOT EXISTS idx_claim_webhook_deliveries_next_attempt
    ON claim_webhook_deliveries(next_attempt_at);

CREATE TRIGGER update_claim_webhook_deliveries_updated_at BEFORE UPDATE ON claim_webhook_deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
