-- Add cumulative_claimed_amount field to sub_schedules table
-- This field tracks cumulative claimed amounts to prevent dust loss from integer division truncation

ALTER TABLE sub_schedules 
ADD COLUMN cumulative_claimed_amount DECIMAL(36, 18) NOT NULL DEFAULT 0 
COMMENT 'Cumulative amount claimed to prevent dust loss from integer division truncation';

-- Create index for better query performance on the new field
CREATE INDEX idx_sub_schedules_cumulative_claimed ON sub_schedules(cumulative_claimed_amount);
