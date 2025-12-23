-- Add assigned_to column to lab_ops_tables for table-staff assignments
ALTER TABLE public.lab_ops_tables 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.lab_ops_staff(id) ON DELETE SET NULL;

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_lab_ops_tables_assigned_to ON public.lab_ops_tables(assigned_to);