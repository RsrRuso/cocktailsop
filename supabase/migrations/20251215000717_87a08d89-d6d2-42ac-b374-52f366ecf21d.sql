-- Add station occupancy configuration for managers
ALTER TABLE lab_ops_stations ADD COLUMN IF NOT EXISTS max_orders_capacity INTEGER DEFAULT 10;
ALTER TABLE lab_ops_stations ADD COLUMN IF NOT EXISTS current_load INTEGER DEFAULT 0;
ALTER TABLE lab_ops_stations ADD COLUMN IF NOT EXISTS occupancy_threshold INTEGER DEFAULT 80; -- percentage
ALTER TABLE lab_ops_stations ADD COLUMN IF NOT EXISTS overflow_station_id UUID REFERENCES lab_ops_stations(id);

-- Add server notification field to order items
ALTER TABLE lab_ops_order_items ADD COLUMN IF NOT EXISTS server_notified BOOLEAN DEFAULT false;
ALTER TABLE lab_ops_order_items ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- Create table for order ready notifications
CREATE TABLE IF NOT EXISTS lab_ops_order_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES lab_ops_orders(id) ON DELETE CASCADE NOT NULL,
  order_item_id UUID REFERENCES lab_ops_order_items(id) ON DELETE CASCADE,
  server_id UUID REFERENCES lab_ops_staff(id) NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'item_ready', -- item_ready, order_ready
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE lab_ops_order_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Staff can view their notifications"
  ON lab_ops_order_notifications FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert notifications"
  ON lab_ops_order_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff can update notifications"
  ON lab_ops_order_notifications FOR UPDATE
  USING (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE lab_ops_order_notifications;