-- Add music_url and music_track_id columns to posts table for music attachment
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS music_url text,
ADD COLUMN IF NOT EXISTS music_track_id text;