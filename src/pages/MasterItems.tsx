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
import { Package, Plus, Trash2, ArrowLeft, Barcode, Tag, Edit, Image as ImageIcon, Trash, Search, Download } from "lucide-react";
import JsBarcode from "jsbarcode";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ZoomableImage } from "@/components/ZoomableImage";

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
  const [searchQuery, setSearchQuery] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateBarcode = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${timestamp}${random}`;
  };

  const downloadBarcode = (barcode: string, itemName: string) => {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, barcode, {
        format: "CODE128",
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 14,
      });
      
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `${itemName.replace(/[^a-z0-9]/gi, '_')}_barcode.png`;
      link.click();
      toast.success("Barcode downloaded!");
    } catch (error) {
      console.error('Error generating barcode:', error);
      toast.error("Failed to generate barcode");
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      // Auto-generate barcode if not provided
      const finalBarcode = itemBarcode.trim() || generateBarcode();

      const { error } = await supabase
        .from('items')
        .insert({
          name: itemName.trim(),
          description: itemDescription.trim() || null,
          brand: itemBrand.trim() || null,
          category: itemCategory.trim() || null,
          barcode: finalBarcode,
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
    setItemBarcode(item.barcode || generateBarcode());
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
    <div className="min-h-screen bg-background">
      <TopNav />
      
      <div className="container mx-auto px-4 pt-20 pb-24 max-w-7xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/store-management')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Store Management
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              Master Items
            </h1>
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? 'item' : 'items'} total
            </p>
          </div>

          <div className="flex gap-2">
            {items.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Trash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Items</AlertDialogTitle>
                    <AlertDialogDescription>
                      Delete all {items.length} items? This cannot be undone.
                      {items.some(item => item.inventory?.[0]?.count > 0) && (
                        <span className="block mt-2 text-destructive font-semibold">
                          Warning: Remove all inventory first.
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
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                resetForm();
              } else {
                // Auto-generate barcode when opening dialog
                setItemBarcode(generateBarcode());
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateItem} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs">Item Name *</Label>
                  <Input
                    id="name"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Item name"
                    required
                    className="h-9"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="brand" className="text-xs">Brand</Label>
                    <Input
                      id="brand"
                      value={itemBrand}
                      onChange={(e) => setItemBrand(e.target.value)}
                      placeholder="Brand"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-xs">Category</Label>
                    <Input
                      id="category"
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                      placeholder="Category"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="barcode" className="text-xs flex items-center justify-between">
                      <span>Barcode (auto-generated)</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setItemBarcode(generateBarcode())}
                        className="h-6 px-2 text-xs"
                      >
                        Regenerate
                      </Button>
                    </Label>
                    <Input
                      id="barcode"
                      value={itemBarcode}
                      onChange={(e) => setItemBarcode(e.target.value)}
                      placeholder="Auto-generated"
                      className="h-9 font-mono"
                      readOnly
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color" className="text-xs">Color</Label>
                    <Input
                      id="color"
                      type="color"
                      value={itemColorCode}
                      onChange={(e) => setItemColorCode(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photo" className="text-xs">Photo</Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setItemPhoto(e.target.files?.[0] || null)}
                    ref={fileInputRef}
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs">Description</Label>
                  <Textarea
                    id="description"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    placeholder="Description"
                    rows={2}
                    className="text-sm"
                  />
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={uploading}>
                    {uploading ? "Saving..." : "Add"}
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
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditItem} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-xs">Item Name *</Label>
                  <Input
                    id="edit-name"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Item name"
                    required
                    className="h-9"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-brand" className="text-xs">Brand</Label>
                    <Input
                      id="edit-brand"
                      value={itemBrand}
                      onChange={(e) => setItemBrand(e.target.value)}
                      placeholder="Brand"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-category" className="text-xs">Category</Label>
                    <Input
                      id="edit-category"
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                      placeholder="Category"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-barcode" className="text-xs flex items-center justify-between">
                      <span>Barcode</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setItemBarcode(generateBarcode())}
                        className="h-6 px-2 text-xs"
                      >
                        Regenerate
                      </Button>
                    </Label>
                    <Input
                      id="edit-barcode"
                      value={itemBarcode}
                      onChange={(e) => setItemBarcode(e.target.value)}
                      placeholder="Barcode"
                      className="h-9 font-mono"
                      readOnly
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-color" className="text-xs">Color</Label>
                    <Input
                      id="edit-color"
                      type="color"
                      value={itemColorCode}
                      onChange={(e) => setItemColorCode(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-photo" className="text-xs">Photo</Label>
                  {itemPhotoUrl && !itemPhoto && (
                    <img src={itemPhotoUrl} alt="Current" className="h-16 w-16 object-cover rounded mb-1" />
                  )}
                  <Input
                    id="edit-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setItemPhoto(e.target.files?.[0] || null)}
                    ref={fileInputRef}
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description" className="text-xs">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    placeholder="Description"
                    rows={2}
                    className="text-sm"
                  />
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    setIsEditDialogOpen(false);
                    resetForm();
                    setEditingItem(null);
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={uploading}>
                    {uploading ? "Saving..." : "Update"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Table */}
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No items found' : 'No items yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? 'Try a different search term' : 'Add your first item to get started'}
              </p>
              {!searchQuery && (
                <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell className="p-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.color_code || '#3b82f6' }}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          {item.photo_url ? (
                            <ZoomableImage
                              src={item.photo_url}
                              alt={item.name}
                              containerClassName="w-10 h-10 rounded"
                              className="w-full h-full"
                              objectFit="cover"
                              showZoomIcon={false}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div>{item.name}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.brand || '-'}
                        </TableCell>
                        <TableCell>
                          {item.category ? (
                            <Badge variant="secondary" className="text-xs">
                              {item.category}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-muted-foreground">
                              {item.barcode || '-'}
                            </span>
                            {item.barcode && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadBarcode(item.barcode, item.name)}
                                className="h-7 w-7 p-0"
                                title="Download barcode"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.inventory?.[0]?.count || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(item)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Delete "{item.name}"?
                                    {item.inventory?.[0]?.count > 0 && (
                                      <span className="block mt-2 text-destructive font-semibold">
                                        Warning: Has {item.inventory[0].count} inventory records.
                                      </span>
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteItem(item.id, item.name)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MasterItems;
