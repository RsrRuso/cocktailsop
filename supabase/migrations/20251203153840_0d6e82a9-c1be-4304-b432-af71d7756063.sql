-- Move pg_net extension to extensions schema (if it exists)
DO $$
BEGIN
  -- Check if pg_net exists in public schema and move it
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net' AND extnamespace = 'public'::regnamespace
  ) THEN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not move pg_net extension: %', SQLERRM;
END $$;