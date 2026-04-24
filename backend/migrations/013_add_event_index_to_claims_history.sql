-- Migration: Add event_index to claims_history for idempotent event ingestion
-- A single transaction can emit multiple claim events; transaction_hash alone is insufficient.

-- Add event_index column with default 0 for backward compatibility
ALTER TABLE claims_history ADD COLUMN IF NOT EXISTS event_index INTEGER NOT NULL DEFAULT 0;

-- Drop old single-column unique constraint
ALTER TABLE claims_history DROP CONSTRAINT IF EXISTS claims_history_transaction_hash_key;

-- Drop old single-column index
DROP INDEX IF EXISTS idx_claims_history_transaction_hash;

-- Add composite unique constraint for idempotency
ALTER TABLE claims_history ADD CONSTRAINT uk_claims_history_tx_event UNIQUE (transaction_hash, event_index);

-- Add composite index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_claims_history_tx_event ON claims_history(transaction_hash, event_index);
