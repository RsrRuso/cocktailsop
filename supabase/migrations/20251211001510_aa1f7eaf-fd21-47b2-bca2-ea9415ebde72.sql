-- Add mute_original_audio column to reels table
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS mute_original_audio boolean DEFAULT false;