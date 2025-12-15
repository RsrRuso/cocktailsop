import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, User, Trash2, Settings, Save, LayoutGrid } from "lucide-react";

interface Station {
  id: string;
  name: string;
  type: string;
  assigned_bartender_id: string | null;
  category_filter: string[];
  max_orders_capacity: number;
  current_load: number;
  occupancy_threshold: number;
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
}

interface FloorTable {
  id: string;
  table_number: number | null;
  name: string;
}

interface StationManagementProps {
  open: boolean;
  onClose: () => void;
  outletId: string;
  onStationsChange: () => void;
}

export function StationManagement({ open, onClose, outletId, onStationsChange }: StationManagementProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [floorTables, setFloorTables] = useState<FloorTable[]>([]);
  const [newStationName, setNewStationName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
          .eq("type", "BAR")
          .eq("is_active", true),
        supabase
          .from("lab_ops_staff")
          .select("id, full_name, role")
          .eq("outlet_id", outletId)
          .eq("is_active", true)
          .in("role", ["bartender", "manager", "supervisor"]),
        supabase
          .from("lab_ops_categories")
          .select("id, name")
          .eq("outlet_id", outletId)
          .eq("type", "drink"),
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
        category_filter: Array.isArray(s.category_filter) 
          ? (s.category_filter as string[]) 
          : [],
        max_orders_capacity: s.max_orders_capacity || 10,
        current_load: s.current_load || 0,
        occupancy_threshold: s.occupancy_threshold || 80,
        assigned_tables: Array.isArray(s.assigned_tables) 
          ? (s.assigned_tables as number[]) 
          : []
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
    if (!newStationName.trim()) return;
    
    try {
      await supabase.from("lab_ops_stations").insert({
        outlet_id: outletId,
        name: newStationName.trim(),
        type: "BAR",
        max_orders_capacity: 10,
        occupancy_threshold: 80
      });
      
      setNewStationName("");
      fetchData();
      onStationsChange();
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
          assigned_tables: station.assigned_tables
        })
        .eq("id", station.id);
      
      onStationsChange();
      toast({ title: "Station updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
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

  const deleteStation = async (id: string) => {
    try {
      await supabase.from("lab_ops_stations").update({ is_active: false }).eq("id", id);
      fetchData();
      onStationsChange();
      toast({ title: "Station removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const assignBartender = (stationId: string, bartenderId: string | null) => {
    setStations(prev => prev.map(s => 
      s.id === stationId ? { ...s, assigned_bartender_id: bartenderId } : s
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

  const getBartenderName = (id: string | null) => {
    if (!id) return "Unassigned";
    return staff.find(s => s.id === id)?.full_name || "Unknown";
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-400" />
            Bar Station Management
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[65vh] pr-2">
          <div className="space-y-4">
            {/* Add New Station */}
            <div className="flex gap-2">
              <Input
                placeholder="New station name (e.g., Bar 1, Cocktail Station)"
                value={newStationName}
                onChange={(e) => setNewStationName(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />
              <Button onClick={addStation} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            {/* Station List */}
            {stations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No bar stations configured. Add one above.
              </div>
            ) : (
              <div className="space-y-4">
                {stations.map((station) => (
                  <Card key={station.id} className="bg-gray-800 border-gray-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="text-white">{station.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-amber-400 border-amber-400">
                            {station.current_load}/{station.max_orders_capacity} orders
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteStation(station.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Bartender Assignment */}
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-400">Assigned Bartender</Label>
                        <Select
                          value={station.assigned_bartender_id || "none"}
                          onValueChange={(v) => assignBartender(station.id, v === "none" ? null : v)}
                        >
                          <SelectTrigger className="bg-gray-700 border-gray-600">
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {getBartenderName(station.assigned_bartender_id)}
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
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
                        <Label className="text-sm text-gray-400">Drink Categories (leave empty for all)</Label>
                        <div className="flex flex-wrap gap-2">
                          {categories.map((cat) => (
                            <Badge
                              key={cat.id}
                              variant="outline"
                              className={`cursor-pointer transition-colors ${
                                station.category_filter?.includes(cat.id)
                                  ? "bg-amber-600 text-white border-amber-600"
                                  : "text-gray-400 border-gray-600 hover:border-amber-400"
                              }`}
                              onClick={() => toggleCategory(station.id, cat.id)}
                            >
                              {cat.name}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Assigned Tables */}
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-400 flex items-center gap-2">
                          <LayoutGrid className="h-3.5 w-3.5" />
                          Assigned Tables (leave empty for all)
                        </Label>
                        {floorTables.length === 0 ? (
                          <p className="text-xs text-gray-500">No tables configured in floor plan</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {floorTables
                              .filter(t => t.table_number !== null)
                              .map((table) => (
                                <Badge
                                  key={table.id}
                                  variant="outline"
                                  className={`cursor-pointer transition-colors text-xs px-2 py-0.5 ${
                                    station.assigned_tables?.includes(table.table_number!)
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "text-gray-400 border-gray-600 hover:border-blue-400"
                                  }`}
                                  onClick={() => toggleTable(station.id, table.table_number!)}
                                >
                                  T{table.table_number}
                                </Badge>
                              ))}
                          </div>
                        )}
                        {station.assigned_tables?.length > 0 && (
                          <p className="text-xs text-blue-400">
                            Only orders from tables {station.assigned_tables.join(", ")} will route here
                          </p>
                        )}
                      </div>

                      {/* Capacity Settings */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm text-gray-400">Max Orders Capacity</Label>
                          <Input
                            type="number"
                            value={station.max_orders_capacity}
                            onChange={(e) => setStations(prev => prev.map(s =>
                              s.id === station.id ? { ...s, max_orders_capacity: parseInt(e.target.value) || 10 } : s
                            ))}
                            className="bg-gray-700 border-gray-600"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-gray-400">Overflow Threshold %</Label>
                          <Input
                            type="number"
                            value={station.occupancy_threshold}
                            onChange={(e) => setStations(prev => prev.map(s =>
                              s.id === station.id ? { ...s, occupancy_threshold: parseInt(e.target.value) || 80 } : s
                            ))}
                            className="bg-gray-700 border-gray-600"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={() => updateStation(station)}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Save className="h-4 w-4 mr-2" /> Save Station
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
