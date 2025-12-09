-- Re-sync all like counts with actual records
UPDATE public.posts p
SET like_count = (SELECT COUNT(*) FROM public.post_likes pl WHERE pl.post_id = p.id);

UPDATE public.reels r
SET like_count = (SELECT COUNT(*) FROM public.reel_likes rl WHERE rl.reel_id = r.id);