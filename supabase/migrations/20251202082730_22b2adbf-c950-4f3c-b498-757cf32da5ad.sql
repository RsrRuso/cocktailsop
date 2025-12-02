-- Create user_music_library table for personal music uploads
CREATE TABLE IF NOT EXISTS public.user_music_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_user_file UNIQUE (user_id, file_url)
);

-- Enable RLS
ALTER TABLE public.user_music_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own music library"
  ON public.user_music_library
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload to their own library"
  ON public.user_music_library
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own library"
  ON public.user_music_library
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_music_library_user_id ON public.user_music_library(user_id);
CREATE INDEX IF NOT EXISTS idx_user_music_library_created_at ON public.user_music_library(created_at DESC);