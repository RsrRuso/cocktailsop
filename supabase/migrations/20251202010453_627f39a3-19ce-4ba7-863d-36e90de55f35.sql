-- Fix Security Definer Views by recreating with SECURITY INVOKER
-- This ensures views enforce the permissions of the querying user, not the view creator

-- Recreate profiles_secure view with SECURITY INVOKER
DROP VIEW IF EXISTS public.profiles_secure CASCADE;

CREATE VIEW public.profiles_secure 
WITH (security_invoker=true) AS
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

COMMENT ON VIEW public.profiles_secure IS 'Secure view of profiles with column-level privacy enforcement. Uses SECURITY INVOKER to respect calling user permissions and RLS policies.';

-- Recreate workspace_members_with_owner view with SECURITY INVOKER
DROP VIEW IF EXISTS public.workspace_members_with_owner CASCADE;

CREATE VIEW public.workspace_members_with_owner
WITH (security_invoker=true) AS
SELECT 
  id,
  workspace_id,
  user_id,
  role,
  permissions,
  joined_at,
  invited_by
FROM workspace_members;

GRANT SELECT ON public.workspace_members_with_owner TO authenticated;

COMMENT ON VIEW public.workspace_members_with_owner IS 'View of workspace members. Uses SECURITY INVOKER to respect calling user permissions and RLS policies.';