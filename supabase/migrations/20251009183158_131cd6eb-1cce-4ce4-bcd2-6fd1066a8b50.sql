-- Add cover_url column to profiles table for cover photos
ALTER TABLE public.profiles 
ADD COLUMN cover_url TEXT;