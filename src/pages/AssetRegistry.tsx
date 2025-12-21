import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Package, DollarSign, Calendar, MapPin, Wrench, Trash2, Edit2, QrCode, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Asset {
  id: string;
  asset_name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  warranty_expiry: string | null;
  condition: string | null;
  location: string | null;
  notes: string | null;
}

const AssetRegistry = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formData, setFormData] = useState({
    asset_name: "",
    category: "equipment",
    brand: "",
    model: "",
    serial_number: "",
    purchase_date: "",
    purchase_price: "",
    warranty_expiry: "",
    condition: "good",
    location: "",
    notes: "",
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("asset_registry")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Asset[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("asset_registry").insert({
        asset_name: data.asset_name,
        category: data.category || null,
        brand: data.brand || null,
        model: data.model || null,
        serial_number: data.serial_number || null,
        purchase_date: data.purchase_date || null,
        purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
        warranty_expiry: data.warranty_expiry || null,
        condition: data.condition || null,
        location: data.location || null,
        notes: data.notes || null,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Asset added successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from("asset_registry")
        .update({
          asset_name: updateData.asset_name,
          category: updateData.category || null,
          brand: updateData.brand || null,
          model: updateData.model || null,
          serial_number: updateData.serial_number || null,
          purchase_date: updateData.purchase_date || null,
          purchase_price: updateData.purchase_price ? parseFloat(updateData.purchase_price) : null,
          warranty_expiry: updateData.warranty_expiry || null,
          condition: updateData.condition || null,
          location: updateData.location || null,
          notes: updateData.notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setIsDialogOpen(false);
      setEditingAsset(null);
      resetForm();
      toast.success("Asset updated successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("asset_registry").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success("Asset deleted successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      asset_name: "",
      category: "equipment",
      brand: "",
      model: "",
      serial_number: "",
      purchase_date: "",
      purchase_price: "",
      warranty_expiry: "",
      condition: "good",
      location: "",
      notes: "",
    });
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      asset_name: asset.asset_name,
      category: asset.category || "equipment",
      brand: asset.brand || "",
      model: asset.model || "",
      serial_number: asset.serial_number || "",
      purchase_date: asset.purchase_date || "",
      purchase_price: asset.purchase_price?.toString() || "",
      warranty_expiry: asset.warranty_expiry || "",
      condition: asset.condition || "good",
      location: asset.location || "",
      notes: asset.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.asset_name) {
      toast.error("Asset name is required");
      return;
    }
    if (editingAsset) {
      updateMutation.mutate({ ...formData, id: editingAsset.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const categories = [
    { value: "equipment", label: "Kitchen Equipment" },
    { value: "furniture", label: "Furniture" },
    { value: "electronics", label: "Electronics" },
    { value: "barware", label: "Barware" },
    { value: "vehicles", label: "Vehicles" },
    { value: "other", label: "Other" },
  ];

  const conditions = [
    { value: "excellent", label: "Excellent" },
    { value: "good", label: "Good" },
    { value: "fair", label: "Fair" },
    { value: "poor", label: "Poor" },
    { value: "needs_repair", label: "Needs Repair" },
  ];

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.asset_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.serial_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || asset.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalValue = assets.reduce((sum, asset) => sum + (asset.purchase_price || 0), 0);

  const getConditionColor = (condition: string | null) => {
    switch (condition) {
      case "excellent": return "bg-green-500/20 text-green-400";
      case "good": return "bg-blue-500/20 text-blue-400";
      case "fair": return "bg-amber-500/20 text-amber-400";
      case "poor": return "bg-orange-500/20 text-orange-400";
      case "needs_repair": return "bg-red-500/20 text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Asset Registry</h1>
            <p className="text-sm text-muted-foreground">Track equipment, furniture & assets</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingAsset(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAsset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Asset Name *</Label>
                  <Input
                    value={formData.asset_name}
                    onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                    placeholder="e.g., Commercial Refrigerator"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Condition</Label>
                    <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {conditions.map((cond) => (
                          <SelectItem key={cond.value} value={cond.value}>{cond.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Brand</Label>
                    <Input
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="e.g., True"
                    />
                  </div>
                  <div>
                    <Label>Model</Label>
                    <Input
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="e.g., T-49"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Serial Number</Label>
                    <Input
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      placeholder="e.g., SN12345678"
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Main Kitchen"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Purchase Date</Label>
                    <Input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Purchase Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label>Warranty Expiry</Label>
                  <Input
                    type="date"
                    value={formData.warranty_expiry}
                    onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingAsset ? "Update Asset" : "Add Asset"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total Assets</span>
              </div>
              <p className="text-2xl font-bold">{assets.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Total Value</span>
              </div>
              <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assets List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filteredAssets.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-3">
                {assets.length === 0 ? "No assets added yet" : "No assets match your search"}
              </p>
              {assets.length === 0 && (
                <Button onClick={() => setIsDialogOpen(true)}>Add Your First Asset</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAssets.map((asset) => (
              <Card key={asset.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium">{asset.asset_name}</h3>
                        <Badge className={getConditionColor(asset.condition)}>
                          {asset.condition?.replace("_", " ") || "Unknown"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {(asset.brand || asset.model) && (
                          <p>{[asset.brand, asset.model].filter(Boolean).join(" - ")}</p>
                        )}
                        {asset.serial_number && (
                          <p className="flex items-center gap-1">
                            <QrCode className="w-3.5 h-3.5" />
                            {asset.serial_number}
                          </p>
                        )}
                        {asset.location && (
                          <p className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {asset.location}
                          </p>
                        )}
                        {asset.purchase_price && (
                          <p className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            ${asset.purchase_price.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(asset)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(asset.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetRegistry;
