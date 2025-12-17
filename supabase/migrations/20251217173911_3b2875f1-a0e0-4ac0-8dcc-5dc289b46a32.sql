-- Add started_by column to lab_ops_stock_takes table
ALTER TABLE public.lab_ops_stock_takes 
ADD COLUMN IF NOT EXISTS started_by UUID REFERENCES auth.users(id);