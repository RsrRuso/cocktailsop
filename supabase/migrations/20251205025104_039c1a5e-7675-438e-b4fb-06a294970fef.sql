-- Add unique constraint on user_id for upsert to work
ALTER TABLE public.user_status ADD CONSTRAINT user_status_user_id_unique UNIQUE (user_id);