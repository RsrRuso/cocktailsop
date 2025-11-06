-- Drop existing policies
DROP POLICY IF EXISTS "Users can create own status" ON public.user_status;
DROP POLICY IF EXISTS "Users can update own status" ON public.user_status;

-- Recreate INSERT policy with proper check
CREATE POLICY "Users can create own status" 
ON public.user_status 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Recreate UPDATE policy - remove USING expression to allow upsert
CREATE POLICY "Users can update own status" 
ON public.user_status 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);