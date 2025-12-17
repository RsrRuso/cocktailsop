-- Resolve security linter findings (without moving pg_net which is not movable)

-- 1) Recreate view with security_invoker (remove definer)
create or replace view public.profiles_secure
with (security_invoker=true)
as
SELECT id,
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
    CASE WHEN show_phone = true OR id = auth.uid() THEN phone ELSE NULL::text END AS phone,
    CASE WHEN show_whatsapp = true OR id = auth.uid() THEN whatsapp ELSE NULL::text END AS whatsapp,
    CASE WHEN show_website = true OR id = auth.uid() THEN website ELSE NULL::text END AS website,
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
    CASE WHEN id = auth.uid() THEN address ELSE NULL::text END AS address,
    CASE WHEN id = auth.uid() THEN city ELSE NULL::text END AS city,
    CASE WHEN id = auth.uid() THEN postal_code ELSE NULL::text END AS postal_code,
    CASE WHEN id = auth.uid() THEN country ELSE NULL::text END AS country,
    CASE WHEN id = auth.uid() THEN email ELSE NULL::text END AS email
FROM profiles;

-- 2) Set search_path for trigger function
create or replace function public.update_matrix_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;