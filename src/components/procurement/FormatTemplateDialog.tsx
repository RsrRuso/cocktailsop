import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";
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

export const FormatTemplateDialog = ({
  open,
  onOpenChange,
  workspaceId,
  formatType,
}: FormatTemplateDialogProps) => {
  const { user, profile } = useAuth();
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
      const autoMappings: ColumnMapping[] = headers.map(header => {
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

      setColumnMappings(autoMappings);
      toast.success(`Detected ${headers.length} columns`);
    } catch (error) {
      console.error("Error analyzing file:", error);
      toast.error("Failed to analyze file");
    } finally {
      setIsAnalyzing(false);
    }
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
    setName("");
    setDescription("");
    setDetectedHeaders([]);
    setColumnMappings([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {formatType === 'purchase_order' ? 'PO' : 'Receiving'} Format Templates
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Templates */}
          {templates && templates.length > 0 && (
            <div className="space-y-2">
              <Label>Saved Templates</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {templates.map((template: any) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{template.name}</p>
                      {template.description && (
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {template.sample_headers?.length || 0} columns • {template.currency}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Section */}
          <div className="space-y-4">
            <Label>Create New Template</Label>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'
              }`}
            >
              <input {...getInputProps()} />
              {isAnalyzing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm">Analyzing file...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drop a sample file here or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CSV, TXT, XLS, XLSX supported
                  </p>
                </div>
              )}
            </div>

            {/* Detected Headers and Mapping */}
            {detectedHeaders.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Template Name *</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Market List Format"
                    />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
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
                </div>

                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this format..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Column Mappings</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Map each column from your file to the appropriate field
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {columnMappings.map((mapping, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-muted/30 rounded"
                      >
                        <div className="flex-1 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium truncate">
                            {mapping.sourceColumn}
                          </span>
                        </div>
                        <span className="text-muted-foreground">→</span>
                        <Select
                          value={mapping.targetField}
                          onValueChange={(v) => updateMapping(index, v)}
                        >
                          <SelectTrigger className="w-40">
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
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetForm}>
                    Reset
                  </Button>
                  <Button onClick={saveTemplate} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Template
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
