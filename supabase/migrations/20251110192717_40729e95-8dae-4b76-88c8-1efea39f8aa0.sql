-- Fix the created_by column to have a default value
ALTER TABLE public.teams 
ALTER COLUMN created_by SET DEFAULT auth.uid();

-- The trigger and policy from the previous migration are still in place
-- This just ensures created_by has a default value if not explicitly set