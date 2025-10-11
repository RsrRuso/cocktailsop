-- Create events table for regional announcements
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  region TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS on events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Events are viewable by everyone
CREATE POLICY "Events viewable by everyone"
  ON public.events
  FOR SELECT
  USING (is_active = true);

-- Only managers can create events
CREATE POLICY "Managers can create events"
  ON public.events
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'manager'::app_role) AND
    auth.uid() = user_id
  );

-- Managers can update their own events
CREATE POLICY "Managers can update own events"
  ON public.events
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'manager'::app_role) AND
    auth.uid() = user_id
  );

-- Managers can delete their own events
CREATE POLICY "Managers can delete own events"
  ON public.events
  FOR DELETE
  USING (
    has_role(auth.uid(), 'manager'::app_role) AND
    auth.uid() = user_id
  );

-- Create updated_at trigger for events
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for region filtering
CREATE INDEX idx_events_region ON public.events(region) WHERE is_active = true;
CREATE INDEX idx_events_created_at ON public.events(created_at DESC);