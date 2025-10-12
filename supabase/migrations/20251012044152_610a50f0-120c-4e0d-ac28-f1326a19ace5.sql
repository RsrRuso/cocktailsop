-- Add view_count column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Create post_views table to track unique views
CREATE TABLE IF NOT EXISTS post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  viewed_at timestamp with time zone DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create reel_views table to track unique views (reels already has view_count)
CREATE TABLE IF NOT EXISTS reel_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  viewed_at timestamp with time zone DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

-- Enable RLS on post_views
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

-- Enable RLS on reel_views
ALTER TABLE reel_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_views
CREATE POLICY "Users can insert own post views"
ON post_views FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Post views are viewable by everyone"
ON post_views FOR SELECT
USING (true);

-- RLS Policies for reel_views
CREATE POLICY "Users can insert own reel views"
ON reel_views FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Reel views are viewable by everyone"
ON reel_views FOR SELECT
USING (true);

-- Function to increment post view count
CREATE OR REPLACE FUNCTION increment_post_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts
  SET view_count = view_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment reel view count
CREATE OR REPLACE FUNCTION increment_reel_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels
  SET view_count = view_count + 1
  WHERE id = NEW.reel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for post views
DROP TRIGGER IF EXISTS on_post_view_created ON post_views;
CREATE TRIGGER on_post_view_created
  AFTER INSERT ON post_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_post_view_count();

-- Trigger for reel views
DROP TRIGGER IF EXISTS on_reel_view_created ON reel_views;
CREATE TRIGGER on_reel_view_created
  AFTER INSERT ON reel_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_reel_view_count();