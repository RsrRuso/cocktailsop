-- Create staff members table
CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL CHECK (title IN ('head_bartender', 'senior_bartender', 'bartender', 'bar_back', 'support')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS public.staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  staff_member_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('opening', 'closing', 'misa_place', 'pickup', 'brunch')),
  station_type TEXT NOT NULL CHECK (station_type IN ('indoor_station_1', 'indoor_station_2', 'indoor_station_3', 'tickets_segregator', 'outdoor_station_1', 'outdoor_station_2')),
  notes TEXT,
  week_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_member_id, schedule_date)
);

-- Create staff allocations table
CREATE TABLE IF NOT EXISTS public.staff_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  staff_member_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  allocation_date DATE NOT NULL,
  station_assignment TEXT NOT NULL,
  shift_type TEXT NOT NULL,
  responsibilities TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create schedule notes/events table
CREATE TABLE IF NOT EXISTS public.schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_date DATE NOT NULL,
  event_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_members
CREATE POLICY "Users can view own staff members" ON public.staff_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own staff members" ON public.staff_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own staff members" ON public.staff_members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own staff members" ON public.staff_members
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for staff_schedules
CREATE POLICY "Users can view own schedules" ON public.staff_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own schedules" ON public.staff_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules" ON public.staff_schedules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules" ON public.staff_schedules
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for staff_allocations
CREATE POLICY "Users can view own allocations" ON public.staff_allocations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own allocations" ON public.staff_allocations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own allocations" ON public.staff_allocations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own allocations" ON public.staff_allocations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for schedule_events
CREATE POLICY "Users can view own events" ON public.schedule_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own events" ON public.schedule_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON public.schedule_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON public.schedule_events
  FOR DELETE USING (auth.uid() = user_id);