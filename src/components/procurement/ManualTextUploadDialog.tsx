import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, ArrowRight, Save, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ParsedItem {
  item_code: string;
  item_name: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  selected: boolean;
}

interface ManualTextUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmSave: (data: {
    docNumber: string;
    supplier: string;
    items: ParsedItem[];
  }) => Promise<void>;
  currencySymbol: string;
}

export const ManualTextUploadDialog = ({
  open,
  onOpenChange,
  onConfirmSave,
  currencySymbol
}: ManualTextUploadDialogProps) => {
  const [step, setStep] = useState<'paste' | 'map' | 'review'>('paste');
  const [rawText, setRawText] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [delimiter, setDelimiter] = useState<'tab' | 'comma' | 'semicolon' | 'space'>('tab');
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<{
    code: number;
    name: number;
    qty: number;
    unit: number;
    price: number;
  }>({ code: 0, name: 1, qty: 2, unit: 3, price: 4 });
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-detect delimiter from text
  const detectDelimiter = (text: string): 'tab' | 'comma' | 'semicolon' | 'space' => {
    const firstLine = text.split('\n')[0] || '';
    if (firstLine.includes('\t')) return 'tab';
    if (firstLine.includes(';')) return 'semicolon';
    if (firstLine.includes(',')) return 'comma';
    if (/\s{2,}/.test(firstLine)) return 'space';
    return 'tab';
  };

  const parseWithDelimiter = (text: string, delim: 'tab' | 'comma' | 'semicolon' | 'space'): string[][] => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    
    return lines.map(line => {
      switch (delim) {
        case 'tab':
          return line.split('\t').map(cell => cell.trim()).filter(c => c);
        case 'comma':
          return line.split(',').map(cell => cell.trim()).filter(c => c);
        case 'semicolon':
          return line.split(';').map(cell => cell.trim()).filter(c => c);
        case 'space':
          // Split by 2+ spaces or use intelligent splitting
          const spaceSplit = line.split(/\s{2,}/).map(cell => cell.trim()).filter(c => c);
          if (spaceSplit.length > 1) return spaceSplit;
          // Fallback: split by single space but try to keep names together
          return line.split(/\s+/).map(cell => cell.trim()).filter(c => c);
        default:
          return [line.trim()];
      }
    });
  };

  // Parse raw text into rows
  const handleParseText = () => {
    if (!rawText.trim()) {
      toast.error("Please paste some text first");
      return;
    }

    // Auto-detect delimiter if current one produces only 1 column
    let bestDelimiter = delimiter;
    let bestRows = parseWithDelimiter(rawText, delimiter);
    const maxColsWithCurrent = Math.max(...bestRows.map(r => r.length), 0);
    
    if (maxColsWithCurrent <= 1) {
      // Try to auto-detect a better delimiter
      const detected = detectDelimiter(rawText);
      const detectedRows = parseWithDelimiter(rawText, detected);
      const detectedMaxCols = Math.max(...detectedRows.map(r => r.length), 0);
      
      if (detectedMaxCols > maxColsWithCurrent) {
        bestDelimiter = detected;
        bestRows = detectedRows;
        setDelimiter(detected);
        toast.info(`Auto-detected "${detected}" delimiter`);
      }
    }

    if (bestRows.length === 0) {
      toast.error("No data found in the pasted text");
      return;
    }

    setParsedRows(bestRows);
    
    const maxCols = Math.max(...bestRows.map(r => r.length), 0);
    if (maxCols >= 5) {
      setColumnMap({ code: 0, name: 1, qty: 2, unit: 3, price: 4 });
    } else if (maxCols >= 3) {
      setColumnMap({ code: 0, name: 1, qty: 2, unit: -1, price: -1 });
    } else if (maxCols >= 2) {
      setColumnMap({ code: -1, name: 0, qty: 1, unit: -1, price: -1 });
    } else {
      setColumnMap({ code: -1, name: 0, qty: -1, unit: -1, price: -1 });
    }
    
    setStep('map');
    toast.success(`Found ${bestRows.length} rows with ${maxCols} columns`);
  };

  // Apply column mapping and create items
  const handleApplyMapping = () => {
    const mapped: ParsedItem[] = [];
    
    for (const row of parsedRows) {
      const itemName = columnMap.name >= 0 ? (row[columnMap.name] || '').trim() : '';
      if (!itemName) continue; // Skip rows without item name
      
      const qty = columnMap.qty >= 0 ? parseFloat(row[columnMap.qty]?.replace(/[^\d.-]/g, '') || '0') : 0;
      const price = columnMap.price >= 0 ? parseFloat(row[columnMap.price]?.replace(/[^\d.-]/g, '') || '0') : 0;
      
      mapped.push({
        item_code: columnMap.code >= 0 ? (row[columnMap.code] || '').trim() : '',
        item_name: itemName,
        quantity: qty || 1,
        unit: columnMap.unit >= 0 ? (row[columnMap.unit] || 'EA').trim() : 'EA',
        price: price,
        total: (qty || 1) * price,
        selected: true
      });
    }

    if (mapped.length === 0) {
      toast.error("No valid items found. Check your column mapping.");
      return;
    }

    // Sum quantities for duplicate items (by code or name)
    const consolidated = new Map<string, ParsedItem>();
    for (const item of mapped) {
      const key = item.item_code || item.item_name.toLowerCase();
      const existing = consolidated.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total = existing.quantity * existing.price;
      } else {
        consolidated.set(key, { ...item });
      }
    }

    setItems(Array.from(consolidated.values()));
    setStep('review');
    toast.success(`Mapped ${consolidated.size} unique items`);
  };

  const toggleItem = (index: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, selected: !item.selected } : item
    ));
  };

  const updateItem = (index: number, field: keyof ParsedItem, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'price') {
        updated.total = updated.quantity * updated.price;
      }
      return updated;
    }));
  };

  const handleSave = async () => {
    const selectedItems = items.filter(i => i.selected);
    if (selectedItems.length === 0) {
      toast.error("No items selected");
      return;
    }
    if (!docNumber.trim()) {
      toast.error("Please enter a document number");
      return;
    }

    setIsSaving(true);
    try {
      await onConfirmSave({
        docNumber: docNumber.trim(),
        supplier: supplier.trim() || 'Manual Entry',
        items: selectedItems
      });
      
      // Reset and close
      setStep('paste');
      setRawText("");
      setDocNumber("");
      setSupplier("");
      setParsedRows([]);
      setItems([]);
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const stats = useMemo(() => {
    const selected = items.filter(i => i.selected);
    return {
      total: items.length,
      selected: selected.length,
      totalQty: selected.reduce((sum, i) => sum + i.quantity, 0),
      totalValue: selected.reduce((sum, i) => sum + i.total, 0)
    };
  }, [items]);

  const columnOptions = parsedRows.length > 0 
    ? Array.from({ length: Math.max(...parsedRows.map(r => r.length)) }, (_, i) => i)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Manual Text Upload
            <Badge variant="outline" className="ml-2">
              Step {step === 'paste' ? '1' : step === 'map' ? '2' : '3'} of 3
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {step === 'paste' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Document Number *</Label>
                <Input
                  placeholder="e.g. TR2506479, ML12345"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                />
              </div>
              <div>
                <Label>Supplier/Location</Label>
                <Input
                  placeholder="e.g. Beverage Store"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Delimiter</Label>
              <Select value={delimiter} onValueChange={(v: any) => setDelimiter(v)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tab">Tab (spreadsheet copy)</SelectItem>
                  <SelectItem value="comma">Comma (CSV)</SelectItem>
                  <SelectItem value="semicolon">Semicolon</SelectItem>
                  <SelectItem value="space">Multiple Spaces</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Paste Document Text</Label>
              <Textarea
                placeholder="Paste your document text here...&#10;&#10;Example:&#10;22080006	Hendricks Gin 700Ml	24	BOT	210.15&#10;22100008	Baileys Irish Cream 750Ml	1	BOT	258.03"
                className="min-h-[300px] font-mono text-sm"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <Card className="p-4">
              <h4 className="font-medium mb-3">Column Mapping</h4>
              <div className="grid grid-cols-5 gap-3">
                {['Item Code', 'Item Name *', 'Quantity *', 'Unit', 'Price'].map((label, idx) => {
                  const field = ['code', 'name', 'qty', 'unit', 'price'][idx] as keyof typeof columnMap;
                  return (
                    <div key={field}>
                      <Label className="text-xs">{label}</Label>
                      <Select 
                        value={columnMap[field].toString()} 
                        onValueChange={(v) => setColumnMap(prev => ({ ...prev, [field]: parseInt(v) }))}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-1">None</SelectItem>
                          {columnOptions.map(i => (
                            <SelectItem key={i} value={i.toString()}>Column {i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-sm font-medium">
                Preview (first 5 rows)
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columnOptions.map(i => (
                        <TableHead key={i} className="text-xs whitespace-nowrap">
                          Col {i + 1}
                          {columnMap.code === i && <Badge className="ml-1 text-[10px]">Code</Badge>}
                          {columnMap.name === i && <Badge className="ml-1 text-[10px]">Name</Badge>}
                          {columnMap.qty === i && <Badge className="ml-1 text-[10px]">Qty</Badge>}
                          {columnMap.unit === i && <Badge className="ml-1 text-[10px]">Unit</Badge>}
                          {columnMap.price === i && <Badge className="ml-1 text-[10px]">Price</Badge>}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 5).map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        {columnOptions.map(colIdx => (
                          <TableCell key={colIdx} className="text-xs py-1">
                            {row[colIdx] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold">{stats.selected}</div>
                <div className="text-xs text-muted-foreground">Selected Items</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold">{stats.totalQty}</div>
                <div className="text-xs text-muted-foreground">Total Qty</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold">{currencySymbol}{stats.totalValue.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Total Value</div>
              </Card>
              <Card className="p-3 text-center bg-primary/10">
                <div className="text-lg font-bold">{docNumber}</div>
                <div className="text-xs text-muted-foreground">Document</div>
              </Card>
            </div>

            <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">✓</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="w-20">Qty</TableHead>
                    <TableHead className="w-16">Unit</TableHead>
                    <TableHead className="w-24">Price</TableHead>
                    <TableHead className="w-24">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx} className={!item.selected ? 'opacity-50' : ''}>
                      <TableCell>
                        <Checkbox 
                          checked={item.selected} 
                          onCheckedChange={() => toggleItem(idx)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.item_code || '-'}</TableCell>
                      <TableCell className="text-sm">{item.item_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-7 w-16 text-sm"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="text-xs">{item.unit}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-7 w-20 text-sm"
                          value={item.price}
                          onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {currencySymbol}{item.total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {step !== 'paste' && (
            <Button 
              variant="outline" 
              onClick={() => setStep(step === 'review' ? 'map' : 'paste')}
            >
              Back
            </Button>
          )}
          
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>

          {step === 'paste' && (
            <Button onClick={handleParseText} disabled={!rawText.trim() || !docNumber.trim()}>
              Parse Text
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}

          {step === 'map' && (
            <Button onClick={handleApplyMapping}>
              Apply Mapping
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}

          {step === 'review' && (
            <Button onClick={handleSave} disabled={isSaving || stats.selected === 0}>
              <Save className="w-4 h-4 mr-1" />
              {isSaving ? 'Saving...' : `Save ${stats.selected} Items`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
