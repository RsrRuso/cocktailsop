import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Thermometer, Snowflake, Box, Wind } from "lucide-react";
import { format } from "date-fns";

interface Equipment {
  id: string;
  name: string;
  type: string;
  area: string;
  doors: number;
  target_temperature: number;
}

interface TemperatureLog {
  id: string;
  equipment_id: string;
  temperature: number;
  recorded_at: string;
  notes: string | null;
}

const equipmentTypes = [
  { value: "fridge", label: "Fridge", icon: Thermometer, defaultTemp: 5 },
  { value: "freezer", label: "Freezer", icon: Snowflake, defaultTemp: -18 },
  { value: "walk_in_fridge", label: "Walk-in Fridge", icon: Box, defaultTemp: 5 },
  { value: "walk_in_freezer", label: "Walk-in Freezer", icon: Box, defaultTemp: -18 },
  { value: "chest_freezer", label: "Chest Freezer", icon: Box, defaultTemp: -18 },
  { value: "under_counter", label: "Under Counter", icon: Thermometer, defaultTemp: 5 },
  { value: "tall_fridge", label: "Tall Fridge", icon: Thermometer, defaultTemp: 5 },
  { value: "chiller", label: "Chiller", icon: Wind, defaultTemp: 2 },
  { value: "super_freezer", label: "Super Freezer", icon: Snowflake, defaultTemp: -40 },
];

const TemperatureLog = () => {
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [logs, setLogs] = useState<TemperatureLog[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>("All");
  
  // Form states
  const [newEquipment, setNewEquipment] = useState({
    name: "",
    type: "fridge",
    area: "",
    doors: 1,
    target_temperature: 5,
  });
  
  const [newLog, setNewLog] = useState({
    equipment_id: "",
    temperature: 0,
    notes: "",
  });

  useEffect(() => {
    fetchEquipment();
    fetchLogs();
  }, []);

  const fetchEquipment = async () => {
    const { data, error } = await supabase
      .from("equipment")
      .select("*")
      .order("area", { ascending: true });

    if (error) {
      toast({ title: "Error fetching equipment", variant: "destructive" });
      return;
    }

    setEquipment(data || []);
    const uniqueAreas = Array.from(new Set(data?.map(e => e.area) || []));
    setAreas(uniqueAreas);
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("temperature_logs")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(50);

    if (error) {
      toast({ title: "Error fetching logs", variant: "destructive" });
      return;
    }

    setLogs(data || []);
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("equipment").insert([{
      user_id: user.id,
      name: newEquipment.name,
      type: newEquipment.type as any,
      area: newEquipment.area,
      doors: newEquipment.doors,
      target_temperature: newEquipment.target_temperature,
    }]);

    if (error) {
      toast({ title: "Error adding equipment", variant: "destructive" });
      return;
    }

    toast({ title: "Equipment added successfully" });
    setNewEquipment({ name: "", type: "fridge", area: "", doors: 1, target_temperature: 5 });
    fetchEquipment();
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("temperature_logs").insert({
      user_id: user.id,
      equipment_id: newLog.equipment_id,
      temperature: newLog.temperature,
      notes: newLog.notes || null,
    });

    if (error) {
      toast({ title: "Error adding temperature log", variant: "destructive" });
      return;
    }

    toast({ title: "Temperature logged successfully" });
    setNewLog({ equipment_id: "", temperature: 0, notes: "" });
    fetchLogs();
  };

  const getEquipmentIcon = (type: string) => {
    const equipType = equipmentTypes.find(t => t.value === type);
    const Icon = equipType?.icon || Thermometer;
    return <Icon className="w-8 h-8" />;
  };

  const getTemperatureStatus = (actual: number, target: number) => {
    const diff = Math.abs(actual - target);
    if (diff <= 2) return "text-green-500";
    if (diff <= 5) return "text-yellow-500";
    return "text-red-500";
  };

  const filteredEquipment = selectedArea === "All" 
    ? equipment 
    : equipment.filter(e => e.area === selectedArea);

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container mx-auto px-4 pt-20 pb-8">
        <h1 className="text-3xl font-bold mb-6">Temperature Log</h1>

        <Tabs defaultValue="log" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="log">Log Temp</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="space-y-4">
            <div className="mb-4">
              <Label>Filter by Area</Label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Areas</SelectItem>
                  {areas.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredEquipment.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No equipment added yet. Add equipment to start logging temperatures.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredEquipment.map(equip => (
                  <Card key={equip.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            {getEquipmentIcon(equip.type)}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{equip.name}</CardTitle>
                            <CardDescription>
                              {equipmentTypes.find(t => t.value === equip.type)?.label}
                              {equip.doors > 1 && ` - ${equip.doors} doors`}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Area:</span>
                          <span className="font-medium">{equip.area}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Target:</span>
                          <span className="font-medium">{equip.target_temperature}°C</span>
                        </div>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          handleAddLog({
                            ...e,
                            preventDefault: () => {},
                          });
                          supabase.auth.getUser().then(({ data: { user } }) => {
                            if (user) {
                              supabase.from("temperature_logs").insert({
                                user_id: user.id,
                                equipment_id: equip.id,
                                temperature: Number(formData.get(`temp-${equip.id}`)),
                                notes: String(formData.get(`notes-${equip.id}`) || ""),
                              }).then(() => {
                                toast({ title: "Temperature logged" });
                                fetchLogs();
                                e.currentTarget.reset();
                              });
                            }
                          });
                        }} className="space-y-2">
                          <Input
                            name={`temp-${equip.id}`}
                            type="number"
                            step="0.1"
                            placeholder="Current temp (°C)"
                            required
                          />
                          <Input
                            name={`notes-${equip.id}`}
                            placeholder="Notes (optional)"
                          />
                          <Button type="submit" className="w-full">
                            <Thermometer className="w-4 h-4 mr-2" />
                            Log Temperature
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="equipment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add New Equipment</CardTitle>
                <CardDescription>Register cooling equipment for temperature monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddEquipment} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Equipment Name</Label>
                      <Input
                        id="name"
                        value={newEquipment.name}
                        onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                        placeholder="e.g., Main Kitchen Fridge"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="type">Equipment Type</Label>
                      <Select
                        value={newEquipment.type}
                        onValueChange={(value) => {
                          const equipType = equipmentTypes.find(t => t.value === value);
                          setNewEquipment({
                            ...newEquipment,
                            type: value,
                            target_temperature: equipType?.defaultTemp || 5,
                          });
                        }}
                      >
                        <SelectTrigger id="type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {equipmentTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="area">Area</Label>
                      <Input
                        id="area"
                        value={newEquipment.area}
                        onChange={(e) => setNewEquipment({ ...newEquipment, area: e.target.value })}
                        placeholder="e.g., Main Kitchen, Bar, Prep Area"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="doors">Number of Doors</Label>
                      <Select
                        value={String(newEquipment.doors)}
                        onValueChange={(value) => setNewEquipment({ ...newEquipment, doors: Number(value) })}
                      >
                        <SelectTrigger id="doors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Door</SelectItem>
                          <SelectItem value="2">2 Doors</SelectItem>
                          <SelectItem value="3">3 Doors</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="target_temp">Target Temperature (°C)</Label>
                      <Input
                        id="target_temp"
                        type="number"
                        step="0.1"
                        value={newEquipment.target_temperature}
                        onChange={(e) => setNewEquipment({ ...newEquipment, target_temperature: Number(e.target.value) })}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Recommended: Fridge: 5°C, Freezer: -18°C, Super Freezer: -40°C
                      </p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Equipment
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Current Equipment</h3>
              {equipment.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No equipment registered yet
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {equipment.map(equip => (
                    <Card key={equip.id}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          {getEquipmentIcon(equip.type)}
                          <div>
                            <CardTitle>{equip.name}</CardTitle>
                            <CardDescription>
                              {equipmentTypes.find(t => t.value === equip.type)?.label}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Area:</span>
                          <span className="font-medium">{equip.area}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Doors:</span>
                          <span className="font-medium">{equip.doors}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Target Temp:</span>
                          <span className="font-medium">{equip.target_temperature}°C</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Temperature History</CardTitle>
                <CardDescription>Recent temperature readings</CardDescription>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No temperature logs yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {logs.map(log => {
                      const equip = equipment.find(e => e.id === log.equipment_id);
                      return (
                        <div key={log.id} className="flex items-start justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{equip?.name || "Unknown Equipment"}</div>
                            <div className="text-sm text-muted-foreground">
                              {equip?.area} • {format(new Date(log.recorded_at), "PPp")}
                            </div>
                            {log.notes && (
                              <div className="text-sm mt-1 text-muted-foreground">{log.notes}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${equip ? getTemperatureStatus(log.temperature, equip.target_temperature) : ""}`}>
                              {log.temperature}°C
                            </div>
                            {equip && (
                              <div className="text-sm text-muted-foreground">
                                Target: {equip.target_temperature}°C
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default TemperatureLog;