import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  Plus, Trash2, Edit, Save, Grid3X3, LayoutGrid, Users, 
  Circle, Square, RectangleHorizontal, Armchair, TrendingUp,
  DollarSign, Clock, RefreshCw, MapPin
} from "lucide-react";

interface Table {
  id: string;
  name: string;
  table_number: number | null;
  capacity: number | null;
  standing_capacity: number | null;
  shape: string | null;
  allocation: string | null;
  min_covers: number | null;
  is_reservable: boolean | null;
  notes: string | null;
  status: string | null;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  floor_plan_id: string | null;
}

interface FloorPlan {
  id: string;
  name: string;
  floor_number: number | null;
  canvas_width: number | null;
  canvas_height: number | null;
  is_active: boolean | null;
}

interface VenueCapacity {
  id: string;
  total_seated_capacity: number | null;
  total_standing_capacity: number | null;
  max_occupancy: number | null;
  notes: string | null;
}

interface TableAnalytics {
  tableId: string;
  tableName: string;
  turnoverCount: number;
  avgCheck: number;
  avgCheckPerPerson: number;
  totalRevenue: number;
}

const SHAPES = [
  { value: "square", label: "Square", icon: Square },
  { value: "round", label: "Round", icon: Circle },
  { value: "rectangle", label: "Rectangle", icon: RectangleHorizontal },
  { value: "bar", label: "Bar Seat", icon: Armchair },
  { value: "booth", label: "Booth", icon: RectangleHorizontal },
];

const ALLOCATIONS = [
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "patio", label: "Patio" },
  { value: "terrace", label: "Terrace" },
  { value: "rooftop", label: "Rooftop" },
  { value: "private", label: "Private Room" },
];

export default function TableManagement({ outletId }: { outletId: string }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [venueCapacity, setVenueCapacity] = useState<VenueCapacity | null>(null);
  const [analytics, setAnalytics] = useState<TableAnalytics[]>([]);
  const [activeTab, setActiveTab] = useState("tables");
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<string | null>(null);
  
  // Dialog states
  const [showAddTable, setShowAddTable] = useState(false);
  const [showAddFloorPlan, setShowAddFloorPlan] = useState(false);
  const [showCapacitySettings, setShowCapacitySettings] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  
  // Form states for new table
  const [newTable, setNewTable] = useState({
    name: "",
    table_number: "",
    capacity: "4",
    standing_capacity: "0",
    shape: "square",
    allocation: "indoor",
    min_covers: "1",
    is_reservable: true,
    notes: ""
  });
  
  // Form states for floor plan
  const [newFloorPlan, setNewFloorPlan] = useState({
    name: "",
    floor_number: "1",
    canvas_width: "800",
    canvas_height: "600"
  });
  
  // Form states for capacity
  const [capacityForm, setCapacityForm] = useState({
    total_seated_capacity: "0",
    total_standing_capacity: "0",
    max_occupancy: "0",
    notes: ""
  });

  // Floor plan designer state
  const [selectedTableForMove, setSelectedTableForMove] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTables();
    fetchFloorPlans();
    fetchVenueCapacity();
    fetchAnalytics();
  }, [outletId]);

  const fetchTables = async () => {
    const { data, error } = await supabase
      .from("lab_ops_tables")
      .select("*")
      .eq("outlet_id", outletId)
      .order("table_number", { ascending: true, nullsFirst: false });
    
    if (!error && data) {
      setTables(data as Table[]);
    }
  };

  const fetchFloorPlans = async () => {
    const { data, error } = await supabase
      .from("lab_ops_floor_plans")
      .select("*")
      .eq("outlet_id", outletId)
      .order("floor_number");
    
    if (!error && data) {
      setFloorPlans(data as FloorPlan[]);
      if (data.length > 0 && !selectedFloorPlan) {
        setSelectedFloorPlan(data[0].id);
      }
    }
  };

  const fetchVenueCapacity = async () => {
    const { data, error } = await supabase
      .from("lab_ops_venue_capacity")
      .select("*")
      .eq("outlet_id", outletId)
      .single();
    
    if (!error && data) {
      setVenueCapacity(data as VenueCapacity);
      setCapacityForm({
        total_seated_capacity: String(data.total_seated_capacity || 0),
        total_standing_capacity: String(data.total_standing_capacity || 0),
        max_occupancy: String(data.max_occupancy || 0),
        notes: data.notes || ""
      });
    }
  };

  const fetchAnalytics = async () => {
    // Get closed orders from last 30 days with table info
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: orders, error } = await supabase
      .from("lab_ops_orders")
      .select("id, table_id, total_amount, covers, closed_at, lab_ops_tables(name)")
      .eq("outlet_id", outletId)
      .eq("status", "closed")
      .gte("closed_at", thirtyDaysAgo.toISOString());
    
    if (!error && orders) {
      // Aggregate by table
      const tableStats: Record<string, TableAnalytics> = {};
      
      orders.forEach((order: any) => {
        if (!order.table_id) return;
        
        if (!tableStats[order.table_id]) {
          tableStats[order.table_id] = {
            tableId: order.table_id,
            tableName: order.lab_ops_tables?.name || "Unknown",
            turnoverCount: 0,
            avgCheck: 0,
            avgCheckPerPerson: 0,
            totalRevenue: 0
          };
        }
        
        tableStats[order.table_id].turnoverCount++;
        tableStats[order.table_id].totalRevenue += order.total_amount || 0;
      });
      
      // Calculate averages
      Object.values(tableStats).forEach(stat => {
        if (stat.turnoverCount > 0) {
          stat.avgCheck = stat.totalRevenue / stat.turnoverCount;
          // Get average covers per order for this table
          const tableOrders = orders.filter((o: any) => o.table_id === stat.tableId);
          const totalCovers = tableOrders.reduce((sum: number, o: any) => sum + (o.covers || 1), 0);
          stat.avgCheckPerPerson = stat.totalRevenue / (totalCovers || 1);
        }
      });
      
      setAnalytics(Object.values(tableStats).sort((a, b) => b.totalRevenue - a.totalRevenue));
    }
  };

  const createTable = async () => {
    if (!newTable.name.trim()) {
      toast({ title: "Please enter a table name", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("lab_ops_tables").insert({
      outlet_id: outletId,
      name: newTable.name.trim(),
      table_number: newTable.table_number ? parseInt(newTable.table_number) : null,
      capacity: parseInt(newTable.capacity) || 4,
      standing_capacity: parseInt(newTable.standing_capacity) || 0,
      shape: newTable.shape,
      allocation: newTable.allocation,
      min_covers: parseInt(newTable.min_covers) || 1,
      is_reservable: newTable.is_reservable,
      notes: newTable.notes || null,
      floor_plan_id: selectedFloorPlan
    });

    if (error) {
      toast({ title: "Error creating table", description: error.message, variant: "destructive" });
      return;
    }

    setNewTable({
      name: "", table_number: "", capacity: "4", standing_capacity: "0",
      shape: "square", allocation: "indoor", min_covers: "1", is_reservable: true, notes: ""
    });
    setShowAddTable(false);
    fetchTables();
    toast({ title: "Table created" });
  };

  const updateTable = async () => {
    if (!editingTable) return;

    const { error } = await supabase
      .from("lab_ops_tables")
      .update({
        name: editingTable.name,
        table_number: editingTable.table_number,
        capacity: editingTable.capacity,
        standing_capacity: editingTable.standing_capacity,
        shape: editingTable.shape,
        allocation: editingTable.allocation,
        min_covers: editingTable.min_covers,
        is_reservable: editingTable.is_reservable,
        notes: editingTable.notes,
        position_x: editingTable.position_x,
        position_y: editingTable.position_y,
        width: editingTable.width,
        height: editingTable.height
      })
      .eq("id", editingTable.id);

    if (error) {
      toast({ title: "Error updating table", description: error.message, variant: "destructive" });
      return;
    }

    setEditingTable(null);
    fetchTables();
    toast({ title: "Table updated" });
  };

  const deleteTable = async (id: string) => {
    const { error } = await supabase.from("lab_ops_tables").delete().eq("id", id);
    if (!error) {
      fetchTables();
      toast({ title: "Table deleted" });
    }
  };

  const createFloorPlan = async () => {
    if (!newFloorPlan.name.trim()) return;

    const { error } = await supabase.from("lab_ops_floor_plans").insert({
      outlet_id: outletId,
      name: newFloorPlan.name.trim(),
      floor_number: parseInt(newFloorPlan.floor_number) || 1,
      canvas_width: parseInt(newFloorPlan.canvas_width) || 800,
      canvas_height: parseInt(newFloorPlan.canvas_height) || 600
    });

    if (!error) {
      setNewFloorPlan({ name: "", floor_number: "1", canvas_width: "800", canvas_height: "600" });
      setShowAddFloorPlan(false);
      fetchFloorPlans();
      toast({ title: "Floor plan created" });
    }
  };

  const saveVenueCapacity = async () => {
    const payload = {
      outlet_id: outletId,
      total_seated_capacity: parseInt(capacityForm.total_seated_capacity) || 0,
      total_standing_capacity: parseInt(capacityForm.total_standing_capacity) || 0,
      max_occupancy: parseInt(capacityForm.max_occupancy) || 0,
      notes: capacityForm.notes || null
    };

    if (venueCapacity) {
      const { error } = await supabase
        .from("lab_ops_venue_capacity")
        .update(payload)
        .eq("id", venueCapacity.id);
      
      if (!error) {
        fetchVenueCapacity();
        setShowCapacitySettings(false);
        toast({ title: "Capacity settings saved" });
      }
    } else {
      const { error } = await supabase.from("lab_ops_venue_capacity").insert(payload);
      
      if (!error) {
        fetchVenueCapacity();
        setShowCapacitySettings(false);
        toast({ title: "Capacity settings saved" });
      }
    }
  };

  const handleTableDrag = (tableId: string, x: number, y: number) => {
    setTables(prev => prev.map(t => 
      t.id === tableId ? { ...t, position_x: x, position_y: y } : t
    ));
  };

  const saveTablePosition = async (table: Table) => {
    await supabase
      .from("lab_ops_tables")
      .update({ position_x: table.position_x, position_y: table.position_y })
      .eq("id", table.id);
  };

  // Calculate totals
  const totalSeatedCapacity = tables.reduce((sum, t) => sum + (t.capacity || 0), 0);
  const totalStandingCapacity = tables.reduce((sum, t) => sum + (t.standing_capacity || 0), 0);
  const totalCapacity = totalSeatedCapacity + totalStandingCapacity;
  const tablesByAllocation = tables.reduce((acc, t) => {
    const alloc = t.allocation || "indoor";
    acc[alloc] = (acc[alloc] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const tablesByShape = tables.reduce((acc, t) => {
    const shape = t.shape || "square";
    acc[shape] = (acc[shape] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const floorPlanTables = tables.filter(t => 
    !selectedFloorPlan || t.floor_plan_id === selectedFloorPlan || !t.floor_plan_id
  );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Tables</p>
                <p className="text-2xl font-bold">{tables.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Seated Capacity</p>
                <p className="text-2xl font-bold">{totalSeatedCapacity}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Standing</p>
                <p className="text-2xl font-bold">{venueCapacity?.total_standing_capacity || totalStandingCapacity}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Max Occupancy</p>
                <p className="text-2xl font-bold">{venueCapacity?.max_occupancy || totalCapacity}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="floorplan">Floor Plan</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
        </TabsList>

        {/* Tables Tab */}
        <TabsContent value="tables" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Tables</CardTitle>
              <Dialog open={showAddTable} onOpenChange={setShowAddTable}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Table</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Table</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Name</Label>
                        <Input 
                          value={newTable.name} 
                          onChange={(e) => setNewTable({...newTable, name: e.target.value})}
                          placeholder="e.g., T1, Bar 1"
                        />
                      </div>
                      <div>
                        <Label>Table Number</Label>
                        <Input 
                          type="number"
                          value={newTable.table_number} 
                          onChange={(e) => setNewTable({...newTable, table_number: e.target.value})}
                          placeholder="1"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Seated Capacity</Label>
                        <Input 
                          type="number"
                          value={newTable.capacity} 
                          onChange={(e) => setNewTable({...newTable, capacity: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Standing Capacity</Label>
                        <Input 
                          type="number"
                          value={newTable.standing_capacity} 
                          onChange={(e) => setNewTable({...newTable, standing_capacity: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Shape</Label>
                        <Select value={newTable.shape} onValueChange={(v) => setNewTable({...newTable, shape: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SHAPES.map(s => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Allocation</Label>
                        <Select value={newTable.allocation} onValueChange={(v) => setNewTable({...newTable, allocation: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ALLOCATIONS.map(a => (
                              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Min Covers</Label>
                        <Input 
                          type="number"
                          value={newTable.min_covers} 
                          onChange={(e) => setNewTable({...newTable, min_covers: e.target.value})}
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Switch 
                          checked={newTable.is_reservable}
                          onCheckedChange={(c) => setNewTable({...newTable, is_reservable: c})}
                        />
                        <Label>Reservable</Label>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Notes</Label>
                      <Textarea 
                        value={newTable.notes} 
                        onChange={(e) => setNewTable({...newTable, notes: e.target.value})}
                        placeholder="Window seat, near entrance..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={createTable}>Create Table</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {tables.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No tables configured</p>
                ) : (
                  <div className="space-y-2">
                    {tables.map((table) => (
                      <div key={table.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="font-bold text-primary">{table.table_number || "#"}</span>
                          </div>
                          <div>
                            <p className="font-medium">{table.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{table.capacity} seats</span>
                              {(table.standing_capacity || 0) > 0 && (
                                <span>+{table.standing_capacity} standing</span>
                              )}
                              <Badge variant="outline" className="text-xs">{table.shape}</Badge>
                              <Badge variant="secondary" className="text-xs">{table.allocation}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setEditingTable(table)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteTable(table.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              
              {/* Breakdown by Allocation and Shape */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">By Allocation</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {Object.entries(tablesByAllocation).map(([alloc, count]) => (
                        <div key={alloc} className="flex justify-between text-sm">
                          <span className="capitalize">{alloc}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">By Shape</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {Object.entries(tablesByShape).map(([shape, count]) => (
                        <div key={shape} className="flex justify-between text-sm">
                          <span className="capitalize">{shape}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Floor Plan Tab */}
        <TabsContent value="floorplan" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">Floor Plan Designer</CardTitle>
                {floorPlans.length > 0 && (
                  <Select value={selectedFloorPlan || ""} onValueChange={setSelectedFloorPlan}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select floor" />
                    </SelectTrigger>
                    <SelectContent>
                      {floorPlans.map(fp => (
                        <SelectItem key={fp.id} value={fp.id}>
                          {fp.name} (Floor {fp.floor_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Dialog open={showAddFloorPlan} onOpenChange={setShowAddFloorPlan}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Add Floor</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Floor Plan</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Name</Label>
                      <Input 
                        value={newFloorPlan.name}
                        onChange={(e) => setNewFloorPlan({...newFloorPlan, name: e.target.value})}
                        placeholder="Main Floor, Rooftop..."
                      />
                    </div>
                    <div>
                      <Label>Floor Number</Label>
                      <Input 
                        type="number"
                        value={newFloorPlan.floor_number}
                        onChange={(e) => setNewFloorPlan({...newFloorPlan, floor_number: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={createFloorPlan}>Create Floor Plan</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {/* Canvas Area */}
                <div className="flex-1">
                  <div 
                    ref={canvasRef}
                    className="relative w-full h-[500px] bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20 overflow-hidden"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const tableId = e.dataTransfer.getData("tableId");
                      if (tableId && canvasRef.current) {
                        const rect = canvasRef.current.getBoundingClientRect();
                        const x = e.clientX - rect.left - 40;
                        const y = e.clientY - rect.top - 40;
                        handleTableDrag(tableId, Math.max(0, x), Math.max(0, y));
                        const table = tables.find(t => t.id === tableId);
                        if (table) {
                          saveTablePosition({ ...table, position_x: Math.max(0, x), position_y: Math.max(0, y) });
                        }
                      }
                    }}
                  >
                    <div className="absolute inset-0" style={{ 
                      backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.2) 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }}>
                      {floorPlanTables.map((table) => {
                        const x = table.position_x ?? 50;
                        const y = table.position_y ?? 50;
                        const width = table.width || (table.shape === "rectangle" ? 120 : table.shape === "bar" ? 40 : 80);
                        const height = table.height || (table.shape === "rectangle" ? 60 : table.shape === "bar" ? 80 : 80);
                        
                        const allocationColors: Record<string, string> = {
                          indoor: "bg-blue-500",
                          outdoor: "bg-green-500",
                          patio: "bg-amber-500",
                          terrace: "bg-orange-500",
                          rooftop: "bg-purple-500",
                          private: "bg-pink-500"
                        };
                        const bgColor = allocationColors[table.allocation || "indoor"] || "bg-primary";
                        
                        return (
                          <div
                            key={table.id}
                            className={`absolute cursor-grab active:cursor-grabbing transition-shadow hover:shadow-lg ${
                              selectedTableForMove === table.id ? "ring-2 ring-primary ring-offset-2" : ""
                            } ${table.status === "seated" ? "opacity-60" : ""} ${bgColor}`}
                            style={{
                              left: x,
                              top: y,
                              width,
                              height,
                              borderRadius: table.shape === "round" ? "50%" : table.shape === "booth" ? "12px" : "6px",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                            }}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("tableId", table.id);
                              setSelectedTableForMove(table.id);
                            }}
                            onDragEnd={() => setSelectedTableForMove(null)}
                            onClick={() => setSelectedTableForMove(selectedTableForMove === table.id ? null : table.id)}
                          >
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-xs font-bold drop-shadow">
                              <span>{table.name}</span>
                              <span className="opacity-80 text-[10px]">{table.capacity} seats</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span>🖱️ Drag tables to position</span>
                    <span>👆 Click to select</span>
                  </div>
                  {/* Allocation Legend */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {ALLOCATIONS.map(alloc => {
                      const colors: Record<string, string> = {
                        indoor: "bg-blue-500",
                        outdoor: "bg-green-500",
                        patio: "bg-amber-500",
                        terrace: "bg-orange-500",
                        rooftop: "bg-purple-500",
                        private: "bg-pink-500"
                      };
                      return (
                        <div key={alloc.value} className="flex items-center gap-1.5">
                          <div className={`w-3 h-3 rounded ${colors[alloc.value] || "bg-gray-500"}`} />
                          <span className="text-xs text-muted-foreground">{alloc.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Selected Table Panel */}
                {selectedTableForMove && (
                  <div className="w-64 shrink-0">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Edit Table</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(() => {
                          const table = tables.find(t => t.id === selectedTableForMove);
                          if (!table) return null;
                          return (
                            <>
                              <div>
                                <Label className="text-xs">Name</Label>
                                <Input 
                                  value={table.name}
                                  onChange={(e) => {
                                    setTables(prev => prev.map(t => 
                                      t.id === table.id ? { ...t, name: e.target.value } : t
                                    ));
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Capacity</Label>
                                <Input 
                                  type="number"
                                  value={table.capacity || ""}
                                  onChange={(e) => {
                                    setTables(prev => prev.map(t => 
                                      t.id === table.id ? { ...t, capacity: parseInt(e.target.value) || 0 } : t
                                    ));
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Allocation</Label>
                                <Select 
                                  value={table.allocation || "indoor"} 
                                  onValueChange={(v) => {
                                    setTables(prev => prev.map(t => 
                                      t.id === table.id ? { ...t, allocation: v } : t
                                    ));
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {ALLOCATIONS.map(a => (
                                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Shape</Label>
                                <Select 
                                  value={table.shape || "square"} 
                                  onValueChange={(v) => {
                                    setTables(prev => prev.map(t => 
                                      t.id === table.id ? { ...t, shape: v } : t
                                    ));
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {SHAPES.map(s => (
                                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex gap-2 pt-2">
                                <Button 
                                  size="sm" 
                                  className="flex-1"
                                  onClick={async () => {
                                    await supabase
                                      .from("lab_ops_tables")
                                      .update({
                                        name: table.name,
                                        capacity: table.capacity,
                                        allocation: table.allocation,
                                        shape: table.shape,
                                        position_x: table.position_x,
                                        position_y: table.position_y
                                      })
                                      .eq("id", table.id);
                                    toast({ title: "Table saved" });
                                    setSelectedTableForMove(null);
                                  }}
                                >
                                  <Save className="h-3 w-3 mr-1" />Save
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setSelectedTableForMove(null)}
                                >
                                  Close
                                </Button>
                              </div>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Table Performance</CardTitle>
                <CardDescription>Last 30 days analytics</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={fetchAnalytics}>
                <RefreshCw className="h-4 w-4 mr-1" />Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {analytics.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No order data available yet</p>
              ) : (
                <div className="space-y-3">
                  {analytics.map((stat) => (
                    <div key={stat.tableId} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{stat.tableName}</span>
                        <Badge>{stat.turnoverCount} turnovers</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Revenue</p>
                          <p className="text-lg font-bold text-primary">${stat.totalRevenue.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Check</p>
                          <p className="text-lg font-bold">${stat.avgCheck.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg per Person</p>
                          <p className="text-lg font-bold">${stat.avgCheckPerPerson.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capacity Tab */}
        <TabsContent value="capacity" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Venue Capacity Settings</CardTitle>
                <CardDescription>Manual capacity input for seated and standing</CardDescription>
              </div>
              <Dialog open={showCapacitySettings} onOpenChange={setShowCapacitySettings}>
                <DialogTrigger asChild>
                  <Button size="sm"><Edit className="h-4 w-4 mr-1" />Edit</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Venue Capacity</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Total Seated Capacity</Label>
                      <Input 
                        type="number"
                        value={capacityForm.total_seated_capacity}
                        onChange={(e) => setCapacityForm({...capacityForm, total_seated_capacity: e.target.value})}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Auto-calculated from tables: {totalSeatedCapacity}
                      </p>
                    </div>
                    <div>
                      <Label>Total Standing Capacity</Label>
                      <Input 
                        type="number"
                        value={capacityForm.total_standing_capacity}
                        onChange={(e) => setCapacityForm({...capacityForm, total_standing_capacity: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Maximum Occupancy</Label>
                      <Input 
                        type="number"
                        value={capacityForm.max_occupancy}
                        onChange={(e) => setCapacityForm({...capacityForm, max_occupancy: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea 
                        value={capacityForm.notes}
                        onChange={(e) => setCapacityForm({...capacityForm, notes: e.target.value})}
                        placeholder="Fire code limits, special events capacity..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={saveVenueCapacity}>Save Capacity</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{venueCapacity?.total_seated_capacity || totalSeatedCapacity}</p>
                    <p className="text-xs text-muted-foreground">Seated</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold">{venueCapacity?.total_standing_capacity || totalStandingCapacity}</p>
                    <p className="text-xs text-muted-foreground">Standing</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">
                      {(venueCapacity?.total_seated_capacity || totalSeatedCapacity) + (venueCapacity?.total_standing_capacity || totalStandingCapacity)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Capacity</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-destructive" />
                    <p className="text-2xl font-bold">{venueCapacity?.max_occupancy || totalCapacity}</p>
                    <p className="text-xs text-muted-foreground">Max Occupancy</p>
                  </CardContent>
                </Card>
              </div>
              
              {venueCapacity?.notes && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{venueCapacity.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Table Dialog */}
      <Dialog open={!!editingTable} onOpenChange={(open) => !open && setEditingTable(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Table</DialogTitle>
          </DialogHeader>
          {editingTable && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input 
                    value={editingTable.name} 
                    onChange={(e) => setEditingTable({...editingTable, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Table Number</Label>
                  <Input 
                    type="number"
                    value={editingTable.table_number || ""} 
                    onChange={(e) => setEditingTable({...editingTable, table_number: e.target.value ? parseInt(e.target.value) : null})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Seated Capacity</Label>
                  <Input 
                    type="number"
                    value={editingTable.capacity || ""} 
                    onChange={(e) => setEditingTable({...editingTable, capacity: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label>Standing Capacity</Label>
                  <Input 
                    type="number"
                    value={editingTable.standing_capacity || ""} 
                    onChange={(e) => setEditingTable({...editingTable, standing_capacity: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Shape</Label>
                  <Select value={editingTable.shape || "square"} onValueChange={(v) => setEditingTable({...editingTable, shape: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SHAPES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Allocation</Label>
                  <Select value={editingTable.allocation || "indoor"} onValueChange={(v) => setEditingTable({...editingTable, allocation: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALLOCATIONS.map(a => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Min Covers</Label>
                  <Input 
                    type="number"
                    value={editingTable.min_covers || ""} 
                    onChange={(e) => setEditingTable({...editingTable, min_covers: parseInt(e.target.value) || 1})}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch 
                    checked={editingTable.is_reservable ?? true}
                    onCheckedChange={(c) => setEditingTable({...editingTable, is_reservable: c})}
                  />
                  <Label>Reservable</Label>
                </div>
              </div>
              
              <div>
                <Label>Notes</Label>
                <Textarea 
                  value={editingTable.notes || ""} 
                  onChange={(e) => setEditingTable({...editingTable, notes: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={updateTable}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
