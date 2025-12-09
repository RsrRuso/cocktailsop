-- Enable realtime for career-related tables
ALTER TABLE public.work_experiences REPLICA IDENTITY FULL;
ALTER TABLE public.certifications REPLICA IDENTITY FULL;
ALTER TABLE public.recognitions REPLICA IDENTITY FULL;
ALTER TABLE public.competitions REPLICA IDENTITY FULL;
ALTER TABLE public.exam_certificates REPLICA IDENTITY FULL;

-- Add tables to realtime publication if not already added
DO $$
BEGIN
  -- work_experiences
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'work_experiences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.work_experiences;
  END IF;
  
  -- certifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'certifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.certifications;
  END IF;
  
  -- recognitions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'recognitions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.recognitions;
  END IF;
  
  -- competitions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'competitions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.competitions;
  END IF;
  
  -- exam_certificates
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'exam_certificates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_certificates;
  END IF;
END $$;