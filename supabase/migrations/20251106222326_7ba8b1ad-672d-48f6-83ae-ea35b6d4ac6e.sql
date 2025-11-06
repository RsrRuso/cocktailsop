-- Drop existing policies
DROP POLICY IF EXISTS "Users can create own status" ON public.user_status;
DROP POLICY IF EXISTS "Users can update own status" ON public.user_status;

-- Recreate policies with proper auth.uid() wrapping
CREATE POLICY "Users can create own status" 
ON public.user_status 
FOR INSERT 
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own status" 
ON public.user_status 
FOR UPDATE 
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);