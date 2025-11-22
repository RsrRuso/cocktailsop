-- Add sold_at timestamp column to fifo_inventory for better archiving
ALTER TABLE fifo_inventory 
ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries on sold items
CREATE INDEX IF NOT EXISTS idx_fifo_inventory_sold_at ON fifo_inventory(sold_at) WHERE status = 'sold';