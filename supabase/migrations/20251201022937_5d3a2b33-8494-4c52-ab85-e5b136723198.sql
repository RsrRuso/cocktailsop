-- Create platform music library table for AI-curated music
CREATE TABLE IF NOT EXISTS public.platform_music_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  genre TEXT,
  mood TEXT,
  duration_seconds INTEGER,
  preview_url TEXT,
  spotify_url TEXT,
  cover_image_url TEXT,
  bpm INTEGER,
  energy_level TEXT, -- low, medium, high
  ai_tags TEXT[], -- AI-generated tags for smart search
  ai_description TEXT, -- AI-generated description
  popularity_score INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  added_by TEXT DEFAULT 'matrix_ai',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_platform_music_genre ON public.platform_music_library(genre);
CREATE INDEX idx_platform_music_mood ON public.platform_music_library(mood);
CREATE INDEX idx_platform_music_tags ON public.platform_music_library USING GIN(ai_tags);
CREATE INDEX idx_platform_music_popularity ON public.platform_music_library(popularity_score DESC);
CREATE INDEX idx_platform_music_active ON public.platform_music_library(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.platform_music_library ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active music
CREATE POLICY "Anyone can view active platform music"
  ON public.platform_music_library
  FOR SELECT
  USING (is_active = true);

-- Policy: System can insert music (for AI)
CREATE POLICY "System can insert platform music"
  ON public.platform_music_library
  FOR INSERT
  WITH CHECK (true);

-- Policy: System can update music
CREATE POLICY "System can update platform music"
  ON public.platform_music_library
  FOR UPDATE
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_platform_music_library_updated_at
  BEFORE UPDATE ON public.platform_music_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_music_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE platform_music_library
  SET usage_count = usage_count + 1,
      popularity_score = usage_count + 1
  WHERE track_id = NEW.music_url
  OR preview_url = NEW.music_url;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;