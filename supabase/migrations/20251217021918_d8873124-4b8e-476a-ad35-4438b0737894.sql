-- Fix duplicate like_count updates caused by duplicate triggers
-- 1) Drop the extra like count triggers (keep the single_* triggers)
-- 2) Recompute like_count from source-of-truth like tables

BEGIN;

-- Posts: two triggers were both calling update_post_like_count()
DROP TRIGGER IF EXISTS post_like_count_trigger ON public.post_likes;

-- Reels: two triggers were both calling update_reel_like_count()
DROP TRIGGER IF EXISTS reel_likes_count_trigger ON public.reel_likes;

-- Backfill accurate counts (source of truth is *_likes tables)
UPDATE public.posts
SET like_count = (
  SELECT COUNT(*)::int
  FROM public.post_likes pl
  WHERE pl.post_id = posts.id
);

UPDATE public.reels
SET like_count = (
  SELECT COUNT(*)::int
  FROM public.reel_likes rl
  WHERE rl.reel_id = reels.id
);

COMMIT;