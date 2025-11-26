-- Add draft status to internal_emails table
ALTER TABLE internal_emails 
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;

-- Add index for draft filtering
CREATE INDEX IF NOT EXISTS idx_internal_emails_draft 
ON internal_emails(recipient_id, is_draft) 
WHERE is_draft = true;