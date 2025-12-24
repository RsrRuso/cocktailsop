import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { 
  Printer, Bluetooth, ChefHat, Wine, Receipt, 
  CreditCard, FileText, Loader2, Wifi, WifiOff,
  Smartphone
} from 'lucide-react';
import { useBluetoothPrinter, ReceiptLine } from '@/hooks/useBluetoothPrinter';
import { KOTPreview } from './KOTPreview';
import { 
  OrderData, 
  generateKitchenKOT, 
  generateBarKOT, 
  generatePreCheck, 
  generateClosingCheck,
  generateCombinedKOT 
} from './KOTTemplates';

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderData | null;
  onPrintComplete?: () => void;
  defaultType?: PrintType;
}

type PrintType = 'kitchen' | 'bar' | 'precheck' | 'closing' | 'combined';

export function PrintDialog({ open, onOpenChange, order, onPrintComplete, defaultType = 'precheck' }: PrintDialogProps) {
  const [selectedType, setSelectedType] = useState<PrintType>(defaultType);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  const { status, connect, disconnect, printRaw, createReceiptData } = useBluetoothPrinter();

  // Update selected type when dialog opens with a new defaultType
  useEffect(() => {
    if (open) {
      setSelectedType(defaultType);
    }
  }, [open, defaultType]);

  if (!order) return null;

  const handleBrowserPrint = () => {
    if (!printRef.current) return;
    
    setIsPrinting(true);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups to print",
        variant: "destructive"
      });
      setIsPrinting(false);
      return;
    }

    // Get the preview content
    const content = printRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print ${selectedType.toUpperCase()}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              margin: 0;
              padding: 10px;
              width: 80mm;
            }
            .receipt {
              background: white;
              color: black;
            }
          </style>
        </head>
        <body>
          <div class="receipt">${content}</div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    setIsPrinting(false);
    onPrintComplete?.();
    toast({ title: "Print dialog opened" });
  };

  const handleBluetoothPrint = async () => {
    if (!status.isConnected) {
      const connected = await connect();
      if (!connected) return;
    }

    setIsPrinting(true);

    try {
      // Generate text content based on selected type
      let lines: string[] = [];
      
      switch (selectedType) {
        case 'kitchen':
          lines = generateKitchenKOT(order);
          break;
        case 'bar':
          lines = generateBarKOT(order);
          break;
        case 'precheck':
          lines = generatePreCheck(order);
          break;
        case 'closing':
          lines = generateClosingCheck(order);
          break;
        case 'combined':
          lines = generateCombinedKOT(order);
          break;
      }

      if (lines.length === 0) {
        toast({
          title: "Nothing to Print",
          description: `No ${selectedType} items in this order`,
          variant: "destructive"
        });
        setIsPrinting(false);
        return;
      }

      // Convert to receipt lines with formatting
      const receiptLines: ReceiptLine[] = lines.map(line => {
        const isCentered = line.startsWith(' '.repeat(10)) || line.includes('***') || line.includes('───');
        const isBold = line.includes('***') || line.includes('TOTAL') || line.includes('═');
        
        return {
          text: line.trim() || ' ',
          align: isCentered ? 'center' : 'left',
          bold: isBold,
          size: line.includes('***') && line.length < 30 ? 'tall' : 'normal'
        };
      });

      const data = createReceiptData(receiptLines);
      const success = await printRaw(data);

      if (success) {
        toast({ title: "Printed successfully!" });
        onPrintComplete?.();
      }
    } catch (error: any) {
      console.error('Print error:', error);
      toast({
        title: "Print Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const printTypes: { value: PrintType; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'kitchen', label: 'Kitchen KOT', icon: <ChefHat className="h-4 w-4" />, description: 'Food items for kitchen' },
    { value: 'bar', label: 'Bar KOT', icon: <Wine className="h-4 w-4" />, description: 'Drink items for bar' },
    { value: 'combined', label: 'Combined KOT', icon: <FileText className="h-4 w-4" />, description: 'All items on one ticket' },
    { value: 'precheck', label: 'Pre-Check', icon: <Receipt className="h-4 w-4" />, description: 'Guest check before payment' },
    { value: 'closing', label: 'Closing Check', icon: <CreditCard className="h-4 w-4" />, description: 'Receipt after payment' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Order - {order.tableName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Print Options */}
          <div className="space-y-4">
            {/* Printer Connection Status */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Bluetooth className="h-5 w-5" />
                <span className="font-medium">Bluetooth Printer</span>
              </div>
              {status.isConnected ? (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">
                    <Wifi className="h-3 w-3 mr-1" />
                    {status.deviceName}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={disconnect}>
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={connect}
                  disabled={status.isConnecting}
                >
                  {status.isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <WifiOff className="h-4 w-4 mr-1" />
                  )}
                  Connect
                </Button>
              )}
            </div>

            {/* Print Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Print Type</label>
              <div className="grid grid-cols-1 gap-2">
                {printTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      selectedType === type.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`p-2 rounded-md ${
                      selectedType === type.value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {type.icon}
                    </div>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Print Actions */}
            <div className="space-y-2 pt-4 border-t">
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleBluetoothPrint}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Smartphone className="h-4 w-4 mr-2" />
                )}
                Print to Mobile Printer
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleBrowserPrint}
                disabled={isPrinting}
              >
                <Printer className="h-4 w-4 mr-2" />
                Browser Print
              </Button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Preview</label>
            <ScrollArea className="h-[500px] border rounded-lg bg-gray-100 p-4">
              <div ref={printRef}>
                <KOTPreview order={order} type={selectedType} />
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
