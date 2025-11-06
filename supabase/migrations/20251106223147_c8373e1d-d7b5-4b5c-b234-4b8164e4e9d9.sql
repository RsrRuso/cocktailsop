-- Fix RLS policy to allow users to see their own expired status
-- This is needed for UPSERT to work correctly

DROP POLICY IF EXISTS "Status viewable by everyone" ON public.user_status;

-- Allow everyone to see active statuses, but allow users to see their own even if expired
CREATE POLICY "Status viewable by everyone" 
ON public.user_status 
FOR SELECT 
USING (
  expires_at > now() 
  OR auth.uid() = user_id
);