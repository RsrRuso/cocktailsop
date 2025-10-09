-- Fix search path for update_follow_counts function
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for the user being followed
    UPDATE profiles 
    SET follower_count = follower_count + 1 
    WHERE id = NEW.following_id;
    
    -- Increment following count for the user who followed
    UPDATE profiles 
    SET following_count = following_count + 1 
    WHERE id = NEW.follower_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count for the user being unfollowed
    UPDATE profiles 
    SET follower_count = GREATEST(follower_count - 1, 0)
    WHERE id = OLD.following_id;
    
    -- Decrement following count for the user who unfollowed
    UPDATE profiles 
    SET following_count = GREATEST(following_count - 1, 0)
    WHERE id = OLD.follower_id;
  END IF;
  
  RETURN NULL;
END;
$$;