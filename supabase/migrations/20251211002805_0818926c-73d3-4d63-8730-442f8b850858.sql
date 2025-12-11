-- Add artist column to music_tracks table for storing recognized artist names
ALTER TABLE public.music_tracks ADD COLUMN IF NOT EXISTS artist TEXT;