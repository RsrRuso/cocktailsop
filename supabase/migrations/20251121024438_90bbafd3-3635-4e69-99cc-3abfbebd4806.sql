-- Add photo_url column to items table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'items' 
    AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE public.items ADD COLUMN photo_url text;
  END IF;
END $$;