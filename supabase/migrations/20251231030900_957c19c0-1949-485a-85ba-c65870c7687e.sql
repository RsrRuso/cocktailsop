-- Create supplier document templates table
CREATE TABLE public.supplier_document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID,
  supplier_name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  delimiter TEXT,
  document_type TEXT DEFAULT 'receiving',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_document_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own templates" 
ON public.supplier_document_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" 
ON public.supplier_document_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" 
ON public.supplier_document_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" 
ON public.supplier_document_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_supplier_templates_user_supplier ON public.supplier_document_templates(user_id, supplier_name);
CREATE INDEX idx_supplier_templates_workspace ON public.supplier_document_templates(workspace_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_supplier_templates_updated_at
BEFORE UPDATE ON public.supplier_document_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();