-- Add UPDATE policy for stories so users can add to existing stories
CREATE POLICY "Users can update own stories"
ON public.stories
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);