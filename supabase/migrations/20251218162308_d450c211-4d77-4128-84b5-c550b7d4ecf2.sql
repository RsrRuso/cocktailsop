-- Update notify_batch_group_members to include the submitter (actor) in notifications
DROP FUNCTION IF EXISTS public.notify_batch_group_members(uuid, text, text, uuid);

CREATE OR REPLACE FUNCTION public.notify_batch_group_members(
  p_group_id uuid,
  p_notification_type text,
  p_content text,
  p_submitter_id uuid DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
  member_record RECORD;
  notification_count integer := 0;
BEGIN
  -- Loop through ALL group members INCLUDING the submitter
  FOR member_record IN 
    SELECT user_id FROM public.mixologist_group_members 
    WHERE group_id = p_group_id
  LOOP
    INSERT INTO public.notifications (user_id, type, content, read)
    VALUES (member_record.user_id, p_notification_type, p_content, false);
    notification_count := notification_count + 1;
  END LOOP;
  
  RETURN notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.notify_batch_group_members(uuid, text, text, uuid) TO authenticated;