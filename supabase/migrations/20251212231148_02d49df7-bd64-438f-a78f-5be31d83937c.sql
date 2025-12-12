-- Create table for storing document format templates
CREATE TABLE public.po_format_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.procurement_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  format_type TEXT NOT NULL DEFAULT 'purchase_order', -- 'purchase_order' or 'receiving'
  column_mappings JSONB NOT NULL DEFAULT '{}', -- Maps detected columns to standard fields
  sample_headers TEXT[], -- Sample column headers from the template file
  delimiter TEXT, -- For CSV files
  date_format TEXT, -- Expected date format
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_name TEXT,
  created_by_email TEXT
);

-- Enable RLS
ALTER TABLE public.po_format_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own templates" ON public.po_format_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view workspace templates" ON public.po_format_templates
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.procurement_workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own templates" ON public.po_format_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.po_format_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.po_format_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_po_format_templates_updated_at
  BEFORE UPDATE ON public.po_format_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();