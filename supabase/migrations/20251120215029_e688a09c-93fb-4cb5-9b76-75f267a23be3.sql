-- Add email and linked_user_id to staff_members table
ALTER TABLE staff_members 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invitation_status TEXT DEFAULT 'pending';

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_staff_members_email ON staff_members(email);
CREATE INDEX IF NOT EXISTS idx_staff_members_linked_user_id ON staff_members(linked_user_id);

-- Add unique constraint on email per user_id (manager)
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_members_email_user_id ON staff_members(user_id, email) WHERE email IS NOT NULL;

COMMENT ON COLUMN staff_members.email IS 'Email address for the staff member to receive notifications';
COMMENT ON COLUMN staff_members.linked_user_id IS 'Reference to auth.users if staff member has registered on platform';
COMMENT ON COLUMN staff_members.invitation_status IS 'Status: pending, sent, registered';