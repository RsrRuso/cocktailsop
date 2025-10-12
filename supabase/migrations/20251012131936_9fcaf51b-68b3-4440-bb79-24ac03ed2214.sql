-- Create music_share_likes table
CREATE TABLE public.music_share_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  music_share_id UUID NOT NULL REFERENCES music_shares(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(music_share_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.music_share_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for music_share_likes
CREATE POLICY "Music share likes viewable by everyone" 
ON public.music_share_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can like music shares" 
ON public.music_share_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike music shares" 
ON public.music_share_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create music_share_comments table
CREATE TABLE public.music_share_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  music_share_id UUID NOT NULL REFERENCES music_shares(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.music_share_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for music_share_comments
CREATE POLICY "Music share comments viewable by everyone" 
ON public.music_share_comments 
FOR SELECT 
USING (true);

CREATE POLICY "Users can comment on music shares" 
ON public.music_share_comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" 
ON public.music_share_comments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add like_count and comment_count to music_shares
ALTER TABLE public.music_shares 
ADD COLUMN like_count INTEGER DEFAULT 0,
ADD COLUMN comment_count INTEGER DEFAULT 0;

-- Create trigger functions for music share likes
CREATE OR REPLACE FUNCTION public.update_music_share_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE music_shares 
    SET like_count = like_count + 1 
    WHERE id = NEW.music_share_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE music_shares 
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.music_share_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for music share likes
CREATE TRIGGER update_music_share_like_count_trigger
AFTER INSERT OR DELETE ON public.music_share_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_music_share_like_count();

-- Create trigger functions for music share comments
CREATE OR REPLACE FUNCTION public.update_music_share_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE music_shares 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.music_share_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE music_shares 
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.music_share_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for music share comments
CREATE TRIGGER update_music_share_comment_count_trigger
AFTER INSERT OR DELETE ON public.music_share_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_music_share_comment_count();