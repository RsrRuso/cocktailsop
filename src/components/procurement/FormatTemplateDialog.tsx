import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Trash2, Loader2, Plus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface FormatTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string;
  formatType: 'purchase_order' | 'receiving';
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

const TARGET_FIELDS = [
  { value: 'item_code', label: 'Item Code' },
  { value: 'item_name', label: 'Item Name' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'unit', label: 'Unit' },
  { value: 'unit_price', label: 'Unit Price' },
  { value: 'total_value', label: 'Total Value' },
  { value: 'delivery_date', label: 'Delivery Date' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'document_number', label: 'Document Number' },
  { value: 'document_date', label: 'Document Date' },
  { value: 'location', label: 'Location' },
  { value: 'ignore', label: '-- Ignore --' },
];

type Step = 'select' | 'name' | 'upload' | 'mapping';

export const FormatTemplateDialog = ({
  open,
  onOpenChange,
  workspaceId,
  formatType,
}: FormatTemplateDialogProps) => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<Step>('select');
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [delimiter, setDelimiter] = useState(",");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [currency, setCurrency] = useState("USD");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch existing templates
  const { data: templates, refetch: refetchTemplates } = useQuery({
    queryKey: ['format-templates', workspaceId, formatType],
    queryFn: async () => {
      let query = supabase
        .from('po_format_templates')
        .select('*')
        .eq('format_type', formatType)
        .order('created_at', { ascending: false });

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      } else {
        query = query.eq('user_id', user?.id || '');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const analyzeFile = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      
      // Handle PDF files - use default columns since client-side PDF parsing is unreliable
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        toast.info("PDF detected - using standard PO columns");
        const defaultHeaders = ['Item Code', 'Item Name', 'Quantity', 'Unit', 'Unit Price', 'Total Value'];
        setDetectedHeaders(defaultHeaders);
        setColumnMappings(createAutoMappings(defaultHeaders));
        setStep('mapping');
        toast.success("Standard PO columns added. Adjust mappings as needed.");
        return;
      }
      
      // Handle image files (JPG, PNG)
      if (fileType.startsWith('image/') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) {
        toast.info("Image detected - using standard PO columns");
        const defaultHeaders = ['Item Code', 'Item Name', 'Quantity', 'Unit', 'Unit Price', 'Total Value'];
        setDetectedHeaders(defaultHeaders);
        setColumnMappings(createAutoMappings(defaultHeaders));
        setStep('mapping');
        toast.success("Standard PO columns added. Adjust mappings as needed.");
        return;
      }
      
      // Handle text-based files (CSV, TXT, Excel)
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      
      if (lines.length === 0) {
        toast.error("File is empty");
        return;
      }

      // Detect delimiter
      const firstLine = lines[0];
      let detectedDelimiter = ",";
      if (firstLine.includes('\t')) {
        detectedDelimiter = '\t';
      } else if (firstLine.includes(';')) {
        detectedDelimiter = ';';
      } else if (firstLine.includes('|')) {
        detectedDelimiter = '|';
      }
      setDelimiter(detectedDelimiter);

      // Parse headers
      const headers = firstLine.split(detectedDelimiter).map(h => h.trim().replace(/"/g, ''));
      setDetectedHeaders(headers);

      // Auto-map common column names
      const autoMappings = createAutoMappings(headers);
      setColumnMappings(autoMappings);
      setStep('mapping');
      toast.success(`Detected ${headers.length} columns`);
    } catch (error) {
      console.error("Error analyzing file:", error);
      toast.error("Failed to analyze file");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const createAutoMappings = (headers: string[]): ColumnMapping[] => {
    return headers.map(header => {
      const lowerHeader = header.toLowerCase();
      let targetField = 'ignore';

      if (lowerHeader.includes('item') && lowerHeader.includes('code')) {
        targetField = 'item_code';
      } else if (lowerHeader.includes('item') && lowerHeader.includes('name') || lowerHeader === 'item' || lowerHeader === 'description') {
        targetField = 'item_name';
      } else if (lowerHeader.includes('qty') || lowerHeader === 'quantity') {
        targetField = 'quantity';
      } else if (lowerHeader === 'unit' || lowerHeader.includes('uom')) {
        targetField = 'unit';
      } else if (lowerHeader.includes('price') || lowerHeader.includes('cost')) {
        targetField = 'unit_price';
      } else if (lowerHeader.includes('value') || lowerHeader.includes('total') || lowerHeader.includes('amount')) {
        targetField = 'total_value';
      } else if (lowerHeader.includes('delivery') || lowerHeader.includes('date')) {
        targetField = 'delivery_date';
      } else if (lowerHeader.includes('supplier') || lowerHeader.includes('vendor')) {
        targetField = 'supplier';
      } else if ((lowerHeader.includes('doc') && lowerHeader.includes('no')) || (lowerHeader.includes('po') && lowerHeader.includes('no'))) {
        targetField = 'document_number';
      } else if (lowerHeader.includes('location') || lowerHeader.includes('locn')) {
        targetField = 'location';
      }

      return { sourceColumn: header, targetField };
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      analyzeFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
  });

  const updateMapping = (index: number, targetField: string) => {
    setColumnMappings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], targetField };
      return updated;
    });
  };

  const saveTemplate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (detectedHeaders.length === 0) {
      toast.error("Please upload a sample file first");
      return;
    }

    setIsSaving(true);
    try {
      const mappingsObj = columnMappings.reduce((acc, m) => {
        if (m.targetField !== 'ignore') {
          acc[m.sourceColumn] = m.targetField;
        }
        return acc;
      }, {} as Record<string, string>);

      const { error } = await supabase.from('po_format_templates').insert({
        user_id: user?.id,
        workspace_id: workspaceId || null,
        name: name.trim(),
        description: description.trim() || null,
        format_type: formatType,
        column_mappings: mappingsObj,
        sample_headers: detectedHeaders,
        delimiter,
        date_format: dateFormat,
        currency,
        created_by_name: profile?.full_name || profile?.username || null,
        created_by_email: profile?.email || user?.email || null,
      });

      if (error) throw error;

      toast.success("Format template saved!");
      refetchTemplates();
      resetForm();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('po_format_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      toast.success("Template deleted");
      refetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const resetForm = () => {
    setStep('select');
    setName("");
    setDescription("");
    setDetectedHeaders([]);
    setColumnMappings([]);
  };

  const handleCreateNew = () => {
    setStep('name');
  };

  const handleNameSubmit = () => {
    if (!name.trim()) {
      toast.error("Please enter a format name");
      return;
    }
    setStep('upload');
  };

  const renderStep = () => {
    switch (step) {
      case 'select':
        return (
          <div className="space-y-4">
            {/* Existing Templates */}
            {templates && templates.length > 0 ? (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Your Format Templates</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {templates.map((template: any) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/50 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          {template.description && (
                            <p className="text-xs text-muted-foreground">{template.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {template.sample_headers?.length || 0} columns • {template.currency}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTemplate(template.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No format templates yet</p>
                <p className="text-sm">Create your first template to get started</p>
              </div>
            )}

            {/* Create New Button */}
            <Button 
              onClick={handleCreateNew} 
              className="w-full h-12"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Format Template
            </Button>
          </div>
        );

      case 'name':
        return (
          <div className="space-y-6">
            <div className="text-center pb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Name Your Format</h3>
              <p className="text-sm text-muted-foreground">
                Give this format a recognizable name
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Format Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Market List, Supplier Invoice, METRO Order"
                  className="h-12 text-base"
                  autoFocus
                />
              </div>

              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe when to use this format..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="AED">AED (د.إ)</SelectItem>
                      <SelectItem value="AUD">AUD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date Format</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('select')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleNameSubmit} className="flex-1">
                Next: Upload Sample
              </Button>
            </div>
          </div>
        );

      case 'upload':
        return (
          <div className="space-y-6">
            <div className="text-center pb-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
                <Check className="h-4 w-4" />
                {name}
              </div>
              <h3 className="text-lg font-semibold">Upload Sample File</h3>
              <p className="text-sm text-muted-foreground">
                Upload a sample file to detect the column structure
              </p>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-muted-foreground/30 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              {isAnalyzing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="font-medium">Analyzing file...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Drop a sample file here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {['CSV', 'TXT', 'XLS', 'XLSX', 'PDF', 'JPG', 'PNG'].map(ext => (
                      <span key={ext} className="px-2 py-1 bg-muted rounded text-xs font-medium">
                        {ext}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button variant="outline" onClick={() => setStep('name')} className="w-full">
              Back
            </Button>
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{name}</h3>
                <p className="text-sm text-muted-foreground">
                  Map columns to fields
                </p>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                {detectedHeaders.length} columns
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {columnMappings.map((mapping, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {mapping.sourceColumn}
                    </span>
                  </div>
                  <span className="text-muted-foreground flex-shrink-0">→</span>
                  <Select
                    value={mapping.targetField}
                    onValueChange={(v) => updateMapping(index, v)}
                  >
                    <SelectTrigger className="w-36 flex-shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                Cancel
              </Button>
              <Button onClick={saveTemplate} disabled={isSaving} className="flex-1">
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Template
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {formatType === 'purchase_order' ? 'PO' : 'Receiving'} Format Templates
          </DialogTitle>
        </DialogHeader>

        {renderStep()}
      </DialogContent>
    </Dialog>
  );
};
