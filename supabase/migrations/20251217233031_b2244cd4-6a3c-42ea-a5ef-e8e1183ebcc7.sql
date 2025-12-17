-- Add columns for image-based reels
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS duration integer DEFAULT 30;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS is_image_reel boolean DEFAULT false;