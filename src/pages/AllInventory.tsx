import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Package, Search, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const AllInventory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  const [inventory, setInventory] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchData();
      setupRealtime();
    }
  }, [user, currentWorkspace]);

  const setupRealtime = () => {
    const channel = supabase
      .channel('all-inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory'
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const workspaceFilter = currentWorkspace 
        ? { workspace_id: currentWorkspace.id }
        : { user_id: user?.id, workspace_id: null };

      // Fetch all stores
      const { data: storesData } = await supabase
        .from('stores')
        .select('*')
        .match(workspaceFilter)
        .order('name');

      setStores(storesData || []);

      // Fetch all inventory with store and item details
      const { data: inventoryData, error } = await supabase
        .from('inventory')
        .select(`
          *,
          items (
            id,
            name,
            barcode,
            brand,
            category
          ),
          stores (
            id,
            name,
            location,
            store_type
          )
        `)
        .match(workspaceFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInventory(inventoryData || []);
    } catch (error: any) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(inv => {
    const matchesSearch = !searchQuery || 
      inv.items?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.items?.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.items?.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStore = selectedStore === "all" || inv.store_id === selectedStore;
    
    return matchesSearch && matchesStore;
  });

  // Group by item and aggregate quantities across stores
  const aggregatedInventory = filteredInventory.reduce((acc, inv) => {
    const itemId = inv.items?.id || inv.item_id;
    if (!itemId) return acc;

    if (!acc[itemId]) {
      acc[itemId] = {
        ...inv,
        totalQuantity: 0,
        storeQuantities: []
      };
    }

    acc[itemId].totalQuantity += Number(inv.quantity || 0);
    acc[itemId].storeQuantities.push({
      store: inv.stores,
      quantity: inv.quantity,
      photo_url: inv.photo_url
    });

    return acc;
  }, {} as any);

  const inventoryList = Object.values(aggregatedInventory);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/store-management')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Store Management
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Package className="h-6 w-6" />
              All Inventory Across Stores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Total Items: {inventoryList.length}</span>
              <span>•</span>
              <span>Total Stores: {stores.length}</span>
            </div>
          </CardContent>
        </Card>

        {inventoryList.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No inventory items found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventoryList.map((item: any) => (
              <Card key={item.id} className="overflow-hidden">
                {item.storeQuantities[0]?.photo_url && (
                  <div className="aspect-square w-full bg-muted">
                    <img 
                      src={item.storeQuantities[0].photo_url} 
                      alt={item.items?.name || 'Item'} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2">
                    {item.items?.name || 'Unknown Item'}
                  </h3>
                  {item.items?.brand && (
                    <p className="text-sm text-muted-foreground mb-1">
                      Brand: {item.items.brand}
                    </p>
                  )}
                  {item.items?.category && (
                    <p className="text-sm text-muted-foreground mb-2">
                      Category: {item.items.category}
                    </p>
                  )}
                  
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Quantity</span>
                      <Badge variant="default" className="text-base font-bold">
                        {item.totalQuantity}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">By Store:</p>
                      {item.storeQuantities.map((sq: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground truncate max-w-[150px]">
                            {sq.store?.name || 'Unknown Store'}
                          </span>
                          <Badge variant="outline">{sq.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default AllInventory;
