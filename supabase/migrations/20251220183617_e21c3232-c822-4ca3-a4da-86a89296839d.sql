-- Add remaining tables to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'wasabi_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wasabi_reactions;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'wasabi_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wasabi_conversations;
  END IF;
END $$;