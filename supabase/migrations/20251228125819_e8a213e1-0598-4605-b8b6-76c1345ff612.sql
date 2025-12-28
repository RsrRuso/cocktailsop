-- Add markup, VAT and service charge columns to lab_ops_recipes
ALTER TABLE public.lab_ops_recipes 
ADD COLUMN IF NOT EXISTS markup_percent numeric DEFAULT 30,
ADD COLUMN IF NOT EXISTS vat_percent numeric DEFAULT 5,
ADD COLUMN IF NOT EXISTS service_charge_percent numeric DEFAULT 0;