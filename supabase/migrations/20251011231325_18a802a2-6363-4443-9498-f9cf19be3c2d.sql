-- Add foreign key relationship between music_shares and profiles
ALTER TABLE public.music_shares
  DROP CONSTRAINT IF EXISTS music_shares_user_id_fkey;

ALTER TABLE public.music_shares
  ADD CONSTRAINT music_shares_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;