-- Create event_likes table
CREATE TABLE public.event_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create event_comments table
CREATE TABLE public.event_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create event_attendees table
CREATE TABLE public.event_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add engagement count columns to events table
ALTER TABLE public.events
ADD COLUMN like_count INTEGER DEFAULT 0,
ADD COLUMN comment_count INTEGER DEFAULT 0,
ADD COLUMN attendee_count INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.event_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_likes
CREATE POLICY "Event likes viewable by everyone"
ON public.event_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like events"
ON public.event_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike events"
ON public.event_likes FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for event_comments
CREATE POLICY "Event comments viewable by everyone"
ON public.event_comments FOR SELECT
USING (true);

CREATE POLICY "Users can comment on events"
ON public.event_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON public.event_comments FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for event_attendees
CREATE POLICY "Event attendees viewable by everyone"
ON public.event_attendees FOR SELECT
USING (true);

CREATE POLICY "Users can mark attendance"
ON public.event_attendees FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove attendance"
ON public.event_attendees FOR DELETE
USING (auth.uid() = user_id);

-- Triggers to update event counts
CREATE OR REPLACE FUNCTION public.update_event_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events 
    SET like_count = like_count + 1 
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events 
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.event_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_event_likes_count
AFTER INSERT OR DELETE ON public.event_likes
FOR EACH ROW EXECUTE FUNCTION public.update_event_like_count();

CREATE OR REPLACE FUNCTION public.update_event_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events 
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.event_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_event_comments_count
AFTER INSERT OR DELETE ON public.event_comments
FOR EACH ROW EXECUTE FUNCTION public.update_event_comment_count();

CREATE OR REPLACE FUNCTION public.update_event_attendee_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events 
    SET attendee_count = attendee_count + 1 
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events 
    SET attendee_count = GREATEST(attendee_count - 1, 0)
    WHERE id = OLD.event_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_event_attendees_count
AFTER INSERT OR DELETE ON public.event_attendees
FOR EACH ROW EXECUTE FUNCTION public.update_event_attendee_count();