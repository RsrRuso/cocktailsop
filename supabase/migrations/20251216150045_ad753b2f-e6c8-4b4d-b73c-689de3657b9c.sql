-- Add assigned staff member linkage to tables (for Staff POS)
ALTER TABLE public.lab_ops_tables
ADD COLUMN IF NOT EXISTS assigned_staff_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lab_ops_tables_assigned_staff_id_fkey'
  ) THEN
    ALTER TABLE public.lab_ops_tables
    ADD CONSTRAINT lab_ops_tables_assigned_staff_id_fkey
    FOREIGN KEY (assigned_staff_id)
    REFERENCES public.lab_ops_staff (id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lab_ops_tables_assigned_staff_id
ON public.lab_ops_tables (assigned_staff_id);
