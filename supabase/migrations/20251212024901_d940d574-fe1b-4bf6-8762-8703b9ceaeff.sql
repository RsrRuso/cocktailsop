-- Create master items table for unique ingredients from purchase orders
CREATE TABLE public.purchase_order_master_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  unit TEXT,
  category TEXT,
  last_price NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_name)
);

-- Create received items table to track all received items with prices
CREATE TABLE public.purchase_order_received_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  master_item_id UUID REFERENCES public.purchase_order_master_items(id),
  item_name TEXT NOT NULL,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
  unit TEXT,
  unit_price NUMERIC(10,2),
  total_price NUMERIC(10,2),
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_order_master_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_received_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for master items
CREATE POLICY "Users can view their own master items"
ON public.purchase_order_master_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own master items"
ON public.purchase_order_master_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own master items"
ON public.purchase_order_master_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own master items"
ON public.purchase_order_master_items FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for received items
CREATE POLICY "Users can view their own received items"
ON public.purchase_order_received_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own received items"
ON public.purchase_order_received_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own received items"
ON public.purchase_order_received_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own received items"
ON public.purchase_order_received_items FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to update master item last_price
CREATE OR REPLACE FUNCTION update_master_item_price()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.purchase_order_master_items
  SET last_price = NEW.unit_price, updated_at = now()
  WHERE id = NEW.master_item_id AND NEW.unit_price IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_master_item_price_trigger
AFTER INSERT ON public.purchase_order_received_items
FOR EACH ROW
EXECUTE FUNCTION update_master_item_price();