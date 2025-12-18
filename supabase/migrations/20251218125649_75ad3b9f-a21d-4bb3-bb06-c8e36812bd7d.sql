-- Add soft-delete (archive) support for tables so we can remove tables from UI
-- without breaking historical orders/sales linked via foreign keys.

ALTER TABLE public.lab_ops_tables
ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.lab_ops_tables
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Fast filtering of active tables per outlet
CREATE INDEX IF NOT EXISTS idx_lab_ops_tables_outlet_active
ON public.lab_ops_tables (outlet_id)
WHERE is_archived = false;