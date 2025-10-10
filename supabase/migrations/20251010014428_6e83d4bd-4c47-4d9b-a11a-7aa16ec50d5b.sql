-- Create enum for equipment types
CREATE TYPE equipment_type AS ENUM (
  'fridge',
  'freezer',
  'walk_in_fridge',
  'walk_in_freezer',
  'chest_freezer',
  'under_counter',
  'tall_fridge',
  'chiller',
  'super_freezer'
);

-- Create equipment table
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type equipment_type NOT NULL,
  area TEXT NOT NULL,
  doors INTEGER DEFAULT 1 CHECK (doors >= 1 AND doors <= 3),
  target_temperature DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create temperature logs table
CREATE TABLE public.temperature_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temperature DECIMAL(5,2) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temperature_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for equipment
CREATE POLICY "Users can view own equipment"
  ON public.equipment FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own equipment"
  ON public.equipment FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own equipment"
  ON public.equipment FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own equipment"
  ON public.equipment FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for temperature_logs
CREATE POLICY "Users can view own temperature logs"
  ON public.temperature_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own temperature logs"
  ON public.temperature_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own temperature logs"
  ON public.temperature_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own temperature logs"
  ON public.temperature_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_equipment_user_id ON public.equipment(user_id);
CREATE INDEX idx_equipment_area ON public.equipment(area);
CREATE INDEX idx_temperature_logs_equipment_id ON public.temperature_logs(equipment_id);
CREATE INDEX idx_temperature_logs_user_id ON public.temperature_logs(user_id);
CREATE INDEX idx_temperature_logs_recorded_at ON public.temperature_logs(recorded_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();