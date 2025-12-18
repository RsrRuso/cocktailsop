import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileText, X, Check, Loader2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface ParsedItem {
  name: string;
  quantity: number;
  brand?: string;
  category?: string;
  expiration_date: string;
  isValid: boolean;
}

interface FIFOReceivingUploadProps {
  userId: string;
  workspaceId?: string;
  stores: any[];
  items: any[];
  onSuccess: () => void;
}

export const FIFOReceivingUpload = ({ userId, workspaceId, stores, items, onSuccess }: FIFOReceivingUploadProps) => {
  const [open, setOpen] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const receivableStores = stores.filter(s => s.store_type === 'receive' || s.store_type === 'both');

  const parseExcelFile = async (file: File) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    return jsonData.map((row: any) => ({
      name: row.name || row.Name || row.item || row.Item || row.product || row.Product || '',
      quantity: parseFloat(row.quantity || row.Quantity || row.qty || row.Qty || '1') || 1,
      brand: row.brand || row.Brand || '',
      category: row.category || row.Category || '',
      expiration_date: '',
      isValid: false,
    })).filter(item => item.name);
  };

  const parsePDFWithAI = async (file: File): Promise<ParsedItem[]> => {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract inventory items from this document. Return a JSON array with objects containing: name, quantity (number), brand (if available), category (if available). Only return the JSON array, nothing else. Example: [{"name": "Vodka Grey Goose", "quantity": 12, "brand": "Grey Goose", "category": "Spirits"}]`
              },
              {
                type: "image_url",
                image_url: { url: base64 }
              }
            ]
          }
        ]
      })
    });

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '[]';
    
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((item: any) => ({
          name: item.name || '',
          quantity: parseFloat(item.quantity) || 1,
          brand: item.brand || '',
          category: item.category || '',
          expiration_date: '',
          isValid: false,
        }));
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
    }
    return [];
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      let parsed: ParsedItem[] = [];

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        parsed = await parseExcelFile(file);
      } else if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        parsed = await parsePDFWithAI(file);
      } else {
        toast.error("Unsupported file format");
        return;
      }

      if (parsed.length === 0) {
        toast.error("No items found in file");
        return;
      }

      setParsedItems(parsed);
      toast.success(`${parsed.length} items parsed`);
    } catch (error: any) {
      toast.error(`Failed to parse file: ${error.message}`);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateItem = (index: number, field: keyof ParsedItem, value: any) => {
    setParsedItems(prev => {
      const updated = [...prev];
      updated[index] = { 
        ...updated[index], 
        [field]: value,
        isValid: field === 'expiration_date' ? !!value : updated[index].isValid
      };
      if (field === 'expiration_date') {
        updated[index].isValid = !!value;
      }
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  };

  const allItemsValid = parsedItems.length > 0 && parsedItems.every(item => item.expiration_date);

  const handleSaveAll = async () => {
    if (!selectedStoreId) {
      toast.error("Please select a store");
      return;
    }

    if (!allItemsValid) {
      toast.error("All items must have expiration dates");
      return;
    }

    setIsSaving(true);
    try {
      let successCount = 0;
      const existingItemsMap = new Map(items.map(i => [i.name.toLowerCase(), i]));

      for (const parsedItem of parsedItems) {
        // Find or create item in master list
        let itemId: string;
        const existingItem = existingItemsMap.get(parsedItem.name.toLowerCase());

        if (existingItem) {
          itemId = existingItem.id;
        } else {
          // Create new item in master list
          const { data: newItem, error: itemError } = await supabase
            .from("fifo_items")
            .insert({
              user_id: userId,
              workspace_id: workspaceId || null,
              name: parsedItem.name,
              brand: parsedItem.brand || null,
              category: parsedItem.category || null,
            })
            .select()
            .single();

          if (itemError) throw itemError;
          itemId = newItem.id;
        }

        // Add to inventory
        const { error: invError } = await supabase.from("fifo_inventory").insert({
          user_id: userId,
          workspace_id: workspaceId || null,
          store_id: selectedStoreId,
          item_id: itemId,
          quantity: parsedItem.quantity,
          expiration_date: parsedItem.expiration_date,
          received_date: new Date().toISOString(),
          status: "available"
        });

        if (invError) throw invError;
        successCount++;
      }

      toast.success(`${successCount} items received successfully`);
      setParsedItems([]);
      setSelectedStoreId("");
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setParsedItems([]);
    setSelectedStoreId("");
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Upload className="w-3 h-3 mr-2" />
          Bulk Upload List
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="text-base">Bulk Receive Items</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4 pt-2 gap-3">
          {/* Store Selection */}
          <div>
            <Label className="text-xs">Receive to Store *</Label>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select store..." />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-popover border z-[100]">
                {receivableStores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name} {store.store_type === 'receive' ? '📥' : '🔄'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          {parsedItems.length === 0 && (
            <div 
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Parsing file...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Upload PDF, Excel, CSV, or Image</p>
                  <p className="text-xs text-muted-foreground">Click to browse or drag & drop</p>
                </div>
              )}
            </div>
          )}

          {/* Parsed Items List */}
          {parsedItems.length > 0 && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{parsedItems.length} items</Badge>
                  <Badge variant={allItemsValid ? "default" : "destructive"} className="text-xs">
                    {parsedItems.filter(i => i.expiration_date).length}/{parsedItems.length} dated
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  Clear All
                </Button>
              </div>

              <ScrollArea className="flex-1 border rounded-md">
                <div className="p-2 space-y-2">
                  {parsedItems.map((item, index) => (
                    <Card key={index} className={`${item.expiration_date ? 'border-green-500/50' : 'border-amber-500/50'}`}>
                      <CardContent className="p-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {item.brand && <span>{item.brand}</span>}
                              <span>Qty: {item.quantity}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => removeItem(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                          <Input
                            type="date"
                            value={item.expiration_date}
                            onChange={(e) => updateItem(index, 'expiration_date', e.target.value)}
                            className={`h-7 text-xs flex-1 ${!item.expiration_date ? 'border-amber-500' : ''}`}
                            placeholder="Set expiry date"
                          />
                          {item.expiration_date && (
                            <Check className="h-4 w-4 text-green-500 shrink-0" />
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                            className="h-7 text-xs w-20"
                            placeholder="Qty"
                          />
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(index, 'name', e.target.value)}
                            className="h-7 text-xs flex-1"
                            placeholder="Item name"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              {/* Save Button */}
              <div className="pt-3 border-t mt-3">
                <Button 
                  onClick={handleSaveAll} 
                  disabled={!allItemsValid || !selectedStoreId || isSaving}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save {parsedItems.length} Items
                    </>
                  )}
                </Button>
                {!allItemsValid && parsedItems.length > 0 && (
                  <p className="text-xs text-amber-500 text-center mt-1">
                    Set expiration dates for all items to save
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
