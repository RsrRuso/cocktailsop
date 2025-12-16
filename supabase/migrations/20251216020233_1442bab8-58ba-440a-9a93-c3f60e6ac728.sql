-- Create procurement staff table for PIN-based access
CREATE TABLE public.procurement_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.procurement_workspaces(id) ON DELETE CASCADE,
  user_id UUID,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff', -- 'admin', 'po_staff', 'receiving_staff', 'staff'
  pin_code TEXT NOT NULL,
  permissions JSONB DEFAULT '{"can_create_po": true, "can_receive": true}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.procurement_staff ENABLE ROW LEVEL SECURITY;

-- Allow PIN verification for procurement staff login (anonymous access for PIN check)
CREATE POLICY "Allow PIN verification for procurement staff login"
ON public.procurement_staff
FOR SELECT
USING (true);

-- Allow workspace admins to manage staff
CREATE POLICY "Workspace admins can manage procurement staff"
ON public.procurement_staff
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.procurement_workspace_members pwm
    WHERE pwm.workspace_id = procurement_staff.workspace_id
    AND pwm.user_id = auth.uid()
    AND pwm.role = 'admin'
  )
);

-- Create index for faster PIN lookups
CREATE INDEX idx_procurement_staff_pin_lookup ON public.procurement_staff(workspace_id, pin_code, is_active);