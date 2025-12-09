-- SpecVerse Music Box™ Module Tables

-- TABLE: music_tracks - Core music storage
CREATE TABLE public.music_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_url TEXT,
  preview_url TEXT,
  waveform_data JSONB,
  duration_sec INTEGER,
  category TEXT DEFAULT 'other' CHECK (category IN ('beat', 'ambient', 'jingle', 'voice', 'other', 'sfx')),
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing')),
  bpm INTEGER,
  file_size_bytes BIGINT,
  format TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- TABLE: music_usage - Track usage in content
CREATE TABLE public.music_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('reel', 'post', 'story')),
  content_id UUID NOT NULL,
  trim_start_sec NUMERIC DEFAULT 0,
  trim_end_sec NUMERIC,
  volume NUMERIC DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- TABLE: music_popularity - Auto-updated ranking
CREATE TABLE public.music_popularity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL UNIQUE REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  usage_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  usage_score NUMERIC DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_popularity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for music_tracks
CREATE POLICY "Users can view approved tracks" ON public.music_tracks
  FOR SELECT USING (status = 'approved' OR uploaded_by = auth.uid());

CREATE POLICY "Users can upload their own tracks" ON public.music_tracks
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own pending tracks" ON public.music_tracks
  FOR UPDATE USING (auth.uid() = uploaded_by AND status = 'pending');

CREATE POLICY "Users can delete their own tracks" ON public.music_tracks
  FOR DELETE USING (auth.uid() = uploaded_by);

-- RLS Policies for music_usage
CREATE POLICY "Users can view all usage" ON public.music_usage
  FOR SELECT USING (true);

CREATE POLICY "Users can create usage records" ON public.music_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own usage" ON public.music_usage
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for music_popularity (read-only for users)
CREATE POLICY "Anyone can view popularity" ON public.music_popularity
  FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_music_tracks_status ON public.music_tracks(status);
CREATE INDEX idx_music_tracks_category ON public.music_tracks(category);
CREATE INDEX idx_music_tracks_uploaded_by ON public.music_tracks(uploaded_by);
CREATE INDEX idx_music_usage_track_id ON public.music_usage(track_id);
CREATE INDEX idx_music_usage_user_id ON public.music_usage(user_id);
CREATE INDEX idx_music_popularity_score ON public.music_popularity(usage_score DESC);

-- Function to auto-create popularity record when track is approved
CREATE OR REPLACE FUNCTION public.create_music_popularity_on_approve()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO music_popularity (track_id) 
    VALUES (NEW.id)
    ON CONFLICT (track_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_music_track_approve
  AFTER INSERT OR UPDATE ON public.music_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.create_music_popularity_on_approve();

-- Function to update popularity on usage
CREATE OR REPLACE FUNCTION public.update_music_popularity_on_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE music_popularity 
    SET usage_count = usage_count + 1,
        usage_score = ((usage_count + 1) * 1.3) + (like_count * 2) + save_count + (share_count * 3),
        last_updated = now()
    WHERE track_id = NEW.track_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE music_popularity 
    SET usage_count = GREATEST(usage_count - 1, 0),
        usage_score = (GREATEST(usage_count - 1, 0) * 1.3) + (like_count * 2) + save_count + (share_count * 3),
        last_updated = now()
    WHERE track_id = OLD.track_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_music_usage_change
  AFTER INSERT OR DELETE ON public.music_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_music_popularity_on_usage();

-- Enable realtime for music_tracks
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_tracks;