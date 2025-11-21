-- Add workspace_type column to workspaces table to distinguish between different programs
ALTER TABLE public.workspaces 
ADD COLUMN workspace_type text DEFAULT 'store_management' CHECK (workspace_type IN ('store_management', 'fifo'));

-- Update existing workspaces to default type
UPDATE public.workspaces 
SET workspace_type = 'store_management' 
WHERE workspace_type IS NULL;