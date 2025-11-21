-- Relax strict unique constraints on access_requests to allow multiple requests per workspace/user
-- while keeping a partial unique index only for pending requests.

-- Drop possible unique constraints (if they exist)
ALTER TABLE public.access_requests DROP CONSTRAINT IF EXISTS access_requests_workspace_user_unique;
ALTER TABLE public.access_requests DROP CONSTRAINT IF EXISTS access_requests_workspace_email_unique;

-- Drop unique indexes enforcing global uniqueness on (workspace_id, user_id) and (workspace_id, user_email)
DROP INDEX IF EXISTS access_requests_workspace_user_unique;
DROP INDEX IF EXISTS access_requests_workspace_email_unique;