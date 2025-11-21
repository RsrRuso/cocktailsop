-- Drop the incorrect UNIQUE constraint on qr_code_id
ALTER TABLE public.access_requests DROP CONSTRAINT IF EXISTS access_requests_qr_code_id_key;

-- Add proper unique constraint to prevent duplicate requests from same user to same workspace
-- Allow one pending request per user per workspace
CREATE UNIQUE INDEX idx_unique_pending_access_request 
ON public.access_requests (workspace_id, user_id) 
WHERE status = 'pending';