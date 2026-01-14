-- Step 1: Drop ALL overly permissive SELECT policies that expose all data
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view profiles for app functionality" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;

-- Step 2: Create a secure public view that ONLY shows non-sensitive public information
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  username,
  full_name,
  bio,
  avatar_url,
  cover_url,
  professional_title,
  badge_level,
  follower_count,
  following_count,
  post_count,
  region,
  career_score,
  user_type,
  interests,
  is_bot,
  CASE WHEN show_phone = true THEN phone ELSE NULL END as phone,
  CASE WHEN show_whatsapp = true THEN whatsapp ELSE NULL END as whatsapp,
  CASE WHEN show_website = true THEN website ELSE NULL END as website,
  CASE WHEN show_website = true THEN website_icon_url ELSE NULL END as website_icon_url,
  show_phone,
  show_whatsapp,
  show_website,
  created_at
FROM public.profiles;

-- Step 3: Create restrictive RLS policy - Users can ONLY see their own full profile
CREATE POLICY "Users can view own full profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Step 4: Grant SELECT on the public view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;