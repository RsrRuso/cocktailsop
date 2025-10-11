-- Drop user_status table and music storage bucket (no longer needed)
DROP TABLE IF EXISTS public.user_status CASCADE;

-- Remove music storage bucket
DELETE FROM storage.buckets WHERE id = 'music';