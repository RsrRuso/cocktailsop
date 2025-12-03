-- Drop existing view first since column order differs
DROP VIEW IF EXISTS public.profiles_secure;

-- Create a SECURITY DEFINER view that enforces column-level privacy controls
CREATE VIEW public.profiles_secure AS
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
  created_at,
  updated_at,
  region,
  -- Only expose phone if show_phone is true OR user is viewing their own profile
  CASE 
    WHEN show_phone = true OR id = auth.uid() THEN phone
    ELSE NULL
  END AS phone,
  -- Only expose whatsapp if show_whatsapp is true OR user is viewing their own profile  
  CASE 
    WHEN show_whatsapp = true OR id = auth.uid() THEN whatsapp
    ELSE NULL
  END AS whatsapp,
  -- Only expose website if show_website is true OR user is viewing their own profile
  CASE 
    WHEN show_website = true OR id = auth.uid() THEN website
    ELSE NULL
  END AS website,
  show_phone,
  show_whatsapp,
  show_website,
  is_bot,
  career_score,
  user_type,
  interests,
  date_of_birth,
  phone_verified,
  email_verified,
  -- Address/PII fields only visible to the user themselves
  CASE WHEN id = auth.uid() THEN address ELSE NULL END AS address,
  CASE WHEN id = auth.uid() THEN city ELSE NULL END AS city,
  CASE WHEN id = auth.uid() THEN postal_code ELSE NULL END AS postal_code,
  CASE WHEN id = auth.uid() THEN country ELSE NULL END AS country,
  CASE WHEN id = auth.uid() THEN email ELSE NULL END AS email
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_secure TO authenticated;
GRANT SELECT ON public.profiles_secure TO anon;

-- Add comment
COMMENT ON VIEW public.profiles_secure IS 'Privacy-enforcing view that conditionally exposes phone, whatsapp, website, and address fields based on user privacy settings.';