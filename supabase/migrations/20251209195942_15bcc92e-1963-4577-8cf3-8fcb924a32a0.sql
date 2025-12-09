-- Function to update music popularity scores
CREATE OR REPLACE FUNCTION public.refresh_music_popularity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  track_record RECORD;
  usage_count INTEGER;
  total_likes INTEGER;
  calculated_score FLOAT;
BEGIN
  FOR track_record IN SELECT id FROM music_tracks WHERE status = 'approved'
  LOOP
    -- Count usages
    SELECT COUNT(*) INTO usage_count FROM music_usage WHERE track_id = track_record.id;
    
    -- Count likes from content using this track
    total_likes := 0;
    
    -- Calculate score: (uses × 1.3) + (likes × 2)
    calculated_score := (usage_count * 1.3) + (total_likes * 2);
    
    -- Update popularity
    INSERT INTO music_popularity (track_id, usage_count, likes_count, usage_score, last_updated)
    VALUES (track_record.id, usage_count, total_likes, calculated_score, NOW())
    ON CONFLICT (track_id) DO UPDATE SET
      usage_count = EXCLUDED.usage_count,
      likes_count = EXCLUDED.likes_count,
      usage_score = EXCLUDED.usage_score,
      last_updated = NOW();
  END LOOP;
END;
$$;

-- Add music_track_id column to posts, reels, stories for better tracking
ALTER TABLE posts ADD COLUMN IF NOT EXISTS music_track_id UUID REFERENCES music_tracks(id);
ALTER TABLE reels ADD COLUMN IF NOT EXISTS music_track_id UUID REFERENCES music_tracks(id);
ALTER TABLE stories ADD COLUMN IF NOT EXISTS music_track_id UUID REFERENCES music_tracks(id);

-- Trigger to record music usage when content is created with music
CREATE OR REPLACE FUNCTION public.record_music_usage_on_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.music_track_id IS NOT NULL THEN
    INSERT INTO music_usage (track_id, user_id, content_type, content_id)
    VALUES (NEW.music_track_id, NEW.user_id, 'post', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_music_usage_on_reel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.music_track_id IS NOT NULL THEN
    INSERT INTO music_usage (track_id, user_id, content_type, content_id)
    VALUES (NEW.music_track_id, NEW.user_id, 'reel', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_music_usage_on_story()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.music_track_id IS NOT NULL THEN
    INSERT INTO music_usage (track_id, user_id, content_type, content_id)
    VALUES (NEW.music_track_id, NEW.user_id, 'story', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers for usage tracking
DROP TRIGGER IF EXISTS on_post_music_usage ON posts;
CREATE TRIGGER on_post_music_usage
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION record_music_usage_on_post();

DROP TRIGGER IF EXISTS on_reel_music_usage ON reels;
CREATE TRIGGER on_reel_music_usage
  AFTER INSERT ON reels
  FOR EACH ROW
  EXECUTE FUNCTION record_music_usage_on_reel();

DROP TRIGGER IF EXISTS on_story_music_usage ON stories;
CREATE TRIGGER on_story_music_usage
  AFTER INSERT ON stories
  FOR EACH ROW
  EXECUTE FUNCTION record_music_usage_on_story();