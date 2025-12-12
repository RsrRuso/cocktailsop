-- Create purchase_orders table
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number TEXT,
  supplier_name TEXT,
  order_date DATE DEFAULT CURRENT_DATE,
  total_amount NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  document_url TEXT,
  parsed_data JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'received')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase_order_items table
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_code TEXT,
  item_name TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  price_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchase_orders
CREATE POLICY "Users can view own purchase orders"
ON public.purchase_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own purchase orders"
ON public.purchase_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchase orders"
ON public.purchase_orders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own purchase orders"
ON public.purchase_orders FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for purchase_order_items
CREATE POLICY "Users can view items of own orders"
ON public.purchase_order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po 
    WHERE po.id = purchase_order_id AND po.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create items for own orders"
ON public.purchase_order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM purchase_orders po 
    WHERE po.id = purchase_order_id AND po.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update items of own orders"
ON public.purchase_order_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po 
    WHERE po.id = purchase_order_id AND po.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete items of own orders"
ON public.purchase_order_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po 
    WHERE po.id = purchase_order_id AND po.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_purchase_orders_updated_at
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for purchase order documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase-orders', 'purchase-orders', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own PO documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'purchase-orders' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own PO documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'purchase-orders' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own PO documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'purchase-orders' AND auth.uid()::text = (storage.foldername(name))[1]);