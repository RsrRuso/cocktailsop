import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Edit2, X, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { useMasterSpirits } from "@/hooks/useMasterSpirits";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Available units for spirits/ingredients
const AVAILABLE_UNITS = [
  { value: "ml", label: "ml (milliliters)" },
  { value: "L", label: "L (liters)" },
  { value: "cl", label: "cl (centiliters)" },
  { value: "oz", label: "oz (fluid ounces)" },
  { value: "g", label: "g (grams)" },
  { value: "kg", label: "kg (kilograms)" },
  { value: "piece", label: "piece" },
  { value: "each", label: "each" },
] as const;

const MasterSpirits = () => {
  const navigate = useNavigate();
  const { spirits, isLoading, createSpirit, updateSpirit, deleteSpirit } = useMasterSpirits();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category: "",
    bottle_size_ml: "",
    unit: "ml"
  });

  // Memoize filtered spirits to prevent recalculation on every render
  const filteredSpirits = useMemo(() => {
    if (!spirits) return [];
    if (!searchQuery.trim()) return spirits;
    const query = searchQuery.toLowerCase();
    return spirits.filter(spirit => 
      spirit.name.toLowerCase().includes(query) ||
      spirit.brand?.toLowerCase().includes(query) ||
      spirit.category?.toLowerCase().includes(query)
    );
  }, [spirits, searchQuery]);

  const handleOpenDialog = (spirit?: any) => {
    if (spirit) {
      setEditingId(spirit.id);
      setFormData({
        name: spirit.name,
        brand: spirit.brand || "",
        category: spirit.category || "",
        bottle_size_ml: String(spirit.bottle_size_ml),
        unit: spirit.unit || "ml"
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        brand: "",
        category: "",
        bottle_size_ml: "",
        unit: "ml"
      });
    }
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.bottle_size_ml) {
      toast.error("Please fill in spirit name and size");
      return;
    }

    if (editingId) {
      updateSpirit({
        id: editingId,
        updates: {
          name: formData.name,
          brand: formData.brand,
          category: formData.category,
          bottle_size_ml: parseFloat(formData.bottle_size_ml),
          unit: formData.unit
        }
      });
    } else {
      createSpirit({
        name: formData.name,
        brand: formData.brand,
        category: formData.category,
        bottle_size_ml: parseFloat(formData.bottle_size_ml),
        unit: formData.unit
      });
    }

    setShowDialog(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete ${name} from master list?`)) {
      deleteSpirit(id);
    }
  };

  const handleDeleteAll = async () => {
    if (!spirits || spirits.length === 0) {
      toast.error("No spirits to delete");
      return;
    }

    if (confirm(`Delete ALL ${spirits.length} spirits from master list? This cannot be undone.`)) {
      try {
        for (const spirit of spirits) {
          deleteSpirit(spirit.id);
        }
        toast.success("All spirits deleted successfully");
      } catch (error) {
        toast.error("Failed to delete all spirits");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32 sm:pb-24 pt-16">
      <TopNav />

      <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto mb-8 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="glass-hover shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Master Spirits List</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Edit and delete items below - Click the icons to manage
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={() => handleOpenDialog()}
              className="glass-hover"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={!spirits || spirits.length === 0}
              className="glass-hover"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
            </Button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search spirits by name, brand, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass"
          />
        </div>

        <Card className="glass p-4 sm:p-6">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading spirits...</p>
          ) : !spirits || spirits.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No spirits in master list yet</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Spirit
              </Button>
            </div>
          ) : filteredSpirits.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No spirits matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSpirits.map((spirit: any) => (
                <Card key={spirit.id} className="glass p-4 hover:bg-accent/10 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base sm:text-lg truncate">{spirit.name}</h3>
                        {spirit.source_type === 'sub_recipe' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                            Sub-Recipe
                          </span>
                        )}
                        {spirit.source_type === 'yield_calculator' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-600 rounded-full">
                            Yield Product
                          </span>
                        )}
                        {spirit.source_type === 'batch_recipe' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-600 rounded-full">
                            Batch Recipe
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground mt-1">
                        {spirit.brand && <span>Brand: {spirit.brand}</span>}
                        {spirit.category && <span>Category: {spirit.category}</span>}
                        <span className="text-primary font-semibold">
                          {spirit.source_type === 'sub_recipe' ? 'Yield' : 'Size'}: {spirit.bottle_size_ml}{spirit.unit || 'ml'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(spirit)}
                        className="glass-hover"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(spirit.id, spirit.name)}
                        className="glass-hover text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Spirit" : "Add New Spirit"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Spirit Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Vodka"
                className="glass"
              />
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., Grey Goose"
                className="glass"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Premium Vodka"
                className="glass"
              />
            </div>
            <div className="space-y-2">
              <Label>Size *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.bottle_size_ml}
                  onChange={(e) => setFormData({ ...formData, bottle_size_ml: e.target.value })}
                  placeholder="e.g., 750"
                  className="glass flex-1"
                />
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger className="w-32 glass">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Common: 50ml, 200ml, 375ml, 500ml, 750ml, 1L, 1kg
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default MasterSpirits;
