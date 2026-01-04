-- Fix private channel visibility + lock down member insertion checks

-- 1) Private channels must be visible to their creator (and members)
DROP POLICY IF EXISTS "Members can view private channels" ON public.community_channels;
CREATE POLICY "Members can view private channels"
ON public.community_channels
FOR SELECT
USING (
  type = 'private'
  AND (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.community_channel_members m
      WHERE m.channel_id = community_channels.id
        AND m.user_id = auth.uid()
    )
  )
);

-- 2) Fix broken (and overly-permissive) policy that allowed admins of ANY channel to add members to ALL channels
DROP POLICY IF EXISTS "Admins can add members to private channels" ON public.community_channel_members;
CREATE POLICY "Admins can add members to private channels"
ON public.community_channel_members
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.community_channel_members m
    WHERE m.channel_id = community_channel_members.channel_id
      AND m.user_id = auth.uid()
      AND m.role = ANY (ARRAY['admin'::text, 'moderator'::text])
  )
);

-- 3) Fix broken update policy join (used by member_count updates)
DROP POLICY IF EXISTS "Admins can update channels" ON public.community_channels;
CREATE POLICY "Admins can update channels"
ON public.community_channels
FOR UPDATE
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.community_channel_members m
    WHERE m.channel_id = community_channels.id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'::text
  )
)
WITH CHECK (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.community_channel_members m
    WHERE m.channel_id = community_channels.id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'::text
  )
);
