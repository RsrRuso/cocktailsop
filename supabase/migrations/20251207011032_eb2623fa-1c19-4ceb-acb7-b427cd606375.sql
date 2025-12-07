-- Create livestreams table
CREATE TABLE public.livestreams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended', 'scheduled')),
  viewer_count INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create livestream_comments table
CREATE TABLE public.livestream_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  livestream_id UUID NOT NULL REFERENCES public.livestreams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create livestream_viewers table to track active viewers
CREATE TABLE public.livestream_viewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  livestream_id UUID NOT NULL REFERENCES public.livestreams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(livestream_id, user_id)
);

-- Enable RLS
ALTER TABLE public.livestreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livestream_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livestream_viewers ENABLE ROW LEVEL SECURITY;

-- Livestreams policies
CREATE POLICY "Anyone can view live streams" ON public.livestreams
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own livestreams" ON public.livestreams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own livestreams" ON public.livestreams
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own livestreams" ON public.livestreams
  FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Anyone can view livestream comments" ON public.livestream_comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment" ON public.livestream_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.livestream_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.livestream_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Viewers policies
CREATE POLICY "Anyone can view viewer counts" ON public.livestream_viewers
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join streams" ON public.livestream_viewers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their viewer status" ON public.livestream_viewers
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.livestream_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.livestreams;

-- Trigger to update viewer count
CREATE OR REPLACE FUNCTION update_livestream_viewer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.livestreams 
    SET viewer_count = viewer_count + 1,
        peak_viewers = GREATEST(peak_viewers, viewer_count + 1)
    WHERE id = NEW.livestream_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.left_at IS NOT NULL AND OLD.left_at IS NULL THEN
    UPDATE public.livestreams 
    SET viewer_count = GREATEST(0, viewer_count - 1)
    WHERE id = NEW.livestream_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_viewer_join_or_leave
AFTER INSERT OR UPDATE ON public.livestream_viewers
FOR EACH ROW EXECUTE FUNCTION update_livestream_viewer_count();