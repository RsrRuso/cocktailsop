import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, XCircle, AlertTriangle, Package, ShoppingCart, 
  Wrench, FileText, Save, X, Download, Filter
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface ParsedReceivingItem {
  item_code: string;
  item_name: string;
  unit?: string;
  quantity: number;
  price_per_unit: number;
  price_total: number;
  delivery_date?: string;
  // Enhanced fields
  isReceived: boolean;
  documentType: 'market' | 'material' | 'unknown';
  matchedInPO: boolean;
  matchedPOItem?: any;
}

export interface EnhancedReceivingData {
  doc_no: string;
  doc_date?: string;
  location?: string;
  items: ParsedReceivingItem[];
  documentType: 'market' | 'material' | 'mixed';
}

interface EnhancedReceivingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivingData: EnhancedReceivingData | null;
  onConfirmSave: (items: ParsedReceivingItem[]) => Promise<void>;
  currencySymbol: string;
}

export const EnhancedReceivingDialog = ({
  open,
  onOpenChange,
  receivingData,
  onConfirmSave,
  currencySymbol
}: EnhancedReceivingDialogProps) => {
  const [items, setItems] = useState<ParsedReceivingItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'market' | 'material'>('all');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize items when dialog opens with new data
  useMemo(() => {
    if (receivingData?.items) {
      setItems(receivingData.items.map(item => ({
        ...item,
        isReceived: item.matchedInPO // Auto-tick if matched in PO
      })));
    }
  }, [receivingData]);

  const toggleItemReceived = (index: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, isReceived: !item.isReceived } : item
    ));
  };

  const toggleAll = (received: boolean) => {
    setItems(prev => prev.map(item => ({
      ...item,
      isReceived: received // Toggle all items, not just matched
    })));
  };

  // Filter items by type
  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(item => item.documentType === filter);
  }, [items, filter]);

  // Calculate stats
  const stats = useMemo(() => {
    const marketItems = items.filter(i => i.documentType === 'market');
    const materialItems = items.filter(i => i.documentType === 'material');
    
    const receivedItems = items.filter(i => i.isReceived);
    const missingItems = items.filter(i => !i.isReceived && i.matchedInPO);
    const unmatchedItems = items.filter(i => !i.matchedInPO);
    
    const receivedMarket = marketItems.filter(i => i.isReceived);
    const receivedMaterial = materialItems.filter(i => i.isReceived);
    
    return {
      total: items.length,
      received: receivedItems.length,
      missing: missingItems.length,
      unmatched: unmatchedItems.length,
      
      marketCount: marketItems.length,
      materialCount: materialItems.length,
      
      marketReceivedCount: receivedMarket.length,
      materialReceivedCount: receivedMaterial.length,
      
      totalValue: items.reduce((sum, i) => sum + (i.isReceived ? i.price_total : 0), 0),
      marketValue: receivedMarket.reduce((sum, i) => sum + i.price_total, 0),
      materialValue: receivedMaterial.reduce((sum, i) => sum + i.price_total, 0),
      
      totalAllValue: items.reduce((sum, i) => sum + i.price_total, 0),
      receivedValue: receivedItems.reduce((sum, i) => sum + i.price_total, 0),
      missingValue: missingItems.reduce((sum, i) => sum + i.price_total, 0)
    };
  }, [items]);

  const handleSave = async () => {
    const receivedItems = items.filter(i => i.isReceived);
    if (receivedItems.length === 0) {
      toast.error("No items marked as received");
      return;
    }
    
    setIsSaving(true);
    try {
      await onConfirmSave(receivedItems);
      toast.success(`Saved ${receivedItems.length} received items`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadReport = () => {
    if (!receivingData) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Receiving Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Document: ${receivingData.doc_no || 'N/A'}`, 14, 35);
    doc.text(`Date: ${format(new Date(), 'PPpp')}`, 14, 42);
    doc.text(`Type: ${receivingData.documentType.toUpperCase()}`, 14, 49);
    
    // Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, 62);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Items: ${stats.total}`, 14, 70);
    doc.text(`Received: ${stats.received}`, 14, 77);
    doc.text(`Missing: ${stats.missing}`, 14, 84);
    doc.text(`Unmatched (Rejected): ${stats.unmatched}`, 14, 91);
    
    doc.text(`Market Items: ${stats.marketReceivedCount}/${stats.marketCount} (${currencySymbol}${stats.marketValue.toFixed(2)})`, 100, 70);
    doc.text(`Material Items: ${stats.materialReceivedCount}/${stats.materialCount} (${currencySymbol}${stats.materialValue.toFixed(2)})`, 100, 77);
    doc.text(`Total Value: ${currencySymbol}${stats.receivedValue.toFixed(2)}`, 100, 84);
    
    // Received Items Table
    const receivedItems = items.filter(i => i.isReceived);
    if (receivedItems.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Received Items', 14, 105);
      
      autoTable(doc, {
        startY: 110,
        head: [['Code', 'Item', 'Type', 'Qty', 'Unit Price', 'Total']],
        body: receivedItems.map(item => [
          item.item_code || '-',
          item.item_name,
          item.documentType === 'market' ? 'Market (ML)' : item.documentType === 'material' ? 'Material (RQ)' : 'Unknown',
          item.quantity.toString(),
          `${currencySymbol}${item.price_per_unit.toFixed(2)}`,
          `${currencySymbol}${item.price_total.toFixed(2)}`
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 197, 94] }
      });
    }
    
    // Missing Items Table
    const missingItems = items.filter(i => !i.isReceived && i.matchedInPO);
    if (missingItems.length > 0) {
      const finalY = (doc as any).lastAutoTable?.finalY || 110;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Missing Items', 14, finalY + 15);
      
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Code', 'Item', 'Type', 'Qty', 'Value']],
        body: missingItems.map(item => [
          item.item_code || '-',
          item.item_name,
          item.documentType === 'market' ? 'Market (ML)' : 'Material (RQ)',
          item.quantity.toString(),
          `${currencySymbol}${item.price_total.toFixed(2)}`
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [239, 68, 68] }
      });
    }
    
    // Unmatched/Rejected Items Table
    const unmatchedItems = items.filter(i => !i.matchedInPO);
    if (unmatchedItems.length > 0) {
      const finalY = (doc as any).lastAutoTable?.finalY || 110;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Unmatched Items (Not in PO - Rejected)', 14, finalY + 15);
      
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Code', 'Item', 'Qty', 'Reason']],
        body: unmatchedItems.map(item => [
          item.item_code || '-',
          item.item_name,
          item.quantity.toString(),
          'Code not found in Purchase Orders'
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [168, 85, 247] }
      });
    }
    
    doc.save(`receiving-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
    toast.success("Report downloaded");
  };

  const getItemCodeBadge = (item: ParsedReceivingItem) => {
    if (item.documentType === 'market') {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">ML</Badge>;
    }
    if (item.documentType === 'material') {
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">RQ</Badge>;
    }
    return <Badge variant="outline" className="bg-muted">?</Badge>;
  };

  if (!receivingData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review Receiving - {receivingData.doc_no || 'Parsed Items'}
          </DialogTitle>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="px-4 py-3 bg-muted/30 border-b">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Card className="p-2 text-center bg-green-500/10 border-green-500/30">
              <CheckCircle className="h-4 w-4 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-500">{stats.received}</p>
              <p className="text-[10px] text-muted-foreground">Received</p>
            </Card>
            <Card className="p-2 text-center bg-red-500/10 border-red-500/30">
              <XCircle className="h-4 w-4 text-red-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-red-500">{stats.missing}</p>
              <p className="text-[10px] text-muted-foreground">Missing</p>
            </Card>
            <Card className="p-2 text-center bg-purple-500/10 border-purple-500/30">
              <AlertTriangle className="h-4 w-4 text-purple-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-purple-500">{stats.unmatched}</p>
              <p className="text-[10px] text-muted-foreground">Rejected</p>
            </Card>
            <Card className="p-2 text-center bg-primary/10 border-primary/30">
              <Package className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-primary">{currencySymbol}{stats.receivedValue.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Total Value</p>
            </Card>
          </div>
          
          {/* Market vs Material breakdown */}
          <div className="flex gap-4 mt-3 text-xs">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-muted-foreground">Market:</span>
              <span className="font-semibold">{stats.marketReceivedCount}/{stats.marketCount}</span>
              <span className="text-blue-500">{currencySymbol}{stats.marketValue.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-muted-foreground">Material:</span>
              <span className="font-semibold">{stats.materialReceivedCount}/{stats.materialCount}</span>
              <span className="text-orange-500">{currencySymbol}{stats.materialValue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pt-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="text-xs">
                All ({items.length})
              </TabsTrigger>
              <TabsTrigger value="market" className="text-xs">
                <ShoppingCart className="h-3 w-3 mr-1" />
                Market ({stats.marketCount})
              </TabsTrigger>
              <TabsTrigger value="material" className="text-xs">
                <Wrench className="h-3 w-3 mr-1" />
                Material ({stats.materialCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-2 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => toggleAll(true)} className="text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Tick All Matched
          </Button>
          <Button size="sm" variant="outline" onClick={() => toggleAll(false)} className="text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            Untick All
          </Button>
        </div>

        {/* Items List - Scrollable area with fixed height */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full px-4">
            <div className="space-y-2 py-2">
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mb-3 opacity-50" />
                  <p>No items to display</p>
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const originalIndex = items.findIndex(i => i === item);
                  return (
                    <Card 
                      key={index}
                      className={`p-3 transition-all ${
                        !item.matchedInPO 
                          ? 'bg-purple-500/5 border-purple-500/30 opacity-60' 
                          : item.isReceived 
                            ? 'bg-green-500/5 border-green-500/30' 
                            : 'bg-red-500/5 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox - always enabled for manual tick/untick */}
                        <div className="pt-1">
                          <Checkbox
                            checked={item.isReceived}
                            onCheckedChange={() => toggleItemReceived(originalIndex)}
                            className="cursor-pointer"
                          />
                        </div>
                        
                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getItemCodeBadge(item)}
                            <span className="font-mono text-xs text-muted-foreground">
                              {item.item_code || 'No Code'}
                            </span>
                            {!item.matchedInPO && (
                              <Badge variant="destructive" className="text-[10px]">
                                NOT IN PO - REJECTED
                              </Badge>
                            )}
                            {item.matchedInPO && !item.isReceived && (
                              <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-500 border-red-500/30">
                                MISSING
                              </Badge>
                            )}
                            {item.isReceived && (
                              <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-500 border-green-500/30">
                                RECEIVED
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-sm mt-1 truncate">{item.item_name}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>Qty: <span className="font-semibold text-foreground">{item.quantity}</span></span>
                            {item.unit && <span>Unit: {item.unit}</span>}
                            <span>Price: {currencySymbol}{item.price_per_unit.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        {/* Total */}
                        <div className="text-right">
                          <p className={`font-bold ${item.isReceived ? 'text-green-500' : 'text-muted-foreground'}`}>
                            {currencySymbol}{item.price_total.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t bg-muted/30 flex-row gap-2">
          <Button variant="outline" onClick={downloadReport} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" />
            Report
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || stats.received === 0}
            className="flex-1 sm:flex-none"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : `Save ${stats.received} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to detect document type from item code
export const detectDocumentType = (itemCode: string): 'market' | 'material' | 'unknown' => {
  if (!itemCode) return 'unknown';
  const code = itemCode.toUpperCase().trim();
  if (code.startsWith('ML') || /^[0-9.]+$/.test(code)) return 'market'; // ML codes or numeric-only codes
  if (code.startsWith('RQ')) return 'material';
  return 'unknown';
};

// Helper to normalize item code for matching
export const normalizeItemCode = (code: string): string => {
  return String(code || '').replace(/[.\s]/g, '').replace(/^0+/, '').trim().toLowerCase();
};
