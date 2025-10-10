-- Fix incorrect follow counts by recalculating them from actual follows
UPDATE profiles 
SET following_count = (
  SELECT COUNT(*) 
  FROM follows 
  WHERE follows.follower_id = profiles.id
),
follower_count = (
  SELECT COUNT(*) 
  FROM follows 
  WHERE follows.following_id = profiles.id
);

-- Create a function to recalculate follow counts (can be called anytime)
CREATE OR REPLACE FUNCTION public.recalculate_follow_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles 
  SET following_count = (
    SELECT COUNT(*) 
    FROM follows 
    WHERE follows.follower_id = profiles.id
  ),
  follower_count = (
    SELECT COUNT(*) 
    FROM follows 
    WHERE follows.following_id = profiles.id
  );
END;
$$;