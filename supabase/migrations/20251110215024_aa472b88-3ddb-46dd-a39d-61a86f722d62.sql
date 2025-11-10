-- Create function to notify friends about birthdays
CREATE OR REPLACE FUNCTION public.notify_friends_birthday()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  birthday_user RECORD;
  friend_id UUID;
BEGIN
  -- Find users whose birthday is today (within 3 days for testing)
  FOR birthday_user IN 
    SELECT id, username, date_of_birth
    FROM profiles
    WHERE date_of_birth IS NOT NULL
    AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND ABS(EXTRACT(DAY FROM date_of_birth) - EXTRACT(DAY FROM CURRENT_DATE)) <= 3
  LOOP
    -- Notify all followers (friends)
    FOR friend_id IN 
      SELECT follower_id 
      FROM follows 
      WHERE following_id = birthday_user.id
    LOOP
      -- Check if notification already sent today
      IF NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE user_id = friend_id 
        AND type = 'birthday'
        AND reference_user_id = birthday_user.id
        AND DATE(created_at) = CURRENT_DATE
      ) THEN
        PERFORM create_notification(
          friend_id,
          'birthday',
          '🎂 It''s ' || birthday_user.username || '''s birthday today! Wish them well!',
          NULL, NULL, NULL, NULL, NULL,
          birthday_user.id
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Create a trigger to check birthdays daily (can be called by a cron job or manually)
COMMENT ON FUNCTION public.notify_friends_birthday() IS 'Notifies friends when it is a user''s birthday. Should be called daily via cron or manually.';