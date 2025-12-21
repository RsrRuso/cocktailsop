import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MapPin, Plus, Building2, Pencil, Trash2, Loader2, Star } from "lucide-react";

interface Outlet {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  is_headquarters: boolean;
}

interface OutletManagerProps {
  venueId: string;
  outlets: Outlet[];
  isAdmin: boolean;
  onUpdate: () => void;
}

export const OutletManager = ({ venueId, outlets, isAdmin, onUpdate }: OutletManagerProps) => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    email: "",
    isHeadquarters: false,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      city: "",
      country: "",
      phone: "",
      email: "",
      isHeadquarters: false,
    });
    setEditingOutlet(null);
  };

  const handleEdit = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setFormData({
      name: outlet.name,
      address: outlet.address || "",
      city: outlet.city || "",
      country: outlet.country || "",
      phone: outlet.phone || "",
      email: outlet.email || "",
      isHeadquarters: outlet.is_headquarters,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (outletId: string) => {
    if (!confirm("Are you sure you want to delete this outlet?")) return;

    try {
      const { error } = await supabase
        .from("venue_outlets")
        .delete()
        .eq("id", outletId);

      if (error) throw error;

      toast({ title: "Outlet deleted" });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "Name Required",
        description: "Please enter an outlet name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (editingOutlet) {
        const { error } = await supabase
          .from("venue_outlets")
          .update({
            name: formData.name,
            address: formData.address,
            city: formData.city,
            country: formData.country,
            phone: formData.phone,
            email: formData.email,
            is_headquarters: formData.isHeadquarters,
          })
          .eq("id", editingOutlet.id);

        if (error) throw error;
        toast({ title: "Outlet updated" });
      } else {
        const { error } = await supabase
          .from("venue_outlets")
          .insert({
            venue_id: venueId,
            name: formData.name,
            address: formData.address,
            city: formData.city,
            country: formData.country,
            phone: formData.phone,
            email: formData.email,
            is_headquarters: formData.isHeadquarters,
          });

        if (error) throw error;
        toast({ title: "Outlet added" });
      }

      setIsDialogOpen(false);
      resetForm();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Outlets
          </CardTitle>
          <CardDescription>
            Manage your venue locations
          </CardDescription>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Add Outlet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingOutlet ? "Edit Outlet" : "Add New Outlet"}
                </DialogTitle>
                <DialogDescription>
                  {editingOutlet ? "Update outlet details" : "Add a new location for your venue"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="outletName">Outlet Name *</Label>
                  <Input
                    id="outletName"
                    placeholder="e.g., DIFC Branch"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outletAddress">Address</Label>
                  <Input
                    id="outletAddress"
                    placeholder="Full address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="outletCity">City</Label>
                    <Input
                      id="outletCity"
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="outletCountry">Country</Label>
                    <Input
                      id="outletCountry"
                      placeholder="Country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="outletPhone">Phone</Label>
                    <Input
                      id="outletPhone"
                      type="tel"
                      placeholder="+971..."
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="outletEmail">Email</Label>
                    <Input
                      id="outletEmail"
                      type="email"
                      placeholder="outlet@venue.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isHeadquarters"
                    checked={formData.isHeadquarters}
                    onChange={(e) => setFormData({ ...formData, isHeadquarters: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="isHeadquarters" className="text-sm">
                    This is the headquarters
                  </Label>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingOutlet ? (
                    "Update Outlet"
                  ) : (
                    "Add Outlet"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {outlets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No outlets added yet</p>
            <p className="text-sm">Add your first location</p>
          </div>
        ) : (
          <div className="space-y-3">
            {outlets.map((outlet) => (
              <div
                key={outlet.id}
                className="flex items-start justify-between p-4 rounded-lg border border-border/50 bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{outlet.name}</span>
                      {outlet.is_headquarters && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Star className="w-3 h-3" />
                          HQ
                        </Badge>
                      )}
                    </div>
                    {outlet.address && (
                      <p className="text-sm text-muted-foreground">{outlet.address}</p>
                    )}
                    {outlet.city && (
                      <p className="text-xs text-muted-foreground">
                        {outlet.city}{outlet.country ? `, ${outlet.country}` : ""}
                      </p>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(outlet)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(outlet.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
