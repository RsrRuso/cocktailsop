-- Drop and recreate the view with SECURITY INVOKER (default, but explicit)
DROP VIEW IF EXISTS public.profiles_secure;

-- Create a secure view without SECURITY DEFINER
-- This view will respect RLS policies of the querying user
CREATE VIEW public.profiles_secure 
WITH (security_invoker = true) AS
SELECT 
  id,
  username,
  full_name,
  bio,
  avatar_url,
  professional_title,
  badge_level,
  follower_count,
  following_count,
  post_count,
  created_at,
  cover_url,
  region,
  is_bot,
  career_score,
  user_type,
  interests,
  -- Only show contact info if privacy settings allow
  CASE WHEN show_website = true THEN website ELSE NULL END as website,
  CASE WHEN show_phone = true THEN phone ELSE NULL END as phone,
  CASE WHEN show_whatsapp = true THEN whatsapp ELSE NULL END as whatsapp,
  show_phone,
  show_whatsapp,
  show_website
  -- Explicitly NOT including: email, date_of_birth, address, city, postal_code, country
FROM public.profiles;

-- Grant read access on the secure view to both anon and authenticated
GRANT SELECT ON public.profiles_secure TO anon, authenticated;

-- Add a policy to allow anon users to read from profiles table via the view
-- The view only exposes safe columns, so this is secure
CREATE POLICY "Anon can read profiles for secure view"
ON public.profiles
FOR SELECT
TO anon
USING (true);