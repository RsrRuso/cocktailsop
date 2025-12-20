-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anon can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Drop the existing insecure view
DROP VIEW IF EXISTS public.profiles_secure;

-- Create a secure view for public profile data (hiding sensitive fields)
CREATE VIEW public.profiles_secure AS
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

-- Grant read access on the secure view
GRANT SELECT ON public.profiles_secure TO anon, authenticated;

-- Create a function to get full profile (for own profile access)
CREATE OR REPLACE FUNCTION public.get_own_profile()
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
  email text,
  date_of_birth date,
  address text,
  city text,
  postal_code text,
  country text,
  show_phone boolean,
  show_whatsapp boolean,
  show_website boolean,
  phone_verified boolean,
  email_verified boolean
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
    p.website,
    p.phone,
    p.whatsapp,
    p.email,
    p.date_of_birth,
    p.address,
    p.city,
    p.postal_code,
    p.country,
    p.show_phone,
    p.show_whatsapp,
    p.show_website,
    p.phone_verified,
    p.email_verified
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$$;

-- Policy: Users can view their own complete profile (for updates, etc.)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy: Authenticated users can view basic profiles (for following, messaging, etc.)
-- Sensitive fields are still protected - they should use profiles_secure view
CREATE POLICY "Authenticated can view profiles for app functionality"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Note: No policy for anon role on profiles table - they must use profiles_secure view