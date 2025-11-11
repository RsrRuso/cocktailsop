-- Create products table for sellers
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Products viewable by everyone"
  ON public.products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Sellers can view own products"
  ON public.products FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create products"
  ON public.products FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id 
    AND has_role(auth.uid(), 'seller'::app_role)
  );

CREATE POLICY "Sellers can update own products"
  ON public.products FOR UPDATE
  USING (
    auth.uid() = seller_id 
    AND has_role(auth.uid(), 'seller'::app_role)
  );

CREATE POLICY "Sellers can delete own products"
  ON public.products FOR DELETE
  USING (
    auth.uid() = seller_id 
    AND has_role(auth.uid(), 'seller'::app_role)
  );

-- Add seller_id to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_seller ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON public.orders(seller_id);

-- Trigger for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create seller_profiles table for additional seller info
CREATE TABLE IF NOT EXISTS public.seller_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_description TEXT,
  business_address TEXT,
  business_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

-- Seller profiles policies
CREATE POLICY "Seller profiles viewable by everyone"
  ON public.seller_profiles FOR SELECT
  USING (true);

CREATE POLICY "Sellers can create own profile"
  ON public.seller_profiles FOR INSERT
  WITH CHECK (auth.uid() = id AND has_role(auth.uid(), 'seller'::app_role));

CREATE POLICY "Sellers can update own profile"
  ON public.seller_profiles FOR UPDATE
  USING (auth.uid() = id AND has_role(auth.uid(), 'seller'::app_role));

-- Trigger for seller_profiles updated_at
CREATE TRIGGER update_seller_profiles_updated_at
  BEFORE UPDATE ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();