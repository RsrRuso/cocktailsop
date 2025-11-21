-- Create spot checks table for inventory audits
CREATE TABLE IF NOT EXISTS public.inventory_spot_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  checked_by UUID REFERENCES public.employees(id),
  check_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'flagged')),
  notes TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create spot check items table for detailed item checks
CREATE TABLE IF NOT EXISTS public.spot_check_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_check_id UUID REFERENCES public.inventory_spot_checks(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.items(id),
  expected_quantity NUMERIC,
  actual_quantity NUMERIC,
  variance NUMERIC GENERATED ALWAYS AS (actual_quantity - expected_quantity) STORED,
  variance_percentage NUMERIC,
  reason TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create variance reports table
CREATE TABLE IF NOT EXISTS public.variance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id),
  user_id UUID NOT NULL,
  report_date DATE DEFAULT CURRENT_DATE,
  total_variance_value NUMERIC DEFAULT 0,
  total_items_checked INTEGER DEFAULT 0,
  items_with_variance INTEGER DEFAULT 0,
  report_data JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workspace member permissions table for granular access control
CREATE TABLE IF NOT EXISTS public.workspace_member_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_member_id UUID REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  can_transfer BOOLEAN DEFAULT false,
  can_receive BOOLEAN DEFAULT false,
  can_spot_check BOOLEAN DEFAULT false,
  can_approve_transfers BOOLEAN DEFAULT false,
  can_manage_members BOOLEAN DEFAULT false,
  can_view_reports BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.inventory_spot_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_check_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_member_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for spot checks
CREATE POLICY "Users can view spot checks in their workspaces"
  ON public.inventory_spot_checks FOR SELECT
  USING (
    (workspace_id IS NULL AND user_id = auth.uid()) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can create spot checks in their workspaces"
  ON public.inventory_spot_checks FOR INSERT
  WITH CHECK (
    (workspace_id IS NULL AND user_id = auth.uid()) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can update spot checks in their workspaces"
  ON public.inventory_spot_checks FOR UPDATE
  USING (
    (workspace_id IS NULL AND user_id = auth.uid()) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

-- RLS Policies for spot check items
CREATE POLICY "Users can view spot check items"
  ON public.spot_check_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inventory_spot_checks
      WHERE id = spot_check_items.spot_check_id
      AND (
        (workspace_id IS NULL AND user_id = auth.uid()) OR
        (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
      )
    )
  );

CREATE POLICY "Users can create spot check items"
  ON public.spot_check_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inventory_spot_checks
      WHERE id = spot_check_items.spot_check_id
      AND (
        (workspace_id IS NULL AND user_id = auth.uid()) OR
        (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
      )
    )
  );

-- RLS Policies for variance reports
CREATE POLICY "Users can view variance reports in their workspaces"
  ON public.variance_reports FOR SELECT
  USING (
    (workspace_id IS NULL AND user_id = auth.uid()) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "Users can create variance reports in their workspaces"
  ON public.variance_reports FOR INSERT
  WITH CHECK (
    (workspace_id IS NULL AND user_id = auth.uid()) OR
    (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

-- RLS Policies for permissions
CREATE POLICY "Users can view permissions in their workspaces"
  ON public.workspace_member_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.id = workspace_member_permissions.workspace_member_id
      AND is_workspace_member(auth.uid(), wm.workspace_id)
    )
  );

CREATE POLICY "Workspace owners can manage permissions"
  ON public.workspace_member_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      JOIN public.workspaces w ON w.id = wm.workspace_id
      WHERE wm.id = workspace_member_permissions.workspace_member_id
      AND w.owner_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_spot_checks_workspace ON public.inventory_spot_checks(workspace_id);
CREATE INDEX idx_spot_checks_store ON public.inventory_spot_checks(store_id);
CREATE INDEX idx_spot_checks_date ON public.inventory_spot_checks(check_date);
CREATE INDEX idx_spot_check_items_spot_check ON public.spot_check_items(spot_check_id);
CREATE INDEX idx_variance_reports_workspace ON public.variance_reports(workspace_id);
CREATE INDEX idx_variance_reports_date ON public.variance_reports(report_date);

-- Add realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_spot_checks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.spot_check_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.variance_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_member_permissions;