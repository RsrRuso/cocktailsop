-- Menu Engineering Tables

-- Menu items master table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  food_cost NUMERIC(10,2) DEFAULT 0,
  selling_price NUMERIC(10,2) DEFAULT 0,
  portion_size TEXT,
  recipe_id UUID,
  micros_item_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sales data from Micros Oracle imports
CREATE TABLE public.menu_sales_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  import_batch_id UUID,
  sale_date DATE NOT NULL,
  daypart TEXT,
  units_sold INTEGER DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  modifier_revenue NUMERIC(10,2) DEFAULT 0,
  waste_units INTEGER DEFAULT 0,
  waste_cost NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Menu analysis history
CREATE TABLE public.menu_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analysis_date DATE DEFAULT CURRENT_DATE,
  period_start DATE,
  period_end DATE,
  total_items INTEGER DEFAULT 0,
  total_revenue NUMERIC(14,2) DEFAULT 0,
  total_food_cost NUMERIC(14,2) DEFAULT 0,
  avg_food_cost_pct NUMERIC(5,2) DEFAULT 0,
  stars_count INTEGER DEFAULT 0,
  plowhorses_count INTEGER DEFAULT 0,
  puzzles_count INTEGER DEFAULT 0,
  dogs_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Individual item analysis results
CREATE TABLE public.menu_item_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID REFERENCES public.menu_analysis(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  units_sold INTEGER DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  food_cost NUMERIC(10,2) DEFAULT 0,
  contribution_margin NUMERIC(10,2) DEFAULT 0,
  food_cost_pct NUMERIC(5,2) DEFAULT 0,
  sales_mix_pct NUMERIC(5,2) DEFAULT 0,
  category TEXT,
  profitability_index NUMERIC(6,2) DEFAULT 0,
  popularity_index NUMERIC(6,2) DEFAULT 0,
  ai_recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Import batches for tracking data sources
CREATE TABLE public.menu_import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  import_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  source_type TEXT DEFAULT 'csv',
  source_name TEXT,
  records_imported INTEGER DEFAULT 0,
  period_start DATE,
  period_end DATE,
  status TEXT DEFAULT 'completed',
  error_message TEXT,
  raw_data JSONB
);

-- Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_import_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own menu items" ON public.menu_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sales data" ON public.menu_sales_data FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own analysis" ON public.menu_analysis FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own item analysis" ON public.menu_item_analysis FOR ALL USING (
  EXISTS (SELECT 1 FROM public.menu_analysis ma WHERE ma.id = analysis_id AND ma.user_id = auth.uid())
);
CREATE POLICY "Users can manage own imports" ON public.menu_import_batches FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_menu_sales_item ON public.menu_sales_data(menu_item_id);
CREATE INDEX idx_menu_sales_date ON public.menu_sales_data(sale_date);
CREATE INDEX idx_menu_sales_user ON public.menu_sales_data(user_id);
CREATE INDEX idx_menu_item_analysis ON public.menu_item_analysis(analysis_id);

-- Updated_at trigger
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();