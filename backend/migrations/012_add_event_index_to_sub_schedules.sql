-- Migration: Add event_index to sub_schedules for idempotent event ingestion
-- A single transaction can emit multiple events; transaction_hash alone is insufficient.

-- Add event_index column with default 0 for backward compatibility
ALTER TABLE sub_schedules ADD COLUMN IF NOT EXISTS event_index INTEGER NOT NULL DEFAULT 0;

-- Drop old single-column unique constraint (covers both possible legacy names)
ALTER TABLE sub_schedules DROP CONSTRAINT IF EXISTS sub_schedules_transaction_hash_key;
ALTER TABLE sub_schedules DROP CONSTRAINT IF EXISTS sub_schedules_top_up_transaction_hash_key;

-- Drop old single-column index
DROP INDEX IF EXISTS idx_sub_schedules_tx_hash;

-- Add composite unique constraint for idempotency
ALTER TABLE sub_schedules ADD CONSTRAINT uk_sub_schedules_tx_event UNIQUE (transaction_hash, event_index);

-- Add composite index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_sub_schedules_tx_event ON sub_schedules(transaction_hash, event_index);
