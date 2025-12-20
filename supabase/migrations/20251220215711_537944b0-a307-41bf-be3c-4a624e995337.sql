-- Create atomic helper for DM conversations (replaces fragile client-side logic)
CREATE OR REPLACE FUNCTION public.wasabi_get_or_create_dm(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  conv_id uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF other_user_id IS NULL OR other_user_id = me THEN
    RAISE EXCEPTION 'invalid_other_user';
  END IF;

  -- Return existing direct conversation if one exists
  SELECT c.id
    INTO conv_id
  FROM public.wasabi_conversations c
  JOIN public.wasabi_members m1
    ON m1.conversation_id = c.id
   AND m1.user_id = me
  JOIN public.wasabi_members m2
    ON m2.conversation_id = c.id
   AND m2.user_id = other_user_id
  WHERE COALESCE(c.is_group, false) = false
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  -- Create conversation + members atomically
  INSERT INTO public.wasabi_conversations (is_group, created_by)
  VALUES (false, me)
  RETURNING id INTO conv_id;

  INSERT INTO public.wasabi_members (conversation_id, user_id, role)
  VALUES (conv_id, me, 'admin');

  INSERT INTO public.wasabi_members (conversation_id, user_id, role)
  VALUES (conv_id, other_user_id, 'member');

  RETURN conv_id;
END;
$$;

-- Lock down execution to authenticated users only
REVOKE ALL ON FUNCTION public.wasabi_get_or_create_dm(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wasabi_get_or_create_dm(uuid) TO authenticated;
