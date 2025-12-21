-- Pre-Opening Package Tables (avoiding existing menu_items table)

-- 1. Pre-Opening Projects (venue setup projects)
CREATE TABLE IF NOT EXISTS public.pre_opening_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  venue_type TEXT NOT NULL DEFAULT 'restaurant',
  target_opening_date DATE,
  status TEXT NOT NULL DEFAULT 'planning',
  description TEXT,
  location TEXT,
  budget DECIMAL(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Pre-Opening Milestones
CREATE TABLE IF NOT EXISTS public.pre_opening_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.pre_opening_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  department TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Pre-Opening Tasks
CREATE TABLE IF NOT EXISTS public.pre_opening_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID REFERENCES public.pre_opening_milestones(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.pre_opening_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  assigned_to TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Vendors/Suppliers
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  payment_terms TEXT,
  lead_time_days INTEGER,
  minimum_order DECIMAL(10,2),
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Vendor Contracts
CREATE TABLE IF NOT EXISTS public.vendor_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  contract_name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  value DECIMAL(12,2),
  terms TEXT,
  document_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Organization Departments
CREATE TABLE IF NOT EXISTS public.org_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.org_departments(id) ON DELETE SET NULL,
  head_name TEXT,
  head_title TEXT,
  color TEXT DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Organization Positions
CREATE TABLE IF NOT EXISTS public.org_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.org_departments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  reports_to UUID REFERENCES public.org_positions(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 1,
  headcount INTEGER DEFAULT 1,
  salary_range_min DECIMAL(10,2),
  salary_range_max DECIMAL(10,2),
  requirements TEXT,
  is_filled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. SOP Library
CREATE TABLE IF NOT EXISTS public.sop_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  department TEXT,
  category TEXT,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft',
  effective_date DATE,
  review_date DATE,
  author TEXT,
  approver TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. SOP Steps (for step-by-step procedures)
CREATE TABLE IF NOT EXISTS public.sop_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id UUID NOT NULL REFERENCES public.sop_library(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  critical_point BOOLEAN DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Menu Departments (e.g., Appetizers, Mains, Desserts, Cocktails)
CREATE TABLE IF NOT EXISTS public.menu_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Menu Categories (sub-categories within departments)
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.menu_departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Menu Builder Items (separate from existing menu_items to avoid conflicts)
CREATE TABLE IF NOT EXISTS public.menu_builder_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  cost DECIMAL(10,2),
  food_cost_percentage DECIMAL(5,2),
  image_url TEXT,
  allergens TEXT[],
  dietary_tags TEXT[],
  prep_time_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  recipe_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. License & Compliance Tracker
CREATE TABLE IF NOT EXISTS public.licenses_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE SET NULL,
  license_type TEXT NOT NULL,
  license_name TEXT NOT NULL,
  issuing_authority TEXT,
  license_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  renewal_reminder_days INTEGER DEFAULT 30,
  status TEXT DEFAULT 'pending',
  document_url TEXT,
  notes TEXT,
  cost DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Asset Registry (FF&E tracking)
CREATE TABLE IF NOT EXISTS public.asset_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE SET NULL,
  asset_name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  warranty_expiry DATE,
  location TEXT,
  condition TEXT DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.pre_opening_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_opening_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_opening_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_builder_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_registry ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pre_opening_projects
CREATE POLICY "Users can view own projects" ON public.pre_opening_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own projects" ON public.pre_opening_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.pre_opening_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.pre_opening_projects FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for pre_opening_milestones
CREATE POLICY "Users can view milestones of own projects" ON public.pre_opening_milestones FOR SELECT USING (EXISTS (SELECT 1 FROM public.pre_opening_projects WHERE id = project_id AND user_id = auth.uid()));
CREATE POLICY "Users can create milestones for own projects" ON public.pre_opening_milestones FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.pre_opening_projects WHERE id = project_id AND user_id = auth.uid()));
CREATE POLICY "Users can update milestones of own projects" ON public.pre_opening_milestones FOR UPDATE USING (EXISTS (SELECT 1 FROM public.pre_opening_projects WHERE id = project_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete milestones of own projects" ON public.pre_opening_milestones FOR DELETE USING (EXISTS (SELECT 1 FROM public.pre_opening_projects WHERE id = project_id AND user_id = auth.uid()));

-- RLS Policies for pre_opening_tasks
CREATE POLICY "Users can view tasks of own projects" ON public.pre_opening_tasks FOR SELECT USING (EXISTS (SELECT 1 FROM public.pre_opening_projects WHERE id = project_id AND user_id = auth.uid()));
CREATE POLICY "Users can create tasks for own projects" ON public.pre_opening_tasks FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.pre_opening_projects WHERE id = project_id AND user_id = auth.uid()));
CREATE POLICY "Users can update tasks of own projects" ON public.pre_opening_tasks FOR UPDATE USING (EXISTS (SELECT 1 FROM public.pre_opening_projects WHERE id = project_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete tasks of own projects" ON public.pre_opening_tasks FOR DELETE USING (EXISTS (SELECT 1 FROM public.pre_opening_projects WHERE id = project_id AND user_id = auth.uid()));

-- RLS Policies for vendors
CREATE POLICY "Users can view own vendors" ON public.vendors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own vendors" ON public.vendors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vendors" ON public.vendors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vendors" ON public.vendors FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for vendor_contracts
CREATE POLICY "Users can view contracts of own vendors" ON public.vendor_contracts FOR SELECT USING (EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid()));
CREATE POLICY "Users can create contracts for own vendors" ON public.vendor_contracts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid()));
CREATE POLICY "Users can update contracts of own vendors" ON public.vendor_contracts FOR UPDATE USING (EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete contracts of own vendors" ON public.vendor_contracts FOR DELETE USING (EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid()));

-- RLS Policies for org_departments
CREATE POLICY "Users can view own departments" ON public.org_departments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own departments" ON public.org_departments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own departments" ON public.org_departments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own departments" ON public.org_departments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for org_positions
CREATE POLICY "Users can view positions of own departments" ON public.org_positions FOR SELECT USING (EXISTS (SELECT 1 FROM public.org_departments WHERE id = department_id AND user_id = auth.uid()));
CREATE POLICY "Users can create positions for own departments" ON public.org_positions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.org_departments WHERE id = department_id AND user_id = auth.uid()));
CREATE POLICY "Users can update positions of own departments" ON public.org_positions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.org_departments WHERE id = department_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete positions of own departments" ON public.org_positions FOR DELETE USING (EXISTS (SELECT 1 FROM public.org_departments WHERE id = department_id AND user_id = auth.uid()));

-- RLS Policies for sop_library
CREATE POLICY "Users can view own SOPs" ON public.sop_library FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own SOPs" ON public.sop_library FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own SOPs" ON public.sop_library FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own SOPs" ON public.sop_library FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for sop_steps
CREATE POLICY "Users can view steps of own SOPs" ON public.sop_steps FOR SELECT USING (EXISTS (SELECT 1 FROM public.sop_library WHERE id = sop_id AND user_id = auth.uid()));
CREATE POLICY "Users can create steps for own SOPs" ON public.sop_steps FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.sop_library WHERE id = sop_id AND user_id = auth.uid()));
CREATE POLICY "Users can update steps of own SOPs" ON public.sop_steps FOR UPDATE USING (EXISTS (SELECT 1 FROM public.sop_library WHERE id = sop_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete steps of own SOPs" ON public.sop_steps FOR DELETE USING (EXISTS (SELECT 1 FROM public.sop_library WHERE id = sop_id AND user_id = auth.uid()));

-- RLS Policies for menu_departments
CREATE POLICY "Users can view own menu departments" ON public.menu_departments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own menu departments" ON public.menu_departments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own menu departments" ON public.menu_departments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own menu departments" ON public.menu_departments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for menu_categories
CREATE POLICY "Users can view categories of own departments" ON public.menu_categories FOR SELECT USING (EXISTS (SELECT 1 FROM public.menu_departments WHERE id = department_id AND user_id = auth.uid()));
CREATE POLICY "Users can create categories for own departments" ON public.menu_categories FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.menu_departments WHERE id = department_id AND user_id = auth.uid()));
CREATE POLICY "Users can update categories of own departments" ON public.menu_categories FOR UPDATE USING (EXISTS (SELECT 1 FROM public.menu_departments WHERE id = department_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete categories of own departments" ON public.menu_categories FOR DELETE USING (EXISTS (SELECT 1 FROM public.menu_departments WHERE id = department_id AND user_id = auth.uid()));

-- RLS Policies for menu_builder_items
CREATE POLICY "Users can view own menu builder items" ON public.menu_builder_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own menu builder items" ON public.menu_builder_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own menu builder items" ON public.menu_builder_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own menu builder items" ON public.menu_builder_items FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for licenses_compliance
CREATE POLICY "Users can view own licenses" ON public.licenses_compliance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own licenses" ON public.licenses_compliance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own licenses" ON public.licenses_compliance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own licenses" ON public.licenses_compliance FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for asset_registry
CREATE POLICY "Users can view own assets" ON public.asset_registry FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own assets" ON public.asset_registry FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assets" ON public.asset_registry FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own assets" ON public.asset_registry FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER update_pre_opening_projects_updated_at BEFORE UPDATE ON public.pre_opening_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_sop_library_updated_at BEFORE UPDATE ON public.sop_library FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_menu_builder_items_updated_at BEFORE UPDATE ON public.menu_builder_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_licenses_compliance_updated_at BEFORE UPDATE ON public.licenses_compliance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_asset_registry_updated_at BEFORE UPDATE ON public.asset_registry FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();