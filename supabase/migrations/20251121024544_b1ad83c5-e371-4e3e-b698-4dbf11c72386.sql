-- Create items storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('items', 'items', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for items bucket
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Items images are publicly accessible'
  ) THEN
    CREATE POLICY "Items images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'items');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own item images'
  ) THEN
    CREATE POLICY "Users can upload their own item images"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'items' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own item images'
  ) THEN
    CREATE POLICY "Users can update their own item images"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'items' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own item images'
  ) THEN
    CREATE POLICY "Users can delete their own item images"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'items' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;