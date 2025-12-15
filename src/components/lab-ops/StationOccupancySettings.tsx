import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Settings, Save, RefreshCw, Activity, ArrowRight } from "lucide-react";

interface Station {
  id: string;
  name: string;
  type: string;
  max_orders_capacity: number;
  current_load: number;
  occupancy_threshold: number;
  overflow_station_id: string | null;
  is_active: boolean;
}

interface StationOccupancySettingsProps {
  outletId: string;
}

export default function StationOccupancySettings({ outletId }: StationOccupancySettingsProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);

  useEffect(() => {
    fetchStations();
  }, [outletId]);

  const fetchStations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("lab_ops_stations")
        .select("*")
        .eq("outlet_id", outletId)
        .eq("is_active", true)
        .order("type");

      if (error) throw error;
      setStations(data || []);
    } catch (error) {
      console.error("Error fetching stations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStation = async (station: Station) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("lab_ops_stations")
        .update({
          max_orders_capacity: station.max_orders_capacity,
          occupancy_threshold: station.occupancy_threshold,
          overflow_station_id: station.overflow_station_id,
        })
        .eq("id", station.id);

      if (error) throw error;
      
      toast({ title: "Station updated", description: `${station.name} settings saved` });
      setEditingStation(null);
      fetchStations();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getOccupancyPercentage = (station: Station) => {
    if (!station.max_orders_capacity) return 0;
    return Math.round((station.current_load / station.max_orders_capacity) * 100);
  };

  const getOccupancyColor = (percentage: number, threshold: number) => {
    if (percentage >= threshold) return "bg-red-500";
    if (percentage >= threshold * 0.7) return "bg-amber-500";
    return "bg-green-500";
  };

  const getStationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      BAR: "🍸 Bar",
      HOT_KITCHEN: "🔥 Hot Kitchen",
      COLD_KITCHEN: "❄️ Cold Kitchen",
      PASTRY: "🍰 Pastry",
      EXPO: "📦 Expo",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Settings className="w-5 h-5 text-primary" />
          Station Occupancy Settings
        </CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Configure order routing based on station load
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {stations.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No stations configured. Add stations in LAB Ops settings.
          </p>
        ) : (
          <div className="grid gap-3">
            {stations.map((station) => {
              const occupancy = getOccupancyPercentage(station);
              const isEditing = editingStation?.id === station.id;
              const overflowStation = stations.find(s => s.id === station.overflow_station_id);

              return (
                <Card 
                  key={station.id} 
                  className={`p-3 sm:p-4 transition-all ${
                    isEditing ? "ring-2 ring-primary bg-primary/5" : "bg-muted/30"
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm sm:text-base">{station.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {getStationTypeLabel(station.type)}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant={isEditing ? "secondary" : "ghost"}
                        onClick={() => setEditingStation(isEditing ? null : station)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Live Stats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Activity className="w-3 h-3" /> Current Load
                        </span>
                        <span className="font-medium">
                          {station.current_load} / {station.max_orders_capacity} orders
                        </span>
                      </div>
                      <Progress 
                        value={occupancy} 
                        className={`h-2 ${getOccupancyColor(occupancy, station.occupancy_threshold)}`}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{occupancy}% occupied</span>
                        <span>Threshold: {station.occupancy_threshold}%</span>
                      </div>
                    </div>

                    {/* Overflow Routing */}
                    {overflowStation && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm bg-amber-500/10 p-2 rounded-md">
                        <ArrowRight className="w-4 h-4 text-amber-500" />
                        <span className="text-muted-foreground">Overflow to:</span>
                        <Badge variant="secondary">{overflowStation.name}</Badge>
                      </div>
                    )}

                    {/* Edit Form */}
                    {isEditing && (
                      <div className="border-t pt-3 mt-2 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Max Capacity</Label>
                            <Input
                              type="number"
                              value={editingStation.max_orders_capacity}
                              onChange={(e) => setEditingStation({
                                ...editingStation,
                                max_orders_capacity: parseInt(e.target.value) || 10
                              })}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Threshold %</Label>
                            <Input
                              type="number"
                              min={50}
                              max={100}
                              value={editingStation.occupancy_threshold}
                              onChange={(e) => setEditingStation({
                                ...editingStation,
                                occupancy_threshold: parseInt(e.target.value) || 80
                              })}
                              className="h-9"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Overflow Station</Label>
                          <Select
                            value={editingStation.overflow_station_id || "none"}
                            onValueChange={(value) => setEditingStation({
                              ...editingStation,
                              overflow_station_id: value === "none" ? null : value
                            })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select overflow station" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No overflow</SelectItem>
                              {stations
                                .filter(s => s.id !== editingStation.id)
                                .map(s => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name} ({getStationTypeLabel(s.type)})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => updateStation(editingStation)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Save Settings
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={fetchStations}
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Stats
        </Button>
      </CardContent>
    </Card>
  );
}
