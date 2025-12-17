-- ================================================================
-- SPECVERSE SMART POURER SYSTEM - COMPLETE SCHEMA EXTENSION
-- Extends existing LAB Ops infrastructure with full spec
-- ================================================================

-- 1) DEVICES TABLE (Smart Pourers Hardware)
CREATE TABLE IF NOT EXISTS public.smart_pourer_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_code TEXT NOT NULL UNIQUE,
  firmware_version TEXT,
  battery_level INTEGER DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'offline')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  outlet_id UUID REFERENCES public.lab_ops_outlets(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2) SKU TABLE (Product definitions)
CREATE TABLE IF NOT EXISTS public.smart_pourer_skus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  spirit_type TEXT NOT NULL,
  brand TEXT,
  cost_per_ml NUMERIC(10,4),
  default_bottle_size_ml INTEGER DEFAULT 750,
  outlet_id UUID REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3) BOTTLES TABLE (Physical bottles with QR/NFC codes)
CREATE TABLE IF NOT EXISTS public.smart_pourer_bottles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku_id UUID NOT NULL REFERENCES public.smart_pourer_skus(id) ON DELETE RESTRICT,
  bottle_size_ml INTEGER NOT NULL DEFAULT 750 CHECK (bottle_size_ml IN (700, 750, 1000, 1750)),
  qr_or_nfc_code TEXT,
  outlet_id UUID NOT NULL REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'empty', 'removed')),
  current_level_ml NUMERIC DEFAULT 0,
  opened_at TIMESTAMP WITH TIME ZONE,
  emptied_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4) DEVICE-BOTTLE PAIRING (Critical validation layer)
CREATE TABLE IF NOT EXISTS public.smart_pourer_device_pairings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.smart_pourer_devices(id) ON DELETE CASCADE,
  bottle_id UUID NOT NULL REFERENCES public.smart_pourer_bottles(id) ON DELETE CASCADE,
  paired_by_user UUID REFERENCES auth.users(id),
  paired_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unpaired_at TIMESTAMP WITH TIME ZONE,
  manager_override BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Only one active pairing per device at a time
  CONSTRAINT unique_active_device_pairing UNIQUE (device_id, is_active) 
    DEFERRABLE INITIALLY DEFERRED
);

-- 5) POUR EVENTS (Hardware truth - append only)
CREATE TABLE IF NOT EXISTS public.smart_pourer_pour_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.smart_pourer_devices(id) ON DELETE RESTRICT,
  bottle_id UUID REFERENCES public.smart_pourer_bottles(id) ON DELETE SET NULL,
  sku_id UUID REFERENCES public.smart_pourer_skus(id) ON DELETE SET NULL,
  pairing_id UUID REFERENCES public.smart_pourer_device_pairings(id),
  poured_ml NUMERIC NOT NULL,
  pulse_count INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  battery INTEGER,
  error_flag BOOLEAN DEFAULT false,
  error_message TEXT,
  outlet_id UUID REFERENCES public.lab_ops_outlets(id),
  synced_from_offline BOOLEAN DEFAULT false,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
  -- Note: No UPDATE allowed on this table - append only
);

-- 6) RECIPES (SOP Engine)
CREATE TABLE IF NOT EXISTS public.smart_pourer_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cocktail_name TEXT NOT NULL,
  outlet_id UUID NOT NULL REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  active_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  active_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  category TEXT,
  selling_price NUMERIC(10,2),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cocktail_name, outlet_id, version)
);

-- 7) RECIPE ITEMS (Ingredients per recipe)
CREATE TABLE IF NOT EXISTS public.smart_pourer_recipe_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.smart_pourer_recipes(id) ON DELETE CASCADE,
  sku_id UUID NOT NULL REFERENCES public.smart_pourer_skus(id) ON DELETE RESTRICT,
  ml_required NUMERIC NOT NULL,
  is_optional BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8) POS SALES IMPORT
CREATE TABLE IF NOT EXISTS public.smart_pourer_pos_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pos_item_name TEXT NOT NULL,
  pos_item_code TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2),
  total_price NUMERIC(10,2),
  sold_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  outlet_id UUID NOT NULL REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  pos_transaction_id TEXT,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT DEFAULT 'manual',
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9) POS-RECIPE MAPPING
CREATE TABLE IF NOT EXISTS public.smart_pourer_pos_recipe_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pos_item_name TEXT NOT NULL,
  pos_item_code TEXT,
  recipe_id UUID NOT NULL REFERENCES public.smart_pourer_recipes(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pos_item_name, outlet_id)
);

-- 10) INVENTORY SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.smart_pourer_inventory_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku_id UUID NOT NULL REFERENCES public.smart_pourer_skus(id) ON DELETE RESTRICT,
  outlet_id UUID NOT NULL REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  snapshot_type TEXT NOT NULL DEFAULT 'closing' CHECK (snapshot_type IN ('opening', 'closing', 'received', 'adjustment')),
  ml_amount NUMERIC NOT NULL,
  bottle_count INTEGER,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sku_id, outlet_id, snapshot_date, snapshot_type)
);

-- 11) VARIANCE LOGS (Manager accountability)
CREATE TABLE IF NOT EXISTS public.smart_pourer_variance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku_id UUID REFERENCES public.smart_pourer_skus(id),
  outlet_id UUID NOT NULL REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  variance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  measured_ml NUMERIC NOT NULL,
  expected_ml NUMERIC NOT NULL,
  variance_ml NUMERIC NOT NULL,
  variance_cost NUMERIC(10,2),
  variance_type TEXT NOT NULL CHECK (variance_type IN ('vs_sop', 'vs_stock', 'vs_both')),
  reason TEXT CHECK (reason IN (
    'overpouring', 'spillage', 'staff_drinks', 'complimentary', 
    'event_tasting', 'wrong_pairing', 'device_issue', 'theft_suspected', 'other'
  )),
  reason_notes TEXT,
  manager_id UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 12) DEVICE AUDIT LOG (Anti-cheat)
CREATE TABLE IF NOT EXISTS public.smart_pourer_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID REFERENCES public.lab_ops_outlets(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  actor_id UUID REFERENCES auth.users(id),
  manager_pin_used BOOLEAN DEFAULT false,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 13) SHIFT SESSIONS (Opening/Closing workflow)
CREATE TABLE IF NOT EXISTS public.smart_pourer_shift_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'evening', 'night')),
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES auth.users(id),
  opening_inventory_snapshot_id UUID REFERENCES public.smart_pourer_inventory_snapshots(id),
  closing_inventory_snapshot_id UUID REFERENCES public.smart_pourer_inventory_snapshots(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed')),
  notes TEXT,
  variance_reviewed BOOLEAN DEFAULT false,
  variance_pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_smart_pourer_devices_outlet ON public.smart_pourer_devices(outlet_id);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_devices_status ON public.smart_pourer_devices(status);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_bottles_sku ON public.smart_pourer_bottles(sku_id);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_bottles_outlet ON public.smart_pourer_bottles(outlet_id);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_pairings_device ON public.smart_pourer_device_pairings(device_id);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_pairings_bottle ON public.smart_pourer_device_pairings(bottle_id);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_pairings_active ON public.smart_pourer_device_pairings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_smart_pourer_pour_events_device ON public.smart_pourer_pour_events(device_id);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_pour_events_bottle ON public.smart_pourer_pour_events(bottle_id);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_pour_events_started ON public.smart_pourer_pour_events(started_at);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_pour_events_outlet ON public.smart_pourer_pour_events(outlet_id);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_recipes_outlet ON public.smart_pourer_recipes(outlet_id);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_recipes_active ON public.smart_pourer_recipes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_smart_pourer_pos_sales_outlet ON public.smart_pourer_pos_sales(outlet_id);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_pos_sales_sold ON public.smart_pourer_pos_sales(sold_at);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_inventory_sku ON public.smart_pourer_inventory_snapshots(sku_id);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_inventory_date ON public.smart_pourer_inventory_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_variance_date ON public.smart_pourer_variance_logs(variance_date);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_variance_outlet ON public.smart_pourer_variance_logs(outlet_id);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_shifts_outlet ON public.smart_pourer_shift_sessions(outlet_id);
CREATE INDEX IF NOT EXISTS idx_smart_pourer_shifts_date ON public.smart_pourer_shift_sessions(shift_date);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.smart_pourer_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_pourer_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_pourer_bottles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_pourer_device_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_pourer_pour_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_pourer_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_pourer_recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_pourer_pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_pourer_pos_recipe_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_pourer_inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_pourer_variance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_pourer_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_pourer_shift_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for outlet-based access (users can access data for outlets they belong to)
CREATE POLICY "Users can view devices for their outlets" ON public.smart_pourer_devices
  FOR SELECT USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    ) OR outlet_id IN (
      SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can manage devices for their outlets" ON public.smart_pourer_devices
  FOR ALL USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    )
  );

-- SKUs policies
CREATE POLICY "Users can view SKUs for their outlets" ON public.smart_pourer_skus
  FOR SELECT USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    ) OR outlet_id IN (
      SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can manage SKUs for their outlets" ON public.smart_pourer_skus
  FOR ALL USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    )
  );

-- Bottles policies
CREATE POLICY "Users can view bottles for their outlets" ON public.smart_pourer_bottles
  FOR SELECT USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    ) OR outlet_id IN (
      SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can manage bottles for their outlets" ON public.smart_pourer_bottles
  FOR ALL USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    )
  );

-- Device pairings policies
CREATE POLICY "Users can view pairings for their outlets" ON public.smart_pourer_device_pairings
  FOR SELECT USING (
    device_id IN (
      SELECT id FROM public.smart_pourer_devices WHERE outlet_id IN (
        SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
        UNION
        SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can manage pairings for their outlets" ON public.smart_pourer_device_pairings
  FOR ALL USING (
    device_id IN (
      SELECT id FROM public.smart_pourer_devices WHERE outlet_id IN (
        SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
      )
    )
  );

-- Pour events policies (read-only for most, insert for device ingestion)
CREATE POLICY "Users can view pour events for their outlets" ON public.smart_pourer_pour_events
  FOR SELECT USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    ) OR outlet_id IN (
      SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can insert pour events for their outlets" ON public.smart_pourer_pour_events
  FOR INSERT WITH CHECK (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    ) OR outlet_id IN (
      SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Recipes policies
CREATE POLICY "Users can view recipes for their outlets" ON public.smart_pourer_recipes
  FOR SELECT USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    ) OR outlet_id IN (
      SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can manage recipes for their outlets" ON public.smart_pourer_recipes
  FOR ALL USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    )
  );

-- Recipe items policies
CREATE POLICY "Users can view recipe items" ON public.smart_pourer_recipe_items
  FOR SELECT USING (
    recipe_id IN (
      SELECT id FROM public.smart_pourer_recipes WHERE outlet_id IN (
        SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
        UNION
        SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can manage recipe items" ON public.smart_pourer_recipe_items
  FOR ALL USING (
    recipe_id IN (
      SELECT id FROM public.smart_pourer_recipes WHERE outlet_id IN (
        SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
      )
    )
  );

-- POS sales policies
CREATE POLICY "Users can view POS sales for their outlets" ON public.smart_pourer_pos_sales
  FOR SELECT USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    ) OR outlet_id IN (
      SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can manage POS sales for their outlets" ON public.smart_pourer_pos_sales
  FOR ALL USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    )
  );

-- POS recipe mapping policies
CREATE POLICY "Users can view POS mappings for their outlets" ON public.smart_pourer_pos_recipe_mapping
  FOR SELECT USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    ) OR outlet_id IN (
      SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can manage POS mappings for their outlets" ON public.smart_pourer_pos_recipe_mapping
  FOR ALL USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    )
  );

-- Inventory snapshots policies
CREATE POLICY "Users can view inventory snapshots for their outlets" ON public.smart_pourer_inventory_snapshots
  FOR SELECT USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    ) OR outlet_id IN (
      SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can manage inventory snapshots for their outlets" ON public.smart_pourer_inventory_snapshots
  FOR ALL USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    ) OR outlet_id IN (
      SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Variance logs policies
CREATE POLICY "Users can view variance logs for their outlets" ON public.smart_pourer_variance_logs
  FOR SELECT USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    ) OR outlet_id IN (
      SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can manage variance logs for their outlets" ON public.smart_pourer_variance_logs
  FOR ALL USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    )
  );

-- Audit log policies (view only for owners, insert for all staff)
CREATE POLICY "Users can view audit logs for their outlets" ON public.smart_pourer_audit_log
  FOR SELECT USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert audit logs" ON public.smart_pourer_audit_log
  FOR INSERT WITH CHECK (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    ) OR outlet_id IN (
      SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Shift sessions policies
CREATE POLICY "Users can view shift sessions for their outlets" ON public.smart_pourer_shift_sessions
  FOR SELECT USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    ) OR outlet_id IN (
      SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can manage shift sessions for their outlets" ON public.smart_pourer_shift_sessions
  FOR ALL USING (
    outlet_id IN (
      SELECT id FROM public.lab_ops_outlets WHERE user_id = auth.uid()
    ) OR outlet_id IN (
      SELECT outlet_id FROM public.lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ================================================================
-- TRIGGERS & FUNCTIONS
-- ================================================================

-- Function to validate device pairing before pour event insertion
CREATE OR REPLACE FUNCTION public.validate_pour_event_pairing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  active_pairing RECORD;
BEGIN
  -- Find active pairing for this device
  SELECT * INTO active_pairing
  FROM public.smart_pourer_device_pairings
  WHERE device_id = NEW.device_id
    AND is_active = true
    AND unpaired_at IS NULL
  LIMIT 1;
  
  -- Reject if no active pairing
  IF NOT FOUND THEN
    NEW.error_flag := true;
    NEW.error_message := 'No active device pairing';
  ELSE
    -- Set bottle_id and sku_id from pairing
    NEW.pairing_id := active_pairing.id;
    NEW.bottle_id := active_pairing.bottle_id;
    
    -- Get SKU from bottle
    SELECT sku_id INTO NEW.sku_id
    FROM public.smart_pourer_bottles
    WHERE id = NEW.bottle_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_pour_event_before_insert
BEFORE INSERT ON public.smart_pourer_pour_events
FOR EACH ROW
EXECUTE FUNCTION public.validate_pour_event_pairing();

-- Function to update bottle level after pour
CREATE OR REPLACE FUNCTION public.update_bottle_level_after_pour()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.bottle_id IS NOT NULL AND NOT NEW.error_flag THEN
    UPDATE public.smart_pourer_bottles
    SET current_level_ml = GREATEST(0, current_level_ml - NEW.poured_ml),
        updated_at = now()
    WHERE id = NEW.bottle_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_bottle_after_pour
AFTER INSERT ON public.smart_pourer_pour_events
FOR EACH ROW
EXECUTE FUNCTION public.update_bottle_level_after_pour();

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_smart_pourer_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.smart_pourer_audit_log (outlet_id, action, entity_type, entity_id, actor_id, details)
    VALUES (
      COALESCE(NEW.outlet_id, (SELECT outlet_id FROM public.smart_pourer_devices WHERE id = NEW.device_id LIMIT 1)),
      'created',
      TG_TABLE_NAME,
      NEW.id,
      auth.uid(),
      jsonb_build_object('new', row_to_json(NEW))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.smart_pourer_audit_log (outlet_id, action, entity_type, entity_id, actor_id, details)
    VALUES (
      COALESCE(NEW.outlet_id, OLD.outlet_id),
      'updated',
      TG_TABLE_NAME,
      NEW.id,
      auth.uid(),
      jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.smart_pourer_audit_log (outlet_id, action, entity_type, entity_id, actor_id, details)
    VALUES (
      OLD.outlet_id,
      'deleted',
      TG_TABLE_NAME,
      OLD.id,
      auth.uid(),
      jsonb_build_object('old', row_to_json(OLD))
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Audit triggers for critical tables
CREATE TRIGGER audit_device_pairings
AFTER INSERT OR UPDATE OR DELETE ON public.smart_pourer_device_pairings
FOR EACH ROW EXECUTE FUNCTION public.log_smart_pourer_audit();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.smart_pourer_pour_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.smart_pourer_devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.smart_pourer_device_pairings;