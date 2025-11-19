-- Add color code, brand, and barcode to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS color_code TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS category TEXT;

-- Add FIFO tracking fields to inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS received_date TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS batch_number TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS scanned_data JSONB;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 0;

-- Add check constraint for status
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_status_check'
  ) THEN
    ALTER TABLE inventory ADD CONSTRAINT inventory_status_check 
    CHECK (status IN ('available', 'sold', 'transferred', 'damaged'));
  END IF;
END $$;

-- Create index for FIFO queries (oldest first)
CREATE INDEX IF NOT EXISTS idx_inventory_fifo ON inventory(store_id, item_id, received_date, status) WHERE status = 'available';

-- Create stores table updates
ALTER TABLE stores ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES employees(id);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create transfers table for tracking item movements
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
  from_store_id UUID REFERENCES stores(id),
  to_store_id UUID REFERENCES stores(id),
  quantity DECIMAL NOT NULL,
  transferred_by UUID REFERENCES employees(id),
  transfer_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending',
  notes TEXT,
  photo_url TEXT,
  scanned_data JSONB,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add check constraint for transfer status
ALTER TABLE inventory_transfers ADD CONSTRAINT transfers_status_check 
CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled'));

-- Create activity log for audit trail
CREATE TABLE IF NOT EXISTS inventory_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  store_id UUID REFERENCES stores(id),
  employee_id UUID REFERENCES employees(id),
  action_type TEXT NOT NULL,
  quantity_before DECIMAL,
  quantity_after DECIMAL,
  details JSONB,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL
);

-- Add check constraint for action types
ALTER TABLE inventory_activity_log ADD CONSTRAINT activity_action_check 
CHECK (action_type IN ('received', 'sold', 'transferred', 'adjusted', 'damaged', 'scanned', 'photo_uploaded'));

-- Enable RLS
ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for transfers
CREATE POLICY "Users can view their own transfers"
  ON inventory_transfers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transfers"
  ON inventory_transfers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transfers"
  ON inventory_transfers FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for activity log
CREATE POLICY "Users can view their own activity logs"
  ON inventory_activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity logs"
  ON inventory_activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to calculate FIFO priority score (higher = more urgent)
CREATE OR REPLACE FUNCTION calculate_fifo_priority(
  p_expiration_date DATE,
  p_received_date TIMESTAMP WITH TIME ZONE
) RETURNS INTEGER AS $$
DECLARE
  days_until_expiry INTEGER;
  days_in_inventory INTEGER;
  priority INTEGER;
BEGIN
  days_until_expiry := p_expiration_date - CURRENT_DATE;
  days_in_inventory := EXTRACT(DAY FROM (NOW() - p_received_date));
  
  -- Calculate priority: items expiring soon get higher priority
  -- Also factor in how long it's been in inventory
  priority := 100 - days_until_expiry + (days_in_inventory / 2);
  
  -- Ensure priority is at least 0
  IF priority < 0 THEN
    priority := 0;
  END IF;
  
  RETURN priority;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update priority score
CREATE OR REPLACE FUNCTION update_inventory_priority()
RETURNS TRIGGER AS $$
BEGIN
  NEW.priority_score := calculate_fifo_priority(
    NEW.expiration_date::DATE,
    NEW.received_date
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_inventory_priority ON inventory;
CREATE TRIGGER trigger_update_inventory_priority
  BEFORE INSERT OR UPDATE OF expiration_date, received_date
  ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_priority();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_priority ON inventory(priority_score DESC) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_transfers_status ON inventory_transfers(status, transfer_date);
CREATE INDEX IF NOT EXISTS idx_activity_log_date ON inventory_activity_log(created_at DESC);