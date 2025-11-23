-- Add permissions column to workspace_members table
ALTER TABLE workspace_members 
ADD COLUMN permissions JSONB DEFAULT '{"can_receive": false, "can_transfer": false}'::jsonb;

-- Create index for faster permission lookups
CREATE INDEX idx_workspace_members_permissions ON workspace_members USING gin(permissions);

-- Update existing members to have default permissions (admins get all permissions)
UPDATE workspace_members 
SET permissions = '{"can_receive": true, "can_transfer": true}'::jsonb 
WHERE role = 'admin';

-- Comment on the column
COMMENT ON COLUMN workspace_members.permissions IS 'JSON object containing member permissions: can_receive (bool), can_transfer (bool)';