import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package } from "lucide-react";
import { toast } from "sonner";

const StoreDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  const [store, setStore] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && id) {
      fetchStoreData();
      setupRealtime();
    }
  }, [user, id, currentWorkspace]);

  const setupRealtime = () => {
    const channel = supabase
      .channel(`store-${id}-inventory`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `store_id=eq.${id}`
        },
        () => fetchStoreData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchStoreData = async () => {
    try {
      setLoading(true);

      // Fetch store details
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single();

      if (storeError) throw storeError;
      setStore(storeData);

      // Fetch inventory with item details
      const { data: inventoryData, error: invError } = await supabase
        .from('inventory')
        .select(`
          *,
          items (
            id,
            name,
            barcode,
            brand,
            category
          )
        `)
        .eq('store_id', id)
        .order('created_at', { ascending: false });

      if (invError) throw invError;
      setInventory(inventoryData || []);
    } catch (error: any) {
      console.error('Error fetching store data:', error);
      toast.error('Failed to load store data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <p className="text-muted-foreground">Loading store details...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4">
          <p className="text-muted-foreground">Store not found</p>
          <Button onClick={() => navigate('/store-management')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Stores
          </Button>
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
          Back to Stores
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{store.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{store.area}</p>
              </div>
              <Badge variant={store.store_type === 'warehouse' ? 'default' : 'secondary'}>
                {store.store_type}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Items ({inventory.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inventory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No items in this store yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventory.map((inv) => (
                  <Card key={inv.id} className="overflow-hidden">
                    {inv.photo_url && (
                      <div className="aspect-square w-full bg-muted">
                        <img 
                          src={inv.photo_url} 
                          alt={inv.items?.name || 'Item'} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2">
                        {inv.items?.name || 'Unknown Item'}
                      </h3>
                      {inv.items?.brand && (
                        <p className="text-sm text-muted-foreground mb-1">
                          Brand: {inv.items.brand}
                        </p>
                      )}
                      {inv.items?.category && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Category: {inv.items.category}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <span className="text-sm text-muted-foreground">Quantity</span>
                        <Badge variant="outline" className="text-base font-semibold">
                          {inv.quantity}
                        </Badge>
                      </div>
                      {inv.expiration_date && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Expires: {new Date(inv.expiration_date).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default StoreDetail;
