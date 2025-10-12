-- Add status column to events table
ALTER TABLE public.events 
ADD COLUMN status text NOT NULL DEFAULT 'upcoming' 
CHECK (status IN ('upcoming', 'completed'));

-- Create index for better query performance
CREATE INDEX idx_events_status ON public.events(status);

-- Create function to automatically update event status when expired
CREATE OR REPLACE FUNCTION update_expired_events()
RETURNS void AS $$
BEGIN
  UPDATE public.events
  SET status = 'completed'
  WHERE status = 'upcoming'
    AND event_date IS NOT NULL
    AND event_date < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to update status on insert/update
CREATE OR REPLACE FUNCTION check_event_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_date IS NOT NULL AND NEW.event_date < NOW() THEN
    NEW.status := 'completed';
  ELSE
    NEW.status := 'upcoming';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_event_status
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION check_event_status();