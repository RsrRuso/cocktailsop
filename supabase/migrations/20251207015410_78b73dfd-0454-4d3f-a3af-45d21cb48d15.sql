-- GM Command Dashboard Tables

-- Financial metrics and KPIs
CREATE TABLE public.gm_financial_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  outlet_id UUID REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_revenue NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  gross_profit NUMERIC DEFAULT 0,
  gp_percentage NUMERIC DEFAULT 0,
  beverage_cost_percentage NUMERIC DEFAULT 0,
  food_cost_percentage NUMERIC DEFAULT 0,
  labor_cost_percentage NUMERIC DEFAULT 0,
  average_check NUMERIC DEFAULT 0,
  covers INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Approval requests
CREATE TABLE public.gm_approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  outlet_id UUID REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  category TEXT NOT NULL, -- equipment, staffing, supplier, menu, training, brand_activation
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'AED',
  roi_percentage NUMERIC,
  payback_months NUMERIC,
  risk_score TEXT DEFAULT 'medium', -- low, medium, high
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, revision_requested
  ai_recommendation TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Staff performance metrics
CREATE TABLE public.gm_staff_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  staff_member_id UUID NOT NULL,
  outlet_id UUID REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  revenue_contribution NUMERIC DEFAULT 0,
  sales_conversion_rate NUMERIC DEFAULT 0,
  guest_impact_rating NUMERIC DEFAULT 0,
  training_completion_percentage NUMERIC DEFAULT 0,
  upselling_success_rate NUMERIC DEFAULT 0,
  complaints_score NUMERIC DEFAULT 0,
  speed_of_execution NUMERIC DEFAULT 0,
  overall_value_score NUMERIC DEFAULT 0,
  badges JSONB DEFAULT '[]'::jsonb,
  strengths TEXT[],
  weaknesses TEXT[],
  ai_development_plan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Risk alerts
CREATE TABLE public.gm_risk_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  outlet_id UUID REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  risk_type TEXT NOT NULL, -- supplier_dependency, low_shelf_life, negative_gp, employee_inconsistency, service_speed, waste_risk
  severity TEXT DEFAULT 'medium', -- low, medium, high, critical
  title TEXT NOT NULL,
  description TEXT,
  affected_item TEXT,
  potential_cost_impact NUMERIC DEFAULT 0,
  recommended_action TEXT,
  status TEXT DEFAULT 'active', -- active, acknowledged, resolved
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Opportunities
CREATE TABLE public.gm_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  outlet_id UUID REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  opportunity_type TEXT NOT NULL, -- cost_savings, revenue_growth, efficiency, zero_waste
  title TEXT NOT NULL,
  description TEXT,
  projected_savings NUMERIC DEFAULT 0,
  projected_revenue_increase NUMERIC DEFAULT 0,
  implementation_effort TEXT DEFAULT 'medium', -- low, medium, high
  status TEXT DEFAULT 'identified', -- identified, in_progress, implemented, dismissed
  ai_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inventory predictions
CREATE TABLE public.gm_inventory_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  outlet_id UUID REFERENCES public.lab_ops_outlets(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  current_stock NUMERIC DEFAULT 0,
  predicted_shortage_date DATE,
  reorder_recommendation TEXT,
  excess_stock_warning BOOLEAN DEFAULT false,
  waste_risk_value NUMERIC DEFAULT 0,
  ai_suggestion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gm_financial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gm_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gm_staff_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gm_risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gm_inventory_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own financial metrics" ON public.gm_financial_metrics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own approval requests" ON public.gm_approval_requests FOR ALL USING (auth.uid() = user_id OR auth.uid() = requested_by);
CREATE POLICY "Users can manage own staff performance" ON public.gm_staff_performance FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own risk alerts" ON public.gm_risk_alerts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own opportunities" ON public.gm_opportunities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own inventory predictions" ON public.gm_inventory_predictions FOR ALL USING (auth.uid() = user_id);