import { useState, useEffect, useRef } from "react";
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
import { Package, Plus, Trash2, ArrowLeft, Barcode, Tag, Edit, Image as ImageIcon, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const MasterItems = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  
  // Form states
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemBrand, setItemBrand] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemBarcode, setItemBarcode] = useState("");
  const [itemColorCode, setItemColorCode] = useState("#3b82f6");
  const [itemPhoto, setItemPhoto] = useState<File | null>(null);
  const [itemPhotoUrl, setItemPhotoUrl] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadItemPhoto = async (file: File): Promise<string | null> => {
    try {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Please upload JPEG, PNG, or WebP");
        return null;
      }
      
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error("File too large. Maximum size is 5MB");
        return null;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('items')
        .upload(fileName, file, {
          upsert: true,
        });

      if (error) {
        toast.error("Failed to upload image");
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('items')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
      return null;
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
      setUploading(true);
      let photoUrl = null;

      if (itemPhoto) {
        photoUrl = await uploadItemPhoto(itemPhoto);
      }

      const { error } = await supabase
        .from('items')
        .insert({
          name: itemName.trim(),
          description: itemDescription.trim() || null,
          brand: itemBrand.trim() || null,
          category: itemCategory.trim() || null,
          barcode: itemBarcode.trim() || null,
          color_code: itemColorCode,
          photo_url: photoUrl,
          user_id: user.id,
          workspace_id: currentWorkspace?.id || null
        });

      if (error) throw error;

      toast.success("Item added to master list!");
      resetForm();
      setIsCreateDialogOpen(false);
      fetchItems();
    } catch (error: any) {
      console.error('Error creating item:', error);
      toast.error('Failed to create item');
    } finally {
      setUploading(false);
    }
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !editingItem) return;
    if (!itemName.trim()) {
      toast.error("Item name is required");
      return;
    }

    try {
      setUploading(true);
      let photoUrl = editingItem.photo_url;

      if (itemPhoto) {
        photoUrl = await uploadItemPhoto(itemPhoto);
      }

      const { error } = await supabase
        .from('items')
        .update({
          name: itemName.trim(),
          description: itemDescription.trim() || null,
          brand: itemBrand.trim() || null,
          category: itemCategory.trim() || null,
          barcode: itemBarcode.trim() || null,
          color_code: itemColorCode,
          photo_url: photoUrl,
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast.success("Item updated successfully!");
      resetForm();
      setIsEditDialogOpen(false);
      setEditingItem(null);
      fetchItems();
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    } finally {
      setUploading(false);
    }
  };

  const openEditDialog = (item: any) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemDescription(item.description || "");
    setItemBrand(item.brand || "");
    setItemCategory(item.category || "");
    setItemBarcode(item.barcode || "");
    setItemColorCode(item.color_code || "#3b82f6");
    setItemPhotoUrl(item.photo_url || "");
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setItemName("");
    setItemDescription("");
    setItemBrand("");
    setItemCategory("");
    setItemBarcode("");
    setItemColorCode("#3b82f6");
    setItemPhoto(null);
    setItemPhotoUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

  const handleDeleteAllItems = async () => {
    try {
      // Check if any items have inventory
      const { data: inventoryData, error: checkError } = await supabase
        .from('inventory')
        .select('item_id')
        .in('item_id', items.map(item => item.id));

      if (checkError) throw checkError;

      if (inventoryData && inventoryData.length > 0) {
        toast.error("Cannot delete items with existing inventory. Please remove all inventory first.");
        return;
      }

      const workspaceFilter = currentWorkspace 
        ? { workspace_id: currentWorkspace.id }
        : { user_id: user?.id, workspace_id: null };

      const { error } = await supabase
        .from('items')
        .delete()
        .match(workspaceFilter);

      if (error) throw error;

      toast.success("All items deleted successfully");
      fetchItems();
    } catch (error: any) {
      console.error('Error deleting all items:', error);
      toast.error('Failed to delete all items');
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

          <div className="flex gap-2">
            {items.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash className="mr-2 h-4 w-4" />
                    Delete All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Items</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete all {items.length} items? This action cannot be undone.
                      {items.some(item => item.inventory?.[0]?.count > 0) && (
                        <span className="block mt-2 text-destructive font-semibold">
                          Warning: Some items have inventory. You must remove all inventory before deletion.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAllItems}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete All Items
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) resetForm();
            }}>
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

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="photo">Item Photo</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setItemPhoto(e.target.files?.[0] || null)}
                        ref={fileInputRef}
                      />
                      {itemPhoto && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setItemPhoto(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
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
                  <Button type="button" variant="outline" onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? "Uploading..." : "Add Item"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              resetForm();
              setEditingItem(null);
            }
          }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Item</DialogTitle>
                <DialogDescription>
                  Update item information
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-name">Item Name *</Label>
                    <Input
                      id="edit-name"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g., Vodka, Tomatoes, Glassware"
                      required
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-photo">Item Photo</Label>
                    {itemPhotoUrl && !itemPhoto && (
                      <div className="mb-2">
                        <img src={itemPhotoUrl} alt="Current item" className="h-20 w-20 object-cover rounded" />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        id="edit-photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setItemPhoto(e.target.files?.[0] || null)}
                        ref={fileInputRef}
                      />
                      {itemPhoto && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setItemPhoto(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-brand">Brand</Label>
                    <Input
                      id="edit-brand"
                      value={itemBrand}
                      onChange={(e) => setItemBrand(e.target.value)}
                      placeholder="e.g., Grey Goose, Heinz"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Input
                      id="edit-category"
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                      placeholder="e.g., Spirits, Produce, Glassware"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-barcode">Barcode</Label>
                    <Input
                      id="edit-barcode"
                      value={itemBarcode}
                      onChange={(e) => setItemBarcode(e.target.value)}
                      placeholder="e.g., 123456789"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-color">Color Code</Label>
                    <Input
                      id="edit-color"
                      type="color"
                      value={itemColorCode}
                      onChange={(e) => setItemColorCode(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="Additional details about this item..."
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsEditDialogOpen(false);
                    resetForm();
                    setEditingItem(null);
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? "Updating..." : "Update Item"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
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
                {item.photo_url && (
                  <div className="w-full h-48 overflow-hidden">
                    <img 
                      src={item.photo_url} 
                      alt={item.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
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
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
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
