import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Edit2, X, Save } from "lucide-react";
import { toast } from "sonner";
import { useMasterSpirits } from "@/hooks/useMasterSpirits";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MasterSpirits = () => {
  const navigate = useNavigate();
  const { spirits, isLoading, createSpirit, updateSpirit, deleteSpirit } = useMasterSpirits();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category: "",
    bottle_size_ml: ""
  });

  const handleOpenDialog = (spirit?: any) => {
    if (spirit) {
      setEditingId(spirit.id);
      setFormData({
        name: spirit.name,
        brand: spirit.brand || "",
        category: spirit.category || "",
        bottle_size_ml: String(spirit.bottle_size_ml)
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        brand: "",
        category: "",
        bottle_size_ml: ""
      });
    }
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.bottle_size_ml) {
      toast.error("Please fill in spirit name and bottle size");
      return;
    }

    if (editingId) {
      updateSpirit({
        id: editingId,
        updates: {
          name: formData.name,
          brand: formData.brand,
          category: formData.category,
          bottle_size_ml: parseFloat(formData.bottle_size_ml)
        }
      });
    } else {
      createSpirit({
        name: formData.name,
        brand: formData.brand,
        category: formData.category,
        bottle_size_ml: parseFloat(formData.bottle_size_ml)
      });
    }

    setShowDialog(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete ${name} from master list?`)) {
      deleteSpirit(id);
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
              Manage your spirit inventory with bottle sizes
            </p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Spirit
          </Button>
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
          ) : (
            <div className="space-y-3">
              {spirits.map((spirit) => (
                <Card key={spirit.id} className="glass p-4 hover:bg-accent/10 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base sm:text-lg truncate">{spirit.name}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground mt-1">
                        {spirit.brand && <span>Brand: {spirit.brand}</span>}
                        {spirit.category && <span>Category: {spirit.category}</span>}
                        <span className="text-primary font-semibold">
                          Bottle: {spirit.bottle_size_ml}ml
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
              <Label>Bottle Size (ml) *</Label>
              <Input
                type="number"
                value={formData.bottle_size_ml}
                onChange={(e) => setFormData({ ...formData, bottle_size_ml: e.target.value })}
                placeholder="e.g., 750"
                className="glass"
              />
              <p className="text-xs text-muted-foreground">
                Standard sizes: 50ml, 200ml, 375ml, 500ml, 750ml, 1000ml
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
