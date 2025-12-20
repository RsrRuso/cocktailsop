-- Fix infinite recursion in RLS policies on wasabi_members
-- Use SECURITY DEFINER helper functions instead of querying wasabi_members inside a wasabi_members policy.

CREATE OR REPLACE FUNCTION public.wasabi_is_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wasabi_members
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.wasabi_is_admin(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wasabi_members
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.wasabi_is_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wasabi_is_admin(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wasabi_is_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wasabi_is_admin(uuid, uuid) TO authenticated;

-- Replace recursive policies
DROP POLICY IF EXISTS "Members can view other members in their conversations" ON public.wasabi_members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.wasabi_members;

CREATE POLICY "Members can view other members in their conversations"
ON public.wasabi_members
FOR SELECT
USING (public.wasabi_is_member(conversation_id, auth.uid()));

CREATE POLICY "Admins can delete members"
ON public.wasabi_members
FOR DELETE
USING (
  user_id = auth.uid()
  OR public.wasabi_is_admin(conversation_id, auth.uid())
);
