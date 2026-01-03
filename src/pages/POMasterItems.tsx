import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchaseOrderMaster, MasterItem } from "@/hooks/usePurchaseOrderMaster";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Package, Search, List, RefreshCw, Upload, TrendingUp, Pencil } from "lucide-react";
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
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [editForm, setEditForm] = useState({ unit: '', category: '' });

  useEffect(() => {
    const handleStorageChange = () => {
      const newCurrency = localStorage.getItem('po-currency') || 'USD';
      setCurrency(newCurrency);
    };
    window.addEventListener('storage', handleStorageChange);
    // Check on visibility change instead of polling
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleStorageChange();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const formatCurrency = (amount: number) => `${currencySymbols[currency]}${amount.toFixed(2)}`;
  
  const [selectedWorkspaceId] = useState<string | null>(() => {
    return localStorage.getItem('po-workspace-id') || null;
  });
  
  const { masterItems, isLoadingMaster, syncFromExistingOrders, importFromFile, updateMasterItem } = usePurchaseOrderMaster(selectedWorkspaceId);

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

  const handleEditItem = (item: MasterItem) => {
    setEditingItem(item);
    setEditForm({ 
      unit: item.unit || '', 
      category: item.category || '' 
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      await updateMasterItem({
        id: editingItem.id,
        unit: editForm.unit || null,
        category: editForm.category || null
      });
      setEditingItem(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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
        {/* Stats Card */}
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

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Items List */}
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
                <Card 
                  key={item.id} 
                  className="p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => handleEditItem(item)}
                >
                  {/* Item Name Row */}
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-primary shrink-0" />
                    <p className="font-medium text-sm flex-1">{item.item_name}</p>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  
                  {/* Details Grid - Always Visible */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {/* Unit */}
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground text-[10px] mb-0.5">Unit</p>
                      <p className="font-medium">{item.unit || '-'}</p>
                    </div>
                    
                    {/* Category */}
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground text-[10px] mb-0.5">Category</p>
                      <p className="font-medium truncate">{item.category || '-'}</p>
                    </div>
                    
                    {/* Last Price */}
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground text-[10px] mb-0.5">Last Price</p>
                      <p className="font-semibold text-primary">
                        {item.last_price ? formatCurrency(item.last_price) : '-'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Updated Date */}
                  <p className="text-[10px] text-muted-foreground mt-2 text-right">
                    Updated: {format(new Date(item.updated_at), 'MMM dd, yyyy')}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-medium">{editingItem.item_name}</p>
              
              <div className="space-y-2">
                <Label htmlFor="unit" className="text-xs">Unit</Label>
                <Input
                  id="unit"
                  placeholder="e.g., kg, pcs, bottle"
                  value={editForm.unit}
                  onChange={(e) => setEditForm(f => ({ ...f, unit: e.target.value }))}
                  className="h-9"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., Produce, Dairy, Spirits"
                  value={editForm.category}
                  onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))}
                  className="h-9"
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSaveEdit}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ParLevelPrediction 
        workspaceId={selectedWorkspaceId}
        open={showParLevel}
        onOpenChange={setShowParLevel}
      />
    </div>
  );
};

export default POMasterItems;
