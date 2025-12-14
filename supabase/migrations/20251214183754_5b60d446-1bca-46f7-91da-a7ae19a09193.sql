
-- LAB Ops Pourer Tracking & Sales Variance System

-- Table for registered bottles with pourers
CREATE TABLE public.lab_ops_bottles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id),
  bottle_name TEXT NOT NULL,
  spirit_type TEXT NOT NULL,
  bottle_size_ml NUMERIC NOT NULL DEFAULT 750,
  pourer_id TEXT, -- Physical pourer device ID
  current_level_ml NUMERIC NOT NULL DEFAULT 0,
  initial_level_ml NUMERIC NOT NULL DEFAULT 750,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'empty', 'removed')),
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  registered_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for pourer readings (physical ML consumption)
CREATE TABLE public.lab_ops_pourer_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bottle_id UUID NOT NULL REFERENCES public.lab_ops_bottles(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  ml_dispensed NUMERIC NOT NULL,
  reading_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  previous_level_ml NUMERIC,
  new_level_ml NUMERIC,
  pour_duration_seconds NUMERIC,
  recorded_by UUID REFERENCES auth.users(id),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'automatic', 'device')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for sales transactions (virtual consumption from POS)
CREATE TABLE public.lab_ops_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.lab_ops_orders(id),
  item_name TEXT NOT NULL,
  spirit_type TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  ml_per_serving NUMERIC NOT NULL,
  total_ml_sold NUMERIC NOT NULL,
  unit_price NUMERIC,
  total_price NUMERIC,
  sold_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sold_by UUID REFERENCES auth.users(id),
  pos_transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for variance analysis (comparing physical vs virtual)
CREATE TABLE public.lab_ops_variance_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  spirit_type TEXT,
  physical_ml_consumed NUMERIC NOT NULL DEFAULT 0,
  virtual_ml_sold NUMERIC NOT NULL DEFAULT 0,
  variance_ml NUMERIC NOT NULL DEFAULT 0,
  variance_percentage NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'flagged')),
  notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for variance thresholds and alerts
CREATE TABLE public.lab_ops_variance_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  spirit_type TEXT,
  warning_threshold_percentage NUMERIC NOT NULL DEFAULT 5,
  critical_threshold_percentage NUMERIC NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(outlet_id, spirit_type)
);

-- Enable RLS
ALTER TABLE public.lab_ops_bottles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_ops_pourer_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_ops_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_ops_variance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_ops_variance_thresholds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bottles
CREATE POLICY "Users can view bottles in their outlets" ON public.lab_ops_bottles
  FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

CREATE POLICY "Users can manage bottles in their outlets" ON public.lab_ops_bottles
  FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- RLS Policies for pourer readings
CREATE POLICY "Users can view readings in their outlets" ON public.lab_ops_pourer_readings
  FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

CREATE POLICY "Users can add readings in their outlets" ON public.lab_ops_pourer_readings
  FOR INSERT WITH CHECK (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- RLS Policies for sales
CREATE POLICY "Users can view sales in their outlets" ON public.lab_ops_sales
  FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

CREATE POLICY "Users can manage sales in their outlets" ON public.lab_ops_sales
  FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- RLS Policies for variance reports
CREATE POLICY "Users can view variance reports in their outlets" ON public.lab_ops_variance_reports
  FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

CREATE POLICY "Users can manage variance reports in their outlets" ON public.lab_ops_variance_reports
  FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- RLS Policies for thresholds
CREATE POLICY "Users can view thresholds in their outlets" ON public.lab_ops_variance_thresholds
  FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

CREATE POLICY "Users can manage thresholds in their outlets" ON public.lab_ops_variance_thresholds
  FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- Function to update bottle level after pourer reading
CREATE OR REPLACE FUNCTION public.update_bottle_level_on_pour()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE lab_ops_bottles
  SET current_level_ml = GREATEST(0, current_level_ml - NEW.ml_dispensed),
      updated_at = now()
  WHERE id = NEW.bottle_id;
  
  -- Update reading with level info
  NEW.previous_level_ml := (SELECT current_level_ml + NEW.ml_dispensed FROM lab_ops_bottles WHERE id = NEW.bottle_id);
  NEW.new_level_ml := (SELECT current_level_ml FROM lab_ops_bottles WHERE id = NEW.bottle_id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_bottle_on_pour
  BEFORE INSERT ON public.lab_ops_pourer_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bottle_level_on_pour();

-- Function to calculate variance
CREATE OR REPLACE FUNCTION public.calculate_lab_ops_variance(
  p_outlet_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_spirit_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  spirit TEXT,
  physical_ml NUMERIC,
  virtual_ml NUMERIC,
  variance_ml NUMERIC,
  variance_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH physical AS (
    SELECT 
      COALESCE(b.spirit_type, 'Unknown') as spirit,
      SUM(pr.ml_dispensed) as total_ml
    FROM lab_ops_pourer_readings pr
    JOIN lab_ops_bottles b ON b.id = pr.bottle_id
    WHERE pr.outlet_id = p_outlet_id
      AND pr.reading_timestamp BETWEEN p_start_time AND p_end_time
      AND (p_spirit_type IS NULL OR b.spirit_type = p_spirit_type)
    GROUP BY b.spirit_type
  ),
  virtual AS (
    SELECT 
      COALESCE(s.spirit_type, 'Unknown') as spirit,
      SUM(s.total_ml_sold) as total_ml
    FROM lab_ops_sales s
    WHERE s.outlet_id = p_outlet_id
      AND s.sold_at BETWEEN p_start_time AND p_end_time
      AND (p_spirit_type IS NULL OR s.spirit_type = p_spirit_type)
    GROUP BY s.spirit_type
  )
  SELECT 
    COALESCE(p.spirit, v.spirit) as spirit,
    COALESCE(p.total_ml, 0) as physical_ml,
    COALESCE(v.total_ml, 0) as virtual_ml,
    COALESCE(p.total_ml, 0) - COALESCE(v.total_ml, 0) as variance_ml,
    CASE 
      WHEN COALESCE(v.total_ml, 0) > 0 
      THEN ROUND(((COALESCE(p.total_ml, 0) - COALESCE(v.total_ml, 0)) / COALESCE(v.total_ml, 1)) * 100, 2)
      ELSE 0 
    END as variance_pct
  FROM physical p
  FULL OUTER JOIN virtual v ON p.spirit = v.spirit;
END;
$$;

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_ops_pourer_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_ops_sales;

-- Indexes for performance
CREATE INDEX idx_lab_ops_bottles_outlet ON public.lab_ops_bottles(outlet_id);
CREATE INDEX idx_lab_ops_pourer_readings_bottle ON public.lab_ops_pourer_readings(bottle_id);
CREATE INDEX idx_lab_ops_pourer_readings_timestamp ON public.lab_ops_pourer_readings(reading_timestamp);
CREATE INDEX idx_lab_ops_sales_outlet ON public.lab_ops_sales(outlet_id);
CREATE INDEX idx_lab_ops_sales_sold_at ON public.lab_ops_sales(sold_at);
CREATE INDEX idx_lab_ops_variance_reports_outlet ON public.lab_ops_variance_reports(outlet_id);
