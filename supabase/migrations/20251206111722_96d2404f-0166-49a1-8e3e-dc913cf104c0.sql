-- Add new columns to lab_ops_tables for comprehensive table management
ALTER TABLE public.lab_ops_tables 
ADD COLUMN IF NOT EXISTS table_number INTEGER,
ADD COLUMN IF NOT EXISTS shape VARCHAR(50) DEFAULT 'square',
ADD COLUMN IF NOT EXISTS allocation VARCHAR(50) DEFAULT 'indoor',
ADD COLUMN IF NOT EXISTS standing_capacity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_covers INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_reservable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS width INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 100;

-- Create table for floor plans
CREATE TABLE IF NOT EXISTS public.lab_ops_floor_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  floor_number INTEGER DEFAULT 1,
  background_image TEXT,
  canvas_width INTEGER DEFAULT 800,
  canvas_height INTEGER DEFAULT 600,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on floor_plans
ALTER TABLE public.lab_ops_floor_plans ENABLE ROW LEVEL SECURITY;

-- Create policy using existing outlet membership function with both parameters
CREATE POLICY "Staff can manage floor plans" ON public.lab_ops_floor_plans
  FOR ALL USING (public.is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- Add floor_plan_id to tables
ALTER TABLE public.lab_ops_tables 
ADD COLUMN IF NOT EXISTS floor_plan_id UUID REFERENCES public.lab_ops_floor_plans(id) ON DELETE SET NULL;

-- Create table for venue capacity settings
CREATE TABLE IF NOT EXISTS public.lab_ops_venue_capacity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL UNIQUE REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  total_seated_capacity INTEGER DEFAULT 0,
  total_standing_capacity INTEGER DEFAULT 0,
  max_occupancy INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lab_ops_venue_capacity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage venue capacity" ON public.lab_ops_venue_capacity
  FOR ALL USING (public.is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- Enable realtime for floor plans
ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_ops_floor_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_ops_venue_capacity;