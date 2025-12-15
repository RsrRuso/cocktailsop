-- Add bartender assignment to stations
ALTER TABLE lab_ops_stations ADD COLUMN IF NOT EXISTS assigned_bartender_id UUID REFERENCES lab_ops_staff(id);
ALTER TABLE lab_ops_stations ADD COLUMN IF NOT EXISTS category_filter JSONB DEFAULT '[]'; -- Categories this station handles

-- Track bartender performance per item for speed metrics
CREATE TABLE IF NOT EXISTS lab_ops_bartender_item_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  station_id UUID REFERENCES lab_ops_stations(id) ON DELETE CASCADE,
  bartender_id UUID REFERENCES lab_ops_staff(id) ON DELETE CASCADE NOT NULL,
  order_item_id UUID REFERENCES lab_ops_order_items(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES lab_ops_menu_items(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  time_seconds INTEGER, -- Time taken to complete
  shift_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Station spirit consumption tracking (SOP vs Physical)
CREATE TABLE IF NOT EXISTS lab_ops_station_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  station_id UUID REFERENCES lab_ops_stations(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES lab_ops_inventory_items(id) ON DELETE CASCADE NOT NULL,
  shift_date DATE DEFAULT CURRENT_DATE,
  sop_consumption_ml NUMERIC DEFAULT 0, -- Theoretical based on recipes
  physical_consumption_ml NUMERIC DEFAULT 0, -- From pourer readings
  variance_ml NUMERIC GENERATED ALWAYS AS (physical_consumption_ml - sop_consumption_ml) STORED,
  variance_percent NUMERIC GENERATED ALWAYS AS (
    CASE WHEN sop_consumption_ml > 0 
    THEN ROUND(((physical_consumption_ml - sop_consumption_ml) / sop_consumption_ml * 100)::numeric, 2)
    ELSE 0 END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(station_id, ingredient_id, shift_date)
);

-- Daily bartender performance summary
CREATE TABLE IF NOT EXISTS lab_ops_bartender_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  bartender_id UUID REFERENCES lab_ops_staff(id) ON DELETE CASCADE NOT NULL,
  station_id UUID REFERENCES lab_ops_stations(id) ON DELETE CASCADE,
  shift_date DATE DEFAULT CURRENT_DATE,
  total_drinks_served INTEGER DEFAULT 0,
  avg_time_seconds INTEGER DEFAULT 0,
  min_time_seconds INTEGER,
  max_time_seconds INTEGER,
  efficiency_score NUMERIC DEFAULT 0, -- 0-100 score
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bartender_id, station_id, shift_date)
);

-- Add station_id to order items for routing
ALTER TABLE lab_ops_order_items ADD COLUMN IF NOT EXISTS bartender_id UUID REFERENCES lab_ops_staff(id);
ALTER TABLE lab_ops_order_items ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE lab_ops_bartender_item_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_station_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_bartender_daily_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can manage bartender performance" 
ON lab_ops_bartender_item_performance FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage station consumption" 
ON lab_ops_station_consumption FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage bartender daily stats" 
ON lab_ops_bartender_daily_stats FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add realtime for consumption tracking
ALTER PUBLICATION supabase_realtime ADD TABLE lab_ops_station_consumption;
ALTER PUBLICATION supabase_realtime ADD TABLE lab_ops_bartender_daily_stats;