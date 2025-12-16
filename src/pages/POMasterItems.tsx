import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchaseOrderMaster } from "@/hooks/usePurchaseOrderMaster";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Package, Search, List, RefreshCw, Upload, TrendingUp } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import ParLevelPrediction from "@/components/procurement/ParLevelPrediction";

const currencySymbols: Record<string, string> = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'AED': 'د.إ',
  'AUD': 'A$'
};

const POMasterItems = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currency, setCurrency] = useState(() => localStorage.getItem('po-currency') || 'USD');
  const [showParLevel, setShowParLevel] = useState(false);

  // Listen for currency changes from other tabs/pages
  useEffect(() => {
    const handleStorageChange = () => {
      const newCurrency = localStorage.getItem('po-currency') || 'USD';
      setCurrency(newCurrency);
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 500);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const formatCurrency = (amount: number) => `${currencySymbols[currency]}${amount.toFixed(2)}`;
  
  // Workspace state
  const [selectedWorkspaceId] = useState<string | null>(() => {
    return localStorage.getItem('po-workspace-id') || null;
  });
  
  const { masterItems, isLoadingMaster, syncFromExistingOrders, importFromFile } = usePurchaseOrderMaster(selectedWorkspaceId);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const filteredItems = masterItems?.filter(item =>
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncFromExistingOrders();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      await importFromFile(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Mobile Optimized */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border shrink-0">
        <div className="flex items-start justify-between p-3 gap-2">
          <div className="flex items-start gap-2">
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 mt-0.5" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight">Master Items</h1>
              <p className="text-xs text-muted-foreground">Unique ingredients from purchase orders</p>
            </div>
          </div>
          
          {/* Action Buttons - Compact */}
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.txt,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2 text-xs"
              onClick={() => setShowParLevel(true)}
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1" />
              Par Level
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className={`h-3.5 w-3.5 mr-1 ${isUploading ? 'animate-pulse' : ''}`} />
              {isUploading ? '...' : 'Upload'}
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              className="h-8 w-8"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
        {/* Stats Card - Compact */}
        <Card className="p-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-lg">
              <List className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Unique Items</p>
              <p className="text-xl font-bold">{masterItems?.length || 0}</p>
            </div>
          </div>
        </Card>

        {/* Search - Compact */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Items List - Mobile Card Layout */}
        <ScrollArea className="flex-1">
          {isLoadingMaster ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : (!filteredItems || filteredItems.length === 0) ? (
            <div className="py-8 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No master items yet</p>
              <p className="text-xs mt-1">Upload purchase orders to populate</p>
            </div>
          ) : (
            <div className="space-y-2 pb-20">
              {filteredItems.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <Package className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{item.item_name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {item.unit && (
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                              {item.unit}
                            </Badge>
                          )}
                          {item.category && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                              {item.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Price */}
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm">
                        {item.last_price ? formatCurrency(item.last_price) : '-'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(item.updated_at), 'MMM dd')}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Par Level Prediction Dialog */}
      <ParLevelPrediction 
        workspaceId={selectedWorkspaceId}
        open={showParLevel}
        onOpenChange={setShowParLevel}
      />
    </div>
  );
};

export default POMasterItems;
