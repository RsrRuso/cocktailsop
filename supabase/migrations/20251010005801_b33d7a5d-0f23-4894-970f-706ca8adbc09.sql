-- Add personal info fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone text,
ADD COLUMN whatsapp text,
ADD COLUMN website text,
ADD COLUMN show_phone boolean DEFAULT true,
ADD COLUMN show_whatsapp boolean DEFAULT true,
ADD COLUMN show_website boolean DEFAULT true;