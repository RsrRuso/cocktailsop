-- Drop the existing function first, then recreate with new return type
DROP FUNCTION IF EXISTS public.get_public_profile(UUID);

-- Create a secure function to get another user's public profile with privacy controls
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
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
  INTO v_profile 
  FROM profiles 
  WHERE id = profile_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'profile', row_to_json(v_profile)::jsonb
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_public_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile(UUID) TO anon;