-- Add foreign key constraints for user_id in reel_likes and reel_comments
ALTER TABLE public.reel_likes
ADD CONSTRAINT reel_likes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reel_comments
ADD CONSTRAINT reel_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;