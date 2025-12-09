-- Add foreign key relationship from post_likes to profiles (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'post_likes_user_id_fkey') THEN
    ALTER TABLE public.post_likes
    ADD CONSTRAINT post_likes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key relationship from post_reposts to profiles (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'post_reposts_user_id_fkey') THEN
    ALTER TABLE public.post_reposts
    ADD CONSTRAINT post_reposts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key relationship from reel_reposts to profiles (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reel_reposts_user_id_fkey') THEN
    ALTER TABLE public.reel_reposts
    ADD CONSTRAINT reel_reposts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key relationship from post_saves to profiles (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'post_saves_user_id_fkey') THEN
    ALTER TABLE public.post_saves
    ADD CONSTRAINT post_saves_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key relationship from reel_saves to profiles (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reel_saves_user_id_fkey') THEN
    ALTER TABLE public.reel_saves
    ADD CONSTRAINT reel_saves_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;