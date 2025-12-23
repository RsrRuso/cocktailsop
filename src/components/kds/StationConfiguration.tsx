import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Settings, Plus, Trash2, Save, User, LayoutGrid,
  ChefHat, Wine, Utensils, IceCream, Filter
} from "lucide-react";

interface Station {
  id: string;
  name: string;
  type: string;
  assigned_bartender_id: string | null;
  category_filter: string[];
  max_orders_capacity: number;
  current_load: number;
  occupancy_threshold: number;
  overflow_station_id: string | null;
  assigned_tables: number[];
}

interface Staff {
  id: string;
  full_name: string;
  role: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

interface FloorTable {
  id: string;
  table_number: number | null;
  name: string;
}

interface StationConfigurationProps {
  open: boolean;
  onClose: () => void;
  outletId: string;
  onStationsChange?: () => void;
}

const STATION_TYPES = [
  { value: "HOT_KITCHEN", label: "Hot Kitchen", icon: ChefHat, color: "text-red-400" },
  { value: "COLD_KITCHEN", label: "Cold Kitchen", icon: IceCream, color: "text-blue-400" },
  { value: "BAR", label: "Bar", icon: Wine, color: "text-amber-400" },
  { value: "EXPO", label: "Expo/Pass", icon: Utensils, color: "text-green-400" },
];

export function StationConfiguration({ open, onClose, outletId, onStationsChange }: StationConfigurationProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [floorTables, setFloorTables] = useState<FloorTable[]>([]);
  const [newStationName, setNewStationName] = useState("");
  const [newStationType, setNewStationType] = useState("HOT_KITCHEN");
  const [isLoading, setIsLoading] = useState(false);
  const [activeType, setActiveType] = useState("all");

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, outletId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [stationsRes, staffRes, categoriesRes, tablesRes] = await Promise.all([
        supabase
          .from("lab_ops_stations")
          .select("*")
          .eq("outlet_id", outletId)
          .eq("is_active", true)
          .order("type"),
        supabase
          .from("lab_ops_staff")
          .select("id, full_name, role")
          .eq("outlet_id", outletId)
          .eq("is_active", true),
        supabase
          .from("lab_ops_categories")
          .select("id, name, type")
          .eq("outlet_id", outletId)
          .order("type")
          .order("sort_order"),
        supabase
          .from("lab_ops_tables")
          .select("id, table_number, name")
          .eq("outlet_id", outletId)
          .order("table_number", { ascending: true })
      ]);

      setStations((stationsRes.data || []).map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        assigned_bartender_id: s.assigned_bartender_id,
        category_filter: Array.isArray(s.category_filter) ? (s.category_filter as string[]) : [],
        max_orders_capacity: s.max_orders_capacity || 10,
        current_load: s.current_load || 0,
        occupancy_threshold: s.occupancy_threshold || 80,
        overflow_station_id: s.overflow_station_id,
        assigned_tables: Array.isArray(s.assigned_tables) ? (s.assigned_tables as number[]) : []
      })));
      setStaff(staffRes.data || []);
      setCategories(categoriesRes.data || []);
      setFloorTables(tablesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addStation = async () => {
    if (!newStationName.trim()) {
      toast({ title: "Enter a station name", variant: "destructive" });
      return;
    }
    
    try {
      await supabase.from("lab_ops_stations").insert({
        outlet_id: outletId,
        name: newStationName.trim(),
        type: newStationType,
        max_orders_capacity: 10,
        occupancy_threshold: 80,
        category_filter: [],
        assigned_tables: []
      });
      
      setNewStationName("");
      fetchData();
      onStationsChange?.();
      toast({ title: "Station added successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateStation = async (station: Station) => {
    try {
      await supabase
        .from("lab_ops_stations")
        .update({
          assigned_bartender_id: station.assigned_bartender_id,
          category_filter: station.category_filter,
          max_orders_capacity: station.max_orders_capacity,
          occupancy_threshold: station.occupancy_threshold,
          overflow_station_id: station.overflow_station_id,
          assigned_tables: station.assigned_tables
        })
        .eq("id", station.id);
      
      onStationsChange?.();
      toast({ title: "Station updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteStation = async (id: string) => {
    try {
      await supabase.from("lab_ops_stations").update({ is_active: false }).eq("id", id);
      fetchData();
      onStationsChange?.();
      toast({ title: "Station removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateStationLocal = (stationId: string, updates: Partial<Station>) => {
    setStations(prev => prev.map(s => 
      s.id === stationId ? { ...s, ...updates } : s
    ));
  };

  const toggleCategory = (stationId: string, categoryId: string) => {
    setStations(prev => prev.map(s => {
      if (s.id !== stationId) return s;
      const current = s.category_filter || [];
      const updated = current.includes(categoryId)
        ? current.filter(c => c !== categoryId)
        : [...current, categoryId];
      return { ...s, category_filter: updated };
    }));
  };

  const toggleTable = (stationId: string, tableNumber: number) => {
    setStations(prev => prev.map(s => {
      if (s.id !== stationId) return s;
      const current = s.assigned_tables || [];
      const updated = current.includes(tableNumber)
        ? current.filter(t => t !== tableNumber)
        : [...current, tableNumber].sort((a, b) => a - b);
      return { ...s, assigned_tables: updated };
    }));
  };

  const getStaffName = (id: string | null) => {
    if (!id) return "Unassigned";
    return staff.find(s => s.id === id)?.full_name || "Unknown";
  };

  const getStationIcon = (type: string) => {
    const config = STATION_TYPES.find(t => t.value === type);
    if (!config) return ChefHat;
    return config.icon;
  };

  const getStationColor = (type: string) => {
    const config = STATION_TYPES.find(t => t.value === type);
    return config?.color || "text-muted-foreground";
  };

  const filteredStations = activeType === "all" 
    ? stations 
    : stations.filter(s => s.type === activeType);

  const getCategoriesForStationType = (type: string) => {
    if (type === "BAR") return categories.filter(c => c.type === "drink");
    if (type === "HOT_KITCHEN" || type === "COLD_KITCHEN") return categories.filter(c => c.type === "food");
    return categories;
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="bg-card border-border max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Station Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Station */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Station Name</Label>
                  <Input
                    placeholder="e.g., Hot Kitchen, Bar 1, Cold Pass"
                    value={newStationName}
                    onChange={(e) => setNewStationName(e.target.value)}
                  />
                </div>
                <div className="w-40 space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={newStationType} onValueChange={setNewStationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATION_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className={`h-4 w-4 ${type.color}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addStation}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Station Type Tabs */}
          <Tabs value={activeType} onValueChange={setActiveType}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              {STATION_TYPES.map(type => (
                <TabsTrigger key={type.value} value={type.value}>
                  <type.icon className={`h-4 w-4 mr-1 ${type.color}`} />
                  <span className="hidden sm:inline">{type.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeType} className="mt-4">
              <ScrollArea className="h-[50vh]">
                {filteredStations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No stations configured. Add one above.
                  </div>
                ) : (
                  <div className="space-y-4 pr-2">
                    {filteredStations.map((station) => {
                      const Icon = getStationIcon(station.type);
                      const relevantCategories = getCategoriesForStationType(station.type);
                      
                      return (
                        <Card key={station.id} className="bg-muted/20">
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-base flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className={`h-5 w-5 ${getStationColor(station.type)}`} />
                                <span>{station.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {station.current_load}/{station.max_orders_capacity}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteStation(station.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4 px-4 pb-4">
                            {/* Staff Assignment */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                Assigned Staff
                              </Label>
                              <Select
                                value={station.assigned_bartender_id || "none"}
                                onValueChange={(v) => updateStationLocal(station.id, { 
                                  assigned_bartender_id: v === "none" ? null : v 
                                })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue>
                                    {getStaffName(station.assigned_bartender_id)}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Unassigned</SelectItem>
                                  {staff.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.full_name} ({s.role})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Category Filter */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Filter className="h-3.5 w-3.5" />
                                Menu Categories (empty = all)
                              </Label>
                              <div className="flex flex-wrap gap-1.5">
                                {relevantCategories.map((cat) => (
                                  <Badge
                                    key={cat.id}
                                    variant="outline"
                                    className={`cursor-pointer transition-colors text-xs ${
                                      station.category_filter?.includes(cat.id)
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "hover:border-primary/50"
                                    }`}
                                    onClick={() => toggleCategory(station.id, cat.id)}
                                  >
                                    {cat.name}
                                  </Badge>
                                ))}
                                {relevantCategories.length === 0 && (
                                  <p className="text-xs text-muted-foreground">No categories configured</p>
                                )}
                              </div>
                              {station.category_filter.length > 0 && (
                                <p className="text-xs text-primary">
                                  Only items from selected categories will appear
                                </p>
                              )}
                            </div>

                            {/* Assigned Tables */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <LayoutGrid className="h-3.5 w-3.5" />
                                Assigned Tables (empty = all)
                              </Label>
                              {floorTables.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No tables configured</p>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {floorTables
                                    .filter(t => t.table_number !== null)
                                    .map((table) => (
                                      <Badge
                                        key={table.id}
                                        variant="outline"
                                        className={`cursor-pointer transition-colors text-xs px-2 py-0.5 ${
                                          station.assigned_tables?.includes(table.table_number!)
                                            ? "bg-blue-500 text-white border-blue-500"
                                            : "hover:border-blue-400"
                                        }`}
                                        onClick={() => toggleTable(station.id, table.table_number!)}
                                      >
                                        T{table.table_number}
                                      </Badge>
                                    ))}
                                </div>
                              )}
                            </div>

                            {/* Capacity Settings */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Max Capacity</Label>
                                <Input
                                  type="number"
                                  value={station.max_orders_capacity}
                                  onChange={(e) => updateStationLocal(station.id, {
                                    max_orders_capacity: parseInt(e.target.value) || 10
                                  })}
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Overflow %</Label>
                                <Input
                                  type="number"
                                  value={station.occupancy_threshold}
                                  onChange={(e) => updateStationLocal(station.id, {
                                    occupancy_threshold: parseInt(e.target.value) || 80
                                  })}
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Overflow To</Label>
                                <Select
                                  value={station.overflow_station_id || "none"}
                                  onValueChange={(v) => updateStationLocal(station.id, {
                                    overflow_station_id: v === "none" ? null : v
                                  })}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="None" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {stations
                                      .filter(s => s.id !== station.id && s.type === station.type)
                                      .map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <Button
                              onClick={() => updateStation(station)}
                              className="w-full"
                              size="sm"
                            >
                              <Save className="h-4 w-4 mr-2" /> Save Station
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
