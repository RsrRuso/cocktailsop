-- Ensure RLS is enabled and policies exist for updating and deleting batch productions

-- Enable RLS on batch_productions (safe if already enabled)
ALTER TABLE public.batch_productions ENABLE ROW LEVEL SECURITY;

-- Allow users to UPDATE only their own batch_productions rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'batch_productions'
      AND policyname = 'Users can update own batch productions'
  ) THEN
    CREATE POLICY "Users can update own batch productions"
      ON public.batch_productions
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Allow users to DELETE only their own batch_productions rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'batch_productions'
      AND policyname = 'Users can delete own batch productions'
  ) THEN
    CREATE POLICY "Users can delete own batch productions"
      ON public.batch_productions
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;