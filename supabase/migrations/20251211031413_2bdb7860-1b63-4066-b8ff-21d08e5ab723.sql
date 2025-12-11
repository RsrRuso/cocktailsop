-- Add foreign key relationship from status_comments to profiles
ALTER TABLE public.status_comments
ADD CONSTRAINT status_comments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;