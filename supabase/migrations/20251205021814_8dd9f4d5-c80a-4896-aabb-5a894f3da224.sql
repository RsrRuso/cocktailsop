-- Add music status columns to user_status table
ALTER TABLE public.user_status 
ADD COLUMN IF NOT EXISTS music_track_id TEXT,
ADD COLUMN IF NOT EXISTS music_track_name TEXT,
ADD COLUMN IF NOT EXISTS music_artist TEXT,
ADD COLUMN IF NOT EXISTS music_album_art TEXT,
ADD COLUMN IF NOT EXISTS music_preview_url TEXT,
ADD COLUMN IF NOT EXISTS music_spotify_url TEXT;