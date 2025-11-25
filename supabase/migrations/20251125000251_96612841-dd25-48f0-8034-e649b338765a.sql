-- Create secure view for profiles with column-level privacy enforcement

CREATE OR REPLACE VIEW public.profiles_secure AS
SELECT 
  id,
  username,
  full_name,
  bio,
  avatar_url,
  cover_url,
  professional_title,
  region,
  user_type,
  interests,
  address,
  city,
  postal_code,
  country,
  email,
  badge_level,
  follower_count,
  following_count,
  post_count,
  career_score,
  date_of_birth,
  phone_verified,
  email_verified,
  is_bot,
  show_phone,
  show_whatsapp,
  show_website,
  created_at,
  updated_at,
  -- Apply privacy filtering at column level
  CASE WHEN show_phone = true THEN phone ELSE NULL END as phone,
  CASE WHEN show_whatsapp = true THEN whatsapp ELSE NULL END as whatsapp,
  CASE WHEN show_website = true THEN website ELSE NULL END as website
FROM public.profiles;

-- Grant permissions on the secure view
GRANT SELECT ON public.profiles_secure TO authenticated;
GRANT SELECT ON public.profiles_secure TO anon;

COMMENT ON VIEW public.profiles_secure IS 'Secure view of profiles with column-level privacy enforcement for phone, whatsapp, and website fields. Use this view instead of the profiles table directly to ensure privacy settings are respected.';
