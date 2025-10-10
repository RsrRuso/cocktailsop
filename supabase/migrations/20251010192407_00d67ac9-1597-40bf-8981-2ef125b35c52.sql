-- Add missing RLS policies for reports table

CREATE POLICY "Users can update own reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
ON public.reports
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);