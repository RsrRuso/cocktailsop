-- Fix duplicate like counts and enforce one-like-per-user per item

-- 1) Deduplicate existing like rows to ensure only one like per user/content
DELETE FROM public.post_likes a
USING public.post_likes b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.post_id = b.post_id;

DELETE FROM public.reel_likes a
USING public.reel_likes b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.reel_id = b.reel_id;

DELETE FROM public.event_likes a
USING public.event_likes b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.event_id = b.event_id;

-- Story likes table is used by several trigger functions; ensure uniqueness there too
DELETE FROM public.story_likes a
USING public.story_likes b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.story_id = b.story_id;

-- 2) Add UNIQUE constraints so future duplicates cannot be created
ALTER TABLE public.post_likes
  ADD CONSTRAINT post_likes_user_post_unique UNIQUE (user_id, post_id);

ALTER TABLE public.reel_likes
  ADD CONSTRAINT reel_likes_user_reel_unique UNIQUE (user_id, reel_id);

ALTER TABLE public.event_likes
  ADD CONSTRAINT event_likes_user_event_unique UNIQUE (user_id, event_id);

ALTER TABLE public.story_likes
  ADD CONSTRAINT story_likes_user_story_unique UNIQUE (user_id, story_id);

-- 3) Remove legacy count triggers that caused double-increment behavior.
-- We keep the canonical update_*_like_count_trigger and update_*_comment_count_trigger
-- created in later migrations.

-- Old post/reel count triggers
DROP TRIGGER IF EXISTS post_likes_count_trigger ON public.post_likes;
DROP TRIGGER IF EXISTS post_comments_count_trigger ON public.post_comments;
DROP TRIGGER IF EXISTS reel_likes_count_trigger ON public.reel_likes;
DROP TRIGGER IF EXISTS reel_comments_count_trigger ON public.reel_comments;

-- Old story like count trigger (view count trigger is fine and kept)
DROP TRIGGER IF EXISTS story_likes_count_trigger ON public.story_likes;

-- 4) Clean up notification triggers so each like only fires ONE notification

-- Posts: remove all existing like notification triggers, then create a single canonical one
DROP TRIGGER IF EXISTS post_like_notification ON public.post_likes;
DROP TRIGGER IF EXISTS notify_post_like_trigger ON public.post_likes;
DROP TRIGGER IF EXISTS trigger_notify_post_like ON public.post_likes;
DROP TRIGGER IF EXISTS on_post_like ON public.post_likes;

CREATE TRIGGER post_like_notification
AFTER INSERT ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_post_like();

-- Reels: remove all existing like notification triggers, then create a single canonical one
DROP TRIGGER IF EXISTS reel_like_notification ON public.reel_likes;
DROP TRIGGER IF EXISTS notify_reel_like_trigger ON public.reel_likes;
DROP TRIGGER IF EXISTS trigger_notify_reel_like ON public.reel_likes;
DROP TRIGGER IF EXISTS on_reel_like ON public.reel_likes;

CREATE TRIGGER trigger_notify_reel_like
AFTER INSERT ON public.reel_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_reel_like();
