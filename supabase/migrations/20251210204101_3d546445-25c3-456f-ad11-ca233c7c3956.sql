-- Add music_url column to reels table for music attachment
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS music_url TEXT;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS music_track_id UUID;