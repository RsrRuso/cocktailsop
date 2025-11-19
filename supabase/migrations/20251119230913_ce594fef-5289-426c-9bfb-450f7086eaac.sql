-- Add store_type column to stores table
ALTER TABLE public.stores 
ADD COLUMN store_type text DEFAULT 'both' CHECK (store_type IN ('sell', 'receive', 'both'));

-- Add comment to explain the column
COMMENT ON COLUMN public.stores.store_type IS 'Store type: sell (can only sell/dispense), receive (can only receive inventory), both (default - can do both)';