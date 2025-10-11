-- Add foreign key relationship between event_comments and profiles
ALTER TABLE public.event_comments
ADD CONSTRAINT event_comments_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;