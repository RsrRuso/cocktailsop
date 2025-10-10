-- Add region column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN region text DEFAULT 'All';

-- Add a check constraint to ensure valid regions
ALTER TABLE public.profiles
ADD CONSTRAINT valid_region CHECK (region IN ('All', 'USA', 'UK', 'Europe', 'Asia', 'Middle East', 'Africa'));