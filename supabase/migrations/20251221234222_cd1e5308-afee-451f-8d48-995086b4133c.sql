-- Budget Planner
CREATE TABLE public.pre_opening_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  budget_type TEXT DEFAULT 'capex' CHECK (budget_type IN ('capex', 'opex')),
  estimated_amount DECIMAL(12,2) DEFAULT 0,
  actual_amount DECIMAL(12,2) DEFAULT 0,
  variance DECIMAL(12,2) GENERATED ALWAYS AS (actual_amount - estimated_amount) STORED,
  payment_status TEXT DEFAULT 'pending',
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Recruitment Tracker
CREATE TABLE public.recruitment_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE SET NULL,
  position_title TEXT NOT NULL,
  department TEXT,
  employment_type TEXT DEFAULT 'full_time',
  salary_range_min DECIMAL(10,2),
  salary_range_max DECIMAL(10,2),
  positions_needed INTEGER DEFAULT 1,
  positions_filled INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  description TEXT,
  requirements TEXT[],
  posted_date DATE,
  target_hire_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.recruitment_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  position_id UUID REFERENCES public.recruitment_positions(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  resume_url TEXT,
  status TEXT DEFAULT 'applied',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  interview_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Training Program
CREATE TABLE public.training_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE SET NULL,
  program_name TEXT NOT NULL,
  department TEXT,
  description TEXT,
  duration_hours INTEGER,
  is_mandatory BOOLEAN DEFAULT false,
  materials_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.training_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  program_id UUID REFERENCES public.training_programs(id) ON DELETE CASCADE,
  trainee_name TEXT NOT NULL,
  trainee_email TEXT,
  status TEXT DEFAULT 'pending',
  start_date DATE,
  completion_date DATE,
  score INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Floor Plan Designer (layouts)
CREATE TABLE public.floor_plan_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE SET NULL,
  layout_name TEXT NOT NULL,
  area_type TEXT,
  canvas_data JSONB DEFAULT '{}',
  dimensions JSONB,
  total_capacity INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Opening Inventory Setup
CREATE TABLE public.opening_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  par_level DECIMAL(10,2),
  opening_quantity DECIMAL(10,2),
  unit_cost DECIMAL(10,2),
  supplier_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  order_status TEXT DEFAULT 'pending',
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tech Stack Setup
CREATE TABLE public.tech_stack_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  vendor TEXT,
  monthly_cost DECIMAL(10,2),
  setup_cost DECIMAL(10,2),
  status TEXT DEFAULT 'researching',
  contract_start DATE,
  contract_end DATE,
  login_credentials JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Marketing Launch
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE SET NULL,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT,
  channel TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(10,2),
  actual_spend DECIMAL(10,2),
  status TEXT DEFAULT 'planning',
  target_audience TEXT,
  goals TEXT,
  kpis JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Soft Opening Planner
CREATE TABLE public.soft_opening_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_type TEXT DEFAULT 'friends_family',
  event_date DATE,
  start_time TIME,
  end_time TIME,
  guest_count INTEGER,
  menu_type TEXT,
  budget DECIMAL(10,2),
  status TEXT DEFAULT 'planning',
  feedback_collected BOOLEAN DEFAULT false,
  lessons_learned TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Utilities Tracker
CREATE TABLE public.utilities_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE SET NULL,
  utility_type TEXT NOT NULL,
  provider_name TEXT,
  account_number TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  monthly_estimate DECIMAL(10,2),
  deposit_amount DECIMAL(10,2),
  setup_status TEXT DEFAULT 'pending',
  activation_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insurance Manager
CREATE TABLE public.insurance_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE SET NULL,
  policy_type TEXT NOT NULL,
  provider_name TEXT,
  policy_number TEXT,
  coverage_amount DECIMAL(12,2),
  premium_amount DECIMAL(10,2),
  payment_frequency TEXT DEFAULT 'monthly',
  start_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'active',
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Uniform/Dress Code
CREATE TABLE public.uniform_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  supplier TEXT,
  unit_cost DECIMAL(10,2),
  sizes_needed JSONB,
  quantity_ordered INTEGER DEFAULT 0,
  quantity_received INTEGER DEFAULT 0,
  order_status TEXT DEFAULT 'pending',
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Health & Safety Audit
CREATE TABLE public.safety_audit_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.pre_opening_projects(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  is_compliant BOOLEAN DEFAULT false,
  inspection_date DATE,
  inspector_name TEXT,
  corrective_action TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium',
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.pre_opening_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plan_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_stack_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soft_opening_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilities_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uniform_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_audit_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for all new tables
CREATE POLICY "Users can manage their own budgets" ON public.pre_opening_budgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own positions" ON public.recruitment_positions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own candidates" ON public.recruitment_candidates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own training programs" ON public.training_programs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own training assignments" ON public.training_assignments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own floor plans" ON public.floor_plan_layouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own opening inventory" ON public.opening_inventory FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own tech stack" ON public.tech_stack_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own marketing campaigns" ON public.marketing_campaigns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own soft opening events" ON public.soft_opening_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own utilities" ON public.utilities_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own insurance policies" ON public.insurance_policies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own uniform items" ON public.uniform_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own safety audits" ON public.safety_audit_items FOR ALL USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_pre_opening_budgets_updated_at BEFORE UPDATE ON public.pre_opening_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recruitment_positions_updated_at BEFORE UPDATE ON public.recruitment_positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recruitment_candidates_updated_at BEFORE UPDATE ON public.recruitment_candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_training_programs_updated_at BEFORE UPDATE ON public.training_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_floor_plan_layouts_updated_at BEFORE UPDATE ON public.floor_plan_layouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_opening_inventory_updated_at BEFORE UPDATE ON public.opening_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tech_stack_items_updated_at BEFORE UPDATE ON public.tech_stack_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_soft_opening_events_updated_at BEFORE UPDATE ON public.soft_opening_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_utilities_accounts_updated_at BEFORE UPDATE ON public.utilities_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_insurance_policies_updated_at BEFORE UPDATE ON public.insurance_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_uniform_items_updated_at BEFORE UPDATE ON public.uniform_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_safety_audit_items_updated_at BEFORE UPDATE ON public.safety_audit_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();