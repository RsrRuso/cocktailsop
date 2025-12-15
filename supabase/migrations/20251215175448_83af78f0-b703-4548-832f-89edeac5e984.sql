-- Add turnover_count column to track table turnovers
ALTER TABLE public.lab_ops_tables 
ADD COLUMN IF NOT EXISTS turnover_count INTEGER DEFAULT 0;