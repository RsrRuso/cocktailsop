-- Create location_maps table for venue layouts
CREATE TABLE IF NOT EXISTS public.location_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create location_areas table for stations/zones
CREATE TABLE IF NOT EXISTS public.location_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.location_maps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area_type TEXT NOT NULL, -- 'station', 'storage', 'prep', etc.
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create area_equipment table for equipment assignments
CREATE TABLE IF NOT EXISTS public.area_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.location_areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  equipment_type TEXT NOT NULL, -- 'fridge', 'freezer', 'walk_in_fridge', 'walk_in_freezer', 'cabinet', 'trolley', 'alcohol_storage', 'non_alcohol_storage', 'ice_section', 'rail'
  capacity TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create equipment_items table for items/ingredients in equipment
CREATE TABLE IF NOT EXISTS public.equipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.area_equipment(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT, -- 'purees', 'syrups', 'juices', 'tools', 'garnishes', etc.
  quantity TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.location_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for location_maps
CREATE POLICY "Users can view own location maps"
  ON public.location_maps FOR SELECT
  USING ((workspace_id IS NULL AND auth.uid() = user_id) OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id)));

CREATE POLICY "Users can create location maps"
  ON public.location_maps FOR INSERT
  WITH CHECK ((workspace_id IS NULL AND auth.uid() = user_id) OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id)));

CREATE POLICY "Users can update own location maps"
  ON public.location_maps FOR UPDATE
  USING ((workspace_id IS NULL AND auth.uid() = user_id) OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id)));

CREATE POLICY "Users can delete own location maps"
  ON public.location_maps FOR DELETE
  USING ((workspace_id IS NULL AND auth.uid() = user_id) OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id)));

-- RLS Policies for location_areas
CREATE POLICY "Users can view areas in their maps"
  ON public.location_areas FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.location_maps
    WHERE location_maps.id = location_areas.map_id
    AND ((workspace_id IS NULL AND auth.uid() = user_id) OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id)))
  ));

CREATE POLICY "Users can create areas in their maps"
  ON public.location_areas FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.location_maps
    WHERE location_maps.id = location_areas.map_id
    AND ((workspace_id IS NULL AND auth.uid() = user_id) OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id)))
  ));

CREATE POLICY "Users can update areas in their maps"
  ON public.location_areas FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.location_maps
    WHERE location_maps.id = location_areas.map_id
    AND ((workspace_id IS NULL AND auth.uid() = user_id) OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id)))
  ));

CREATE POLICY "Users can delete areas in their maps"
  ON public.location_areas FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.location_maps
    WHERE location_maps.id = location_areas.map_id
    AND ((workspace_id IS NULL AND auth.uid() = user_id) OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id)))
  ));

-- RLS Policies for area_equipment
CREATE POLICY "Users can view equipment in their areas"
  ON public.area_equipment FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.location_areas
    JOIN public.location_maps ON location_maps.id = location_areas.map_id
    WHERE location_areas.id = area_equipment.area_id
    AND ((workspace_id IS NULL AND auth.uid() = user_id) OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id)))
  ));

CREATE POLICY "Users can create equipment in their areas"
  ON public.area_equipment FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.location_areas
    JOIN public.location_maps ON location_maps.id = location_areas.map_id
    WHERE location_areas.id = area_equipment.area_id
    AND ((workspace_id IS NULL AND auth.uid() = user_id) OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id)))
  ));

CREATE POLICY "Users can update equipment in their areas"
  ON public.area_equipment FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.location_areas
    JOIN public.location_maps ON location_maps.id = location_areas.map_id
    WHERE location_areas.id = area_equipment.area_id
    AND ((workspace_id IS NULL AND auth.uid() = user_id) OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id)))
  ));

CREATE POLICY "Users can delete equipment in their areas"
  ON public.area_equipment FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.location_areas
    JOIN public.location_maps ON location_maps.id = location_areas.map_id
    WHERE location_areas.id = area_equipment.area_id
    AND ((workspace_id IS NULL AND auth.uid() = user_id) OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id)))
  ));

-- RLS Policies for equipment_items
CREATE POLICY "Users can view items in their equipment"
  ON public.equipment_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.area_equipment
    JOIN public.location_areas ON location_areas.id = area_equipment.area_id
    JOIN public.location_maps ON location_maps.id = location_areas.map_id
    WHERE area_equipment.id = equipment_items.equipment_id
    AND ((workspace_id IS NULL AND auth.uid() = user_id) OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id)))
  ));

CREATE POLICY "Users can create items in their equipment"
  ON public.equipment_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.area_equipment
    JOIN public.location_areas ON location_areas.id = area_equipment.area_id
    JOIN public.location_maps ON location_maps.id = location_areas.map_id
    WHERE area_equipment.id = equipment_items.equipment_id
    AND ((workspace_id IS NULL AND auth.uid() = user_id) OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id)))
  ));

CREATE POLICY "Users can update items in their equipment"
  ON public.equipment_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.area_equipment
    JOIN public.location_areas ON location_areas.id = area_equipment.area_id
    JOIN public.location_maps ON location_maps.id = location_areas.map_id
    WHERE area_equipment.id = equipment_items.equipment_id
    AND ((workspace_id IS NULL AND auth.uid() = user_id) OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id)))
  ));

CREATE POLICY "Users can delete items in their equipment"
  ON public.equipment_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.area_equipment
    JOIN public.location_areas ON location_areas.id = area_equipment.area_id
    JOIN public.location_maps ON location_maps.id = location_areas.map_id
    WHERE area_equipment.id = equipment_items.equipment_id
    AND ((workspace_id IS NULL AND auth.uid() = user_id) OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id)))
  ));