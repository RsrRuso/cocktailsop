-- Remove the overly permissive anon policy we just added
DROP POLICY IF EXISTS "Anon can read profiles for secure view" ON public.profiles;

-- Drop the SECURITY INVOKER view - it won't work for anon without table access
DROP VIEW IF EXISTS public.profiles_secure;

-- Create a SECURITY DEFINER function that returns safe profile data
-- This is the proper way to expose limited data to anonymous users
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id uuid)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  bio text,
  avatar_url text,
  professional_title text,
  badge_level text,
  follower_count integer,
  following_count integer,
  post_count integer,
  created_at timestamptz,
  cover_url text,
  region text,
  is_bot boolean,
  career_score integer,
  user_type text,
  interests text[],
  website text,
  phone text,
  whatsapp text,
  show_phone boolean,
  show_whatsapp boolean,
  show_website boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.bio,
    p.avatar_url,
    p.professional_title::text,
    p.badge_level::text,
    p.follower_count,
    p.following_count,
    p.post_count,
    p.created_at,
    p.cover_url,
    p.region,
    p.is_bot,
    p.career_score,
    p.user_type,
    p.interests,
    -- Only expose if privacy setting allows
    CASE WHEN p.show_website = true THEN p.website ELSE NULL END,
    CASE WHEN p.show_phone = true THEN p.phone ELSE NULL END,
    CASE WHEN p.show_whatsapp = true THEN p.whatsapp ELSE NULL END,
    p.show_phone,
    p.show_whatsapp,
    p.show_website
  FROM public.profiles p
  WHERE p.id = profile_id;
END;
$$;

-- Function to search/list profiles (safe fields only)
CREATE OR REPLACE FUNCTION public.search_public_profiles(search_term text DEFAULT NULL, result_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  professional_title text,
  badge_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.professional_title::text,
    p.badge_level::text
  FROM public.profiles p
  WHERE 
    search_term IS NULL 
    OR p.username ILIKE '%' || search_term || '%'
    OR p.full_name ILIKE '%' || search_term || '%'
  LIMIT result_limit;
END;
$$;

-- Grant execute on these functions to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_profiles(text, integer) TO anon, authenticated;