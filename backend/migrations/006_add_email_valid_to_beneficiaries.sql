-- Add email_valid column to beneficiaries table
-- This column tracks whether an email address is valid (not bounced)

ALTER TABLE beneficiaries 
ADD COLUMN email_valid BOOLEAN NOT NULL DEFAULT true;

-- Add comment to the column
COMMENT ON COLUMN beneficiaries.email_valid IS 'Flag to indicate if email is valid (not bounced)';

-- Create index for faster queries on email validity
CREATE INDEX idx_beneficiaries_email_valid ON beneficiaries(email_valid) WHERE email_valid = false;
