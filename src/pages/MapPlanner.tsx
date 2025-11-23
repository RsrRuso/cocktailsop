import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, Edit, MapPin, Box, List, Save } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

const EQUIPMENT_TYPES = [
  { value: "fridge", label: "Fridge" },
  { value: "freezer", label: "Freezer" },
  { value: "walk_in_fridge", label: "Walk-in Fridge" },
  { value: "walk_in_freezer", label: "Walk-in Freezer" },
  { value: "cabinet", label: "Cabinet" },
  { value: "trolley", label: "Trolley/Cart" },
  { value: "alcohol_storage", label: "Alcohol Storage" },
  { value: "non_alcohol_storage", label: "Non-Alcohol Storage" },
  { value: "ice_section", label: "Ice Section" },
  { value: "rail", label: "Rail" },
];

const AREA_TYPES = [
  { value: "station", label: "Station" },
  { value: "storage", label: "Storage" },
  { value: "prep", label: "Prep Area" },
  { value: "service", label: "Service Area" },
];

const ITEM_CATEGORIES = [
  "Purees/Syrups/Brine",
  "Juices/Premixes",
  "Tools",
  "Garnishes",
  "Fresh Ingredients",
  "Spirits",
  "Liqueurs",
  "Wines",
  "Beers",
  "Other",
];

export default function MapPlanner() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);

  // Fetch location maps
  const { data: maps } = useQuery({
    queryKey: ["location_maps", user?.id, currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_maps")
        .select("*")
        .eq("user_id", user?.id)
        .eq("workspace_id", currentWorkspace?.id || null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch areas for selected map
  const { data: areas } = useQuery({
    queryKey: ["location_areas", selectedMap],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_areas")
        .select("*")
        .eq("map_id", selectedMap)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedMap,
  });

  // Fetch equipment for selected area
  const { data: equipment } = useQuery({
    queryKey: ["area_equipment", selectedArea],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("area_equipment")
        .select("*")
        .eq("area_id", selectedArea)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedArea,
  });

  // Fetch items for selected equipment
  const { data: items } = useQuery({
    queryKey: ["equipment_items", selectedEquipment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_items")
        .select("*")
        .eq("equipment_id", selectedEquipment)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedEquipment,
  });

  // Create map mutation
  const createMapMutation = useMutation({
    mutationFn: async (formData: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from("location_maps")
        .insert({
          user_id: user?.id,
          workspace_id: currentWorkspace?.id || null,
          ...formData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location_maps"] });
      toast.success("Map created successfully");
    },
  });

  // Create area mutation
  const createAreaMutation = useMutation({
    mutationFn: async (formData: { name: string; area_type: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("location_areas")
        .insert({
          map_id: selectedMap,
          ...formData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location_areas"] });
      toast.success("Area created successfully");
    },
  });

  // Create equipment mutation
  const createEquipmentMutation = useMutation({
    mutationFn: async (formData: {
      name: string;
      equipment_type: string;
      capacity?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("area_equipment")
        .insert({
          area_id: selectedArea,
          ...formData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["area_equipment"] });
      toast.success("Equipment added successfully");
    },
  });

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: async (formData: {
      item_name: string;
      category?: string;
      quantity?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("equipment_items")
        .insert({
          equipment_id: selectedEquipment,
          ...formData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment_items"] });
      toast.success("Item added successfully");
    },
  });

  // Delete mutations
  const deleteMapMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("location_maps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location_maps"] });
      toast.success("Map deleted");
      setSelectedMap(null);
    },
  });

  const deleteAreaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("location_areas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location_areas"] });
      toast.success("Area deleted");
      setSelectedArea(null);
    },
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("area_equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["area_equipment"] });
      toast.success("Equipment deleted");
      setSelectedEquipment(null);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment_items"] });
      toast.success("Item deleted");
    },
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />

      <div className="container mx-auto px-4 pt-20 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Map Planner</h1>
            <p className="text-muted-foreground">
              Design your venue layout and assign equipment with items
            </p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Map
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Map</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createMapMutation.mutate({
                    name: formData.get("name") as string,
                    description: formData.get("description") as string,
                  });
                  (e.target as HTMLFormElement).reset();
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="name">Map Name</Label>
                  <Input id="name" name="name" placeholder="e.g., Main Bar Layout" required />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Brief description of this map"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Map
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Maps List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Maps</CardTitle>
              <CardDescription>Select a venue map</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {maps?.map((map) => (
                <div
                  key={map.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedMap === map.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => {
                    setSelectedMap(map.id);
                    setSelectedArea(null);
                    setSelectedEquipment(null);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">{map.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this map?")) {
                          deleteMapMutation.mutate(map.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {map.description && (
                    <p className="text-sm text-muted-foreground mt-1">{map.description}</p>
                  )}
                </div>
              ))}
              {maps?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No maps yet. Create one!</p>
              )}
            </CardContent>
          </Card>

          {/* Areas/Stations */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Areas</CardTitle>
                  <CardDescription>Stations & zones</CardDescription>
                </div>
                {selectedMap && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Area</DialogTitle>
                      </DialogHeader>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          createAreaMutation.mutate({
                            name: formData.get("name") as string,
                            area_type: formData.get("area_type") as string,
                            notes: formData.get("notes") as string,
                          });
                          (e.target as HTMLFormElement).reset();
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <Label htmlFor="area_name">Area Name</Label>
                          <Input
                            id="area_name"
                            name="name"
                            placeholder="e.g., Station 1"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="area_type">Type</Label>
                          <Select name="area_type" required>
                            <SelectTrigger id="area_type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {AREA_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="area_notes">Notes</Label>
                          <Textarea id="area_notes" name="notes" />
                        </div>
                        <Button type="submit" className="w-full">
                          Add Area
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {!selectedMap && (
                <p className="text-center text-muted-foreground py-8">Select a map first</p>
              )}
              {selectedMap &&
                areas?.map((area) => (
                  <div
                    key={area.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedArea === area.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => {
                      setSelectedArea(area.id);
                      setSelectedEquipment(null);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{area.name}</span>
                        <p className="text-xs opacity-75">{area.area_type}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this area?")) {
                            deleteAreaMutation.mutate(area.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              {selectedMap && areas?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No areas yet</p>
              )}
            </CardContent>
          </Card>

          {/* Equipment */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Equipment</CardTitle>
                  <CardDescription>Storage & tools</CardDescription>
                </div>
                {selectedArea && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Equipment</DialogTitle>
                      </DialogHeader>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          createEquipmentMutation.mutate({
                            name: formData.get("name") as string,
                            equipment_type: formData.get("equipment_type") as string,
                            capacity: formData.get("capacity") as string,
                            notes: formData.get("notes") as string,
                          });
                          (e.target as HTMLFormElement).reset();
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <Label htmlFor="equip_name">Equipment Name</Label>
                          <Input
                            id="equip_name"
                            name="name"
                            placeholder="e.g., Main Fridge"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="equip_type">Type</Label>
                          <Select name="equipment_type" required>
                            <SelectTrigger id="equip_type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {EQUIPMENT_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="capacity">Capacity</Label>
                          <Input id="capacity" name="capacity" placeholder="e.g., 12 bottles" />
                        </div>
                        <div>
                          <Label htmlFor="equip_notes">Notes</Label>
                          <Textarea id="equip_notes" name="notes" />
                        </div>
                        <Button type="submit" className="w-full">
                          Add Equipment
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {!selectedArea && (
                <p className="text-center text-muted-foreground py-8">Select an area first</p>
              )}
              {selectedArea &&
                equipment?.map((equip) => (
                  <div
                    key={equip.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedEquipment === equip.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => setSelectedEquipment(equip.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Box className="h-4 w-4" />
                          <span className="font-medium">{equip.name}</span>
                        </div>
                        <p className="text-xs opacity-75">
                          {EQUIPMENT_TYPES.find((t) => t.value === equip.equipment_type)?.label}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this equipment?")) {
                            deleteEquipmentMutation.mutate(equip.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              {selectedArea && equipment?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No equipment yet</p>
              )}
            </CardContent>
          </Card>

          {/* Items List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Items</CardTitle>
                  <CardDescription>Ingredients & tools</CardDescription>
                </div>
                {selectedEquipment && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Item</DialogTitle>
                      </DialogHeader>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          createItemMutation.mutate({
                            item_name: formData.get("item_name") as string,
                            category: formData.get("category") as string,
                            quantity: formData.get("quantity") as string,
                            notes: formData.get("notes") as string,
                          });
                          (e.target as HTMLFormElement).reset();
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <Label htmlFor="item_name">Item Name</Label>
                          <Input
                            id="item_name"
                            name="item_name"
                            placeholder="e.g., Raspberry Puree"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select name="category">
                            <SelectTrigger id="category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {ITEM_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="quantity">Quantity</Label>
                          <Input
                            id="quantity"
                            name="quantity"
                            placeholder="e.g., 2 bottles"
                          />
                        </div>
                        <div>
                          <Label htmlFor="item_notes">Notes</Label>
                          <Textarea id="item_notes" name="notes" />
                        </div>
                        <Button type="submit" className="w-full">
                          Add Item
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {!selectedEquipment && (
                <p className="text-center text-muted-foreground py-8">
                  Select equipment first
                </p>
              )}
              {selectedEquipment && (
                <Accordion type="single" collapsible className="w-full">
                  {ITEM_CATEGORIES.map((category) => {
                    const categoryItems = items?.filter((item) => item.category === category);
                    if (!categoryItems || categoryItems.length === 0) return null;

                    return (
                      <AccordionItem key={category} value={category}>
                        <AccordionTrigger className="text-sm">
                          {category} ({categoryItems.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {categoryItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 rounded border"
                              >
                                <div>
                                  <p className="font-medium text-sm">{item.item_name}</p>
                                  {item.quantity && (
                                    <p className="text-xs text-muted-foreground">
                                      {item.quantity}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm("Delete this item?")) {
                                      deleteItemMutation.mutate(item.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
              {selectedEquipment && items?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No items yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
