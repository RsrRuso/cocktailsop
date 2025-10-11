-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Managers can create events" ON public.events;
DROP POLICY IF EXISTS "Managers can update own events" ON public.events;
DROP POLICY IF EXISTS "Managers can delete own events" ON public.events;

-- Allow both founders and managers to create events
CREATE POLICY "Founders and managers can create events"
  ON public.events
  FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    AND auth.uid() = user_id
  );

-- Allow both founders and managers to update their own events
CREATE POLICY "Founders and managers can update own events"
  ON public.events
  FOR UPDATE
  USING (
    (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    AND auth.uid() = user_id
  );

-- Allow both founders and managers to delete their own events
CREATE POLICY "Founders and managers can delete own events"
  ON public.events
  FOR DELETE
  USING (
    (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    AND auth.uid() = user_id
  );