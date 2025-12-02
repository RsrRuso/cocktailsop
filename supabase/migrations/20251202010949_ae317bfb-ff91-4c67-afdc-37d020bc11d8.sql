-- Restrict direct access to sensitive profile columns
-- Users should query profiles_secure view instead

-- Revoke direct SELECT on sensitive columns from the profiles table
-- This forces use of the profiles_secure view which enforces privacy controls
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

-- Grant limited SELECT only on non-sensitive columns
GRANT SELECT (
  id, username, full_name, bio, avatar_url, cover_url,
  professional_title, region, user_type, interests,
  address, city, postal_code, country, email,
  badge_level, follower_count, following_count, post_count,
  career_score, date_of_birth, phone_verified, email_verified,
  is_bot, show_phone, show_whatsapp, show_website,
  created_at, updated_at
) ON public.profiles TO authenticated;

GRANT SELECT (
  id, username, full_name, bio, avatar_url, cover_url,
  professional_title, region, user_type, interests,
  badge_level, follower_count, following_count, post_count,
  created_at
) ON public.profiles TO anon;

-- Ensure INSERT/UPDATE/DELETE still work for users on their own profiles
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

COMMENT ON TABLE public.profiles IS 'User profiles. Direct SELECT is restricted - use profiles_secure view to enforce privacy controls on phone/whatsapp/website columns.';