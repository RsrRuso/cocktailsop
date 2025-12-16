-- Secure PIN verification for Batch Calculator staff access
-- Allows unauthenticated (anon) users to verify a PIN without exposing member lists.

CREATE OR REPLACE FUNCTION public.verify_mixologist_group_pin(p_group_id uuid, p_pin_code text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  role text,
  group_id uuid,
  member_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mgm.id,
    mgm.user_id,
    mgm.role,
    mgm.group_id,
    COALESCE(p.full_name, p.username, 'Team Member') AS member_name
  FROM public.mixologist_group_members mgm
  LEFT JOIN public.profiles p ON p.id = mgm.user_id
  WHERE mgm.group_id = p_group_id
    AND mgm.pin_code = p_pin_code
    AND mgm.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_mixologist_group_pin(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_mixologist_group_pin(uuid, text) TO authenticated;