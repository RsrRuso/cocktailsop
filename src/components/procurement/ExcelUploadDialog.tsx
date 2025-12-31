import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileSpreadsheet, Upload, ArrowRight, Save, X, ShoppingCart, Wrench, Wine, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";

interface ParsedItem {
  item_code: string;
  item_name: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  selected: boolean;
}

interface ExcelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmSave: (data: {
    docNumber: string;
    supplier: string;
    orderDate?: string;
    items: ParsedItem[];
  }) => Promise<void>;
  currencySymbol: string;
  type: 'po' | 'receiving';
}

export const ExcelUploadDialog = ({
  open,
  onOpenChange,
  onConfirmSave,
  currencySymbol,
  type
}: ExcelUploadDialogProps) => {
  const [step, setStep] = useState<'upload' | 'map' | 'review'>('upload');
  const [docNumber, setDocNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<{
    code: number;
    name: number;
    qty: number;
    unit: number;
    price: number;
  }>({ code: 0, name: 1, qty: 2, unit: 3, price: 4 });
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [workbookData, setWorkbookData] = useState<any>(null);
  const [fileName, setFileName] = useState("");

  // Detect document type from code
  const docType = useMemo(() => {
    const code = docNumber.toUpperCase();
    if (code.startsWith('TR') || code.includes('-TR')) return 'transfer';
    if (code.startsWith('ML') || code.includes('-ML')) return 'market';
    if (code.startsWith('RQ') || code.includes('-RQ')) return 'material';
    return 'unknown';
  }, [docNumber]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);

    try {
      const { read, utils } = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = read(arrayBuffer, { type: 'array' });
      
      setWorkbookData(workbook);
      setSheetNames(workbook.SheetNames);
      
      if (workbook.SheetNames.length > 0) {
        const firstSheet = workbook.SheetNames[0];
        setSelectedSheet(firstSheet);
        loadSheet(workbook, firstSheet, utils);
      }
      
      toast.success(`Loaded ${file.name}`);
    } catch (error: any) {
      console.error('Excel parse error:', error);
      toast.error("Failed to parse Excel file: " + error.message);
    }
  }, []);

  const loadSheet = (workbook: any, sheetName: string, utils: any) => {
    const sheet = workbook.Sheets[sheetName];
    const data: string[][] = utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    if (data.length === 0) {
      toast.error("Sheet is empty");
      return;
    }

    // First row as headers
    const headerRow = data[0].map(String);
    setHeaders(headerRow);
    
    // Rest as data
    setParsedRows(data.slice(1).filter(row => row.some(cell => String(cell).trim())));
    
    // Auto-detect column mapping based on headers
    const lowerHeaders = headerRow.map(h => h.toLowerCase());
    const newMap = { code: -1, name: -1, qty: -1, unit: -1, price: -1 };
    
    lowerHeaders.forEach((h, i) => {
      // Item code - specifically match code-related headers but NOT name headers
      if ((h.includes('code') || h.includes('sku') || h.includes('itemcode')) && !h.includes('name')) {
        if (newMap.code === -1) newMap.code = i;
      }
      // Item name - match name headers but NOT code headers
      if ((h.includes('name') || h.includes('description') || h.includes('itemname')) && !h.includes('code')) {
        if (newMap.name === -1) newMap.name = i;
      }
      // Fallback for generic 'item' or 'product' headers only if we haven't found name yet
      if (newMap.name === -1 && (h === 'item' || h === 'product' || h.includes('product'))) {
        newMap.name = i;
      }
      if (h.includes('qty') || h.includes('quantity') || h.includes('count')) {
        if (newMap.qty === -1) newMap.qty = i;
      }
      if (h.includes('unit') || h.includes('uom') || h.includes('measure')) {
        if (newMap.unit === -1) newMap.unit = i;
      }
      if (h.includes('price') || h.includes('cost') || h.includes('rate')) {
        if (newMap.price === -1) newMap.price = i;
      }
    });

    // Fallback: if name not found, use column 1
    if (newMap.name === -1 && headerRow.length > 0) {
      newMap.name = headerRow.length > 1 ? 1 : 0;
    }
    if (newMap.qty === -1 && headerRow.length > 2) {
      newMap.qty = 2;
    }

    setColumnMap(newMap);
    setStep('map');
  };

  const handleSheetChange = async (sheetName: string) => {
    if (!workbookData) return;
    setSelectedSheet(sheetName);
    const { utils } = await import('xlsx');
    loadSheet(workbookData, sheetName, utils);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  const handleApplyMapping = () => {
    const mapped: ParsedItem[] = [];
    
    for (const row of parsedRows) {
      const itemName = columnMap.name >= 0 ? String(row[columnMap.name] || '').trim() : '';
      if (!itemName) continue;
      
      const qtyStr = columnMap.qty >= 0 ? String(row[columnMap.qty] || '0') : '0';
      const priceStr = columnMap.price >= 0 ? String(row[columnMap.price] || '0') : '0';
      const qty = parseFloat(qtyStr.replace(/[^\d.-]/g, '') || '0') || 1;
      const price = parseFloat(priceStr.replace(/[^\d.-]/g, '') || '0') || 0;
      
      mapped.push({
        item_code: columnMap.code >= 0 ? String(row[columnMap.code] || '').trim() : '',
        item_name: itemName,
        quantity: qty,
        unit: columnMap.unit >= 0 ? String(row[columnMap.unit] || 'EA').trim() : 'EA',
        price: price,
        total: qty * price,
        selected: true
      });
    }

    if (mapped.length === 0) {
      toast.error("No valid items found. Check your column mapping.");
      return;
    }

    // Sum quantities for duplicate items
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
      toast.error(`Please enter a ${type === 'po' ? 'PO' : 'document'} number`);
      return;
    }

    setIsSaving(true);
    try {
      await onConfirmSave({
        docNumber: docNumber.trim(),
        supplier: supplier.trim() || 'Excel Import',
        orderDate: type === 'po' ? orderDate : undefined,
        items: selectedItems
      });
      
      // Reset and close
      resetState();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetState = () => {
    setStep('upload');
    setDocNumber("");
    setSupplier("");
    setOrderDate(new Date().toISOString().split('T')[0]);
    setSheetNames([]);
    setSelectedSheet("");
    setParsedRows([]);
    setHeaders([]);
    setItems([]);
    setWorkbookData(null);
    setFileName("");
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

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) resetState(); onOpenChange(open); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-500" />
            Excel Upload - {type === 'po' ? 'Purchase Order' : 'Receiving'}
            <Badge variant="outline" className="ml-2">
              Step {step === 'upload' ? '1' : step === 'map' ? '2' : '3'} of 3
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Document Number *</Label>
                <Input
                  placeholder={type === 'po' ? "e.g. ML12345, RQ67890" : "e.g. TR2506479, ML12345"}
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                />
                {docType !== 'unknown' && (
                  <Badge 
                    variant="outline" 
                    className={`mt-1 ${
                      docType === 'market' ? 'bg-blue-500/10 text-blue-500' : 
                      docType === 'material' ? 'bg-orange-500/10 text-orange-500' : 
                      'bg-purple-500/10 text-purple-500'
                    }`}
                  >
                    {docType === 'market' ? <ShoppingCart className="w-3 h-3 mr-1" /> : 
                     docType === 'material' ? <Wrench className="w-3 h-3 mr-1" /> : 
                     <Wine className="w-3 h-3 mr-1" />}
                    {docType === 'market' ? 'Market List' : docType === 'material' ? 'Material Request' : 'Transfer (Spirits)'}
                  </Badge>
                )}
              </div>
              <div>
                <Label>Supplier/Location</Label>
                <Input
                  placeholder="e.g. Fresh Produce Supplier"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />
              </div>
              {type === 'po' && (
                <div>
                  <Label>Order Date</Label>
                  <Input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-green-500/70" />
              {fileName ? (
                <div>
                  <p className="text-lg font-medium text-green-500">{fileName}</p>
                  <p className="text-sm text-muted-foreground">Click or drag to replace</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg mb-2">
                    {isDragActive ? 'Drop the Excel file here...' : 'Drag & drop Excel file here'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse (.xlsx, .xls, .csv)
                  </p>
                </div>
              )}
            </div>

            {sheetNames.length > 1 && (
              <div>
                <Label>Select Sheet</Label>
                <Select value={selectedSheet} onValueChange={handleSheetChange}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sheetNames.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <Card className="p-4">
              <h4 className="font-medium mb-3">Column Mapping</h4>
              <p className="text-sm text-muted-foreground mb-3">Map your Excel columns to the required fields</p>
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
                          {headers.map((h, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {h || `Column ${i + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-sm font-medium flex items-center justify-between">
                <span>Preview (first 5 rows)</span>
                <Badge variant="outline">{parsedRows.length} rows total</Badge>
              </div>
              <div className="overflow-x-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h, i) => (
                        <TableHead key={i} className="text-xs whitespace-nowrap">
                          {h || `Col ${i + 1}`}
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
                        {headers.map((_, colIdx) => (
                          <TableCell key={colIdx} className="text-xs py-1">
                            {String(row[colIdx] || '-')}
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
                <div className="text-xs text-muted-foreground">Items</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold">{stats.totalQty.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Total Qty</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold">{currencySymbol}{stats.totalValue.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Total Value</div>
              </Card>
              <Card className={`p-3 text-center ${
                docType === 'market' ? 'bg-blue-500/10' : 
                docType === 'material' ? 'bg-orange-500/10' : 
                docType === 'transfer' ? 'bg-purple-500/10' : 
                'bg-primary/10'
              }`}>
                <div className="text-lg font-bold">{docNumber}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {docType === 'transfer' ? 'Transfer (Spirits)' : docType !== 'unknown' ? docType : 'Document'}
                </div>
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
          {step !== 'upload' && (
            <Button 
              variant="outline" 
              onClick={() => setStep(step === 'review' ? 'map' : 'upload')}
            >
              Back
            </Button>
          )}
          
          <Button variant="ghost" onClick={() => { resetState(); onOpenChange(false); }}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>

          {step === 'upload' && parsedRows.length > 0 && (
            <Button onClick={() => setStep('map')}>
              Continue
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
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Save {stats.selected} Items
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
