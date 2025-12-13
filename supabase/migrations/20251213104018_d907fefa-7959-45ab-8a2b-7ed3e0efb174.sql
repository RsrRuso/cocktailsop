
-- Fix the notification trigger to use correct column name
CREATE OR REPLACE FUNCTION public.notify_followers_on_new_music_share()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO notifications (user_id, type, content, reference_user_id, music_share_id)
  SELECT 
    f.follower_id,
    'new_music',
    (SELECT COALESCE(full_name, username, 'Someone') FROM profiles WHERE id = NEW.user_id) || ' shared music: ' || COALESCE(NEW.track_title, 'a track'),
    NEW.user_id,
    NEW.id
  FROM follows f
  WHERE f.following_id = NEW.user_id;
  
  RETURN NEW;
END;
$function$;
