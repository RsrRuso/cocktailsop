-- Create a SECURITY DEFINER function to send batch notifications to all group members
-- This bypasses RLS to allow inserting notifications for other users

CREATE OR REPLACE FUNCTION public.notify_batch_group_members(
  p_group_id uuid,
  p_notification_type text,
  p_content text,
  p_submitter_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_record RECORD;
BEGIN
  -- Loop through all group members and insert notifications
  FOR member_record IN 
    SELECT user_id FROM mixologist_group_members WHERE group_id = p_group_id
  LOOP
    BEGIN
      INSERT INTO notifications (user_id, type, content, read)
      VALUES (member_record.user_id, p_notification_type, p_content, false);
    EXCEPTION WHEN unique_violation THEN
      -- Ignore duplicate notifications
      NULL;
    END;
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.notify_batch_group_members(uuid, text, text, uuid) TO authenticated;