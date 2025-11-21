-- Create separate tables for FIFO Recording Manager (completely independent from Store Management)

-- FIFO Stores (personal only, no workspace)
CREATE TABLE IF NOT EXISTS public.fifo_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  store_type TEXT DEFAULT 'retail',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- FIFO Items (personal only, no workspace)
CREATE TABLE IF NOT EXISTS public.fifo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color_code TEXT,
  brand TEXT,
  barcode TEXT,
  category TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FIFO Inventory (personal only, no workspace)
CREATE TABLE IF NOT EXISTS public.fifo_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.fifo_items(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.fifo_stores(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  expiration_date DATE NOT NULL,
  received_date TIMESTAMPTZ DEFAULT now(),
  batch_number TEXT,
  notes TEXT,
  photo_url TEXT,
  priority_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  scanned_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- FIFO Employees (personal only, no workspace)
CREATE TABLE IF NOT EXISTS public.fifo_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FIFO Transfers (personal only, no workspace)
CREATE TABLE IF NOT EXISTS public.fifo_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.fifo_inventory(id) ON DELETE SET NULL,
  from_store_id UUID REFERENCES public.fifo_stores(id) ON DELETE SET NULL,
  to_store_id UUID REFERENCES public.fifo_stores(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL,
  transferred_by UUID REFERENCES public.fifo_employees(id) ON DELETE SET NULL,
  transfer_date TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending',
  notes TEXT,
  photo_url TEXT,
  scanned_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FIFO Activity Log (personal only, no workspace)
CREATE TABLE IF NOT EXISTS public.fifo_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.fifo_inventory(id) ON DELETE SET NULL,
  store_id UUID REFERENCES public.fifo_stores(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.fifo_employees(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  quantity_before NUMERIC,
  quantity_after NUMERIC,
  details JSONB,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all FIFO tables
ALTER TABLE public.fifo_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fifo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fifo_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fifo_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fifo_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fifo_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fifo_stores
CREATE POLICY "Users can view own FIFO stores" ON public.fifo_stores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own FIFO stores" ON public.fifo_stores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own FIFO stores" ON public.fifo_stores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own FIFO stores" ON public.fifo_stores FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for fifo_items
CREATE POLICY "Users can view own FIFO items" ON public.fifo_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own FIFO items" ON public.fifo_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own FIFO items" ON public.fifo_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own FIFO items" ON public.fifo_items FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for fifo_inventory
CREATE POLICY "Users can view own FIFO inventory" ON public.fifo_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own FIFO inventory" ON public.fifo_inventory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own FIFO inventory" ON public.fifo_inventory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own FIFO inventory" ON public.fifo_inventory FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for fifo_employees
CREATE POLICY "Users can view own FIFO employees" ON public.fifo_employees FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own FIFO employees" ON public.fifo_employees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own FIFO employees" ON public.fifo_employees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own FIFO employees" ON public.fifo_employees FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for fifo_transfers
CREATE POLICY "Users can view own FIFO transfers" ON public.fifo_transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own FIFO transfers" ON public.fifo_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own FIFO transfers" ON public.fifo_transfers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own FIFO transfers" ON public.fifo_transfers FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for fifo_activity_log
CREATE POLICY "Users can view own FIFO activity log" ON public.fifo_activity_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own FIFO activity log" ON public.fifo_activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_fifo_inventory_user_id ON public.fifo_inventory(user_id);
CREATE INDEX idx_fifo_inventory_item_id ON public.fifo_inventory(item_id);
CREATE INDEX idx_fifo_inventory_store_id ON public.fifo_inventory(store_id);
CREATE INDEX idx_fifo_inventory_expiration_date ON public.fifo_inventory(expiration_date);
CREATE INDEX idx_fifo_inventory_priority_score ON public.fifo_inventory(priority_score);
CREATE INDEX idx_fifo_items_user_id ON public.fifo_items(user_id);
CREATE INDEX idx_fifo_stores_user_id ON public.fifo_stores(user_id);
CREATE INDEX idx_fifo_transfers_user_id ON public.fifo_transfers(user_id);
CREATE INDEX idx_fifo_activity_log_user_id ON public.fifo_activity_log(user_id);

-- Trigger to update FIFO inventory priority score
CREATE OR REPLACE FUNCTION update_fifo_inventory_priority()
RETURNS TRIGGER AS $$
BEGIN
  NEW.priority_score := calculate_fifo_priority(
    NEW.expiration_date::DATE,
    NEW.received_date
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER fifo_inventory_priority_trigger
BEFORE INSERT OR UPDATE ON public.fifo_inventory
FOR EACH ROW
EXECUTE FUNCTION update_fifo_inventory_priority();

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_fifo_stores_updated_at
BEFORE UPDATE ON public.fifo_stores
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fifo_inventory_updated_at
BEFORE UPDATE ON public.fifo_inventory
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();