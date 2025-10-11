-- Update RLS policies to allow creators to edit/delete their own events
DROP POLICY IF EXISTS "Founders and managers can delete own events" ON public.events;
DROP POLICY IF EXISTS "Founders and managers can update own events" ON public.events;
DROP POLICY IF EXISTS "Founders and managers can create events" ON public.events;

-- Allow creators to manage their own events
CREATE POLICY "Users can delete own events"
ON public.events FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
ON public.events FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can create events"
ON public.events FOR INSERT
WITH CHECK (auth.uid() = user_id);