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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Package, Plus, Trash2, ArrowLeft, Barcode, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const MasterItems = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Form states
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemBrand, setItemBrand] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemBarcode, setItemBarcode] = useState("");
  const [itemColorCode, setItemColorCode] = useState("#3b82f6");

  useEffect(() => {
    if (user) {
      fetchItems();
      setupRealtime();
    }
  }, [user, currentWorkspace]);

  const setupRealtime = () => {
    const channel = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items'
        },
        () => fetchItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchItems = async () => {
    try {
      setLoading(true);

      const workspaceFilter = currentWorkspace 
        ? { workspace_id: currentWorkspace.id }
        : { user_id: user?.id, workspace_id: null };

      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          inventory(count)
        `)
        .match(workspaceFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    if (!itemName.trim()) {
      toast.error("Item name is required");
      return;
    }

    try {
      const { error } = await supabase
        .from('items')
        .insert({
          name: itemName.trim(),
          description: itemDescription.trim() || null,
          brand: itemBrand.trim() || null,
          category: itemCategory.trim() || null,
          barcode: itemBarcode.trim() || null,
          color_code: itemColorCode,
          user_id: user.id,
          workspace_id: currentWorkspace?.id || null
        });

      if (error) throw error;

      toast.success("Item added to master list!");
      setItemName("");
      setItemDescription("");
      setItemBrand("");
      setItemCategory("");
      setItemBarcode("");
      setItemColorCode("#3b82f6");
      setIsCreateDialogOpen(false);
      fetchItems();
    } catch (error: any) {
      console.error('Error creating item:', error);
      toast.error('Failed to create item');
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    try {
      // Check if item has inventory
      const { data: inventoryData, error: checkError } = await supabase
        .from('inventory')
        .select('id')
        .eq('item_id', itemId)
        .limit(1);

      if (checkError) throw checkError;

      if (inventoryData && inventoryData.length > 0) {
        toast.error("Cannot delete item with existing inventory. Please remove all inventory first.");
        return;
      }

      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast.success(`Item "${itemName}" deleted successfully`);
      fetchItems();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <p className="text-muted-foreground">Loading items...</p>
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
              <Package className="h-8 w-8" />
              Master Item List
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your inventory master list
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
                <DialogDescription>
                  Add a new item to your master inventory list
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="name">Item Name *</Label>
                    <Input
                      id="name"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g., Vodka, Tomatoes, Glassware"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      value={itemBrand}
                      onChange={(e) => setItemBrand(e.target.value)}
                      placeholder="e.g., Grey Goose, Heinz"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                      placeholder="e.g., Spirits, Produce, Glassware"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input
                      id="barcode"
                      value={itemBarcode}
                      onChange={(e) => setItemBarcode(e.target.value)}
                      placeholder="e.g., 123456789"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">Color Code</Label>
                    <Input
                      id="color"
                      type="color"
                      value={itemColorCode}
                      onChange={(e) => setItemColorCode(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="Additional details about this item..."
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Item
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No items in master list</h3>
              <p className="text-muted-foreground mb-4">
                Add your first item to start tracking inventory
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <div 
                  className="absolute top-0 left-0 w-1 h-full" 
                  style={{ backgroundColor: item.color_code || '#3b82f6' }}
                />
                <CardHeader className="pl-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{item.name}</CardTitle>
                      {item.brand && (
                        <p className="text-sm text-muted-foreground">
                          Brand: {item.brand}
                        </p>
                      )}
                      {item.category && (
                        <Badge variant="secondary" className="mt-2">
                          <Tag className="h-3 w-3 mr-1" />
                          {item.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pl-6">
                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {item.description}
                    </p>
                  )}
                  
                  {item.barcode && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Barcode className="h-4 w-4" />
                      {item.barcode}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">In Inventory</p>
                      <p className="text-lg font-bold">
                        {item.inventory?.[0]?.count || 0}
                      </p>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Item</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{item.name}"?
                            {item.inventory?.[0]?.count > 0 && (
                              <span className="block mt-2 text-destructive font-semibold">
                                Warning: This item has {item.inventory[0].count} inventory records. You must remove all inventory before deletion.
                              </span>
                            )}
                            <span className="block mt-2 text-sm text-muted-foreground">
                              This action cannot be undone.
                            </span>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Item
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

export default MasterItems;
