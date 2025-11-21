import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Store, Plus, Trash2, ArrowLeft, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const StoresAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Form states
  const [storeName, setStoreName] = useState("");
  const [storeLocation, setStoreLocation] = useState("");
  const [storeType, setStoreType] = useState("warehouse");

  useEffect(() => {
    if (user) {
      fetchStores();
    }
  }, [user, currentWorkspace]);

  const fetchStores = async () => {
    try {
      setLoading(true);

      const workspaceFilter = currentWorkspace 
        ? { workspace_id: currentWorkspace.id }
        : { user_id: user?.id, workspace_id: null };

      const { data, error } = await supabase
        .from('stores')
        .select(`
          *,
          inventory(count)
        `)
        .match(workspaceFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    if (!storeName.trim()) {
      toast.error("Store name is required");
      return;
    }
    if (!storeLocation.trim()) {
      toast.error("Store area/location is required");
      return;
    }

    try {
      const { error } = await supabase
        .from('stores')
        .insert({
          name: storeName.trim(),
          area: storeLocation.trim(),
          store_type: storeType,
          user_id: user.id,
          workspace_id: currentWorkspace?.id || null
        });

      if (error) throw error;

      toast.success("Store created successfully!");
      setStoreName("");
      setStoreLocation("");
      setStoreType("warehouse");
      setIsCreateDialogOpen(false);
      fetchStores();
    } catch (error: any) {
      console.error('Error creating store:', error);
      toast.error('Failed to create store');
    }
  };

  const handleDeleteStore = async (storeId: string, storeName: string) => {
    try {
      // Delete all inventory items in this store first
      const { error: inventoryError } = await supabase
        .from('inventory')
        .delete()
        .eq('store_id', storeId);

      if (inventoryError) throw inventoryError;

      // Then delete the store
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId);

      if (error) throw error;

      toast.success(`Store "${storeName}" and all its inventory deleted successfully`);
      fetchStores();
    } catch (error: any) {
      console.error('Error deleting store:', error);
      toast.error('Failed to delete store');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <p className="text-muted-foreground">Loading stores...</p>
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

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Store className="h-8 w-8" />
              Store Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your stores
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Store
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Store</DialogTitle>
                <DialogDescription>
                  Add a new store location to your inventory system
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateStore} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Store Name *</Label>
                  <Input
                    id="name"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g., Main Warehouse, Kitchen, Bar"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Area/Location *</Label>
                  <Input
                    id="location"
                    value={storeLocation}
                    onChange={(e) => setStoreLocation(e.target.value)}
                    placeholder="e.g., Building A, Floor 2, Main Kitchen"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Store Type *</Label>
                  <Select value={storeType} onValueChange={setStoreType}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="outlet">Outlet</SelectItem>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="storage">Storage</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Store
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {stores.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Store className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No stores yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first store to start managing inventory
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Store
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => (
              <Card key={store.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{store.name}</CardTitle>
                      {store.area && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {store.area}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {store.store_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Inventory Items
                      </p>
                      <p className="text-2xl font-bold">
                        {store.inventory?.[0]?.count || 0}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/store/${store.id}`)}
                      >
                        View
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Store</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <p>Are you sure you want to delete "{store.name}"?</p>
                              {store.inventory?.[0]?.count > 0 && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                  <p className="text-destructive font-semibold">
                                    ⚠️ Warning: This store has {store.inventory[0].count} inventory items.
                                  </p>
                                  <p className="text-sm text-destructive/80 mt-1">
                                    All inventory items in this store will be permanently deleted.
                                  </p>
                                </div>
                              )}
                              <p className="text-sm text-muted-foreground mt-2">
                                This action cannot be undone.
                              </p>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteStore(store.id, store.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Store {store.inventory?.[0]?.count > 0 && `& ${store.inventory[0].count} Items`}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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

export default StoresAdmin;
