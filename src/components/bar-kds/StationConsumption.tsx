import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Beaker, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle, Wine, Droplet
} from "lucide-react";
import { format } from "date-fns";

interface ConsumptionData {
  id: string;
  station_id: string;
  ingredient_id: string;
  shift_date: string;
  sop_consumption_ml: number;
  physical_consumption_ml: number;
  variance_ml: number;
  variance_percent: number;
  station?: { name: string };
  ingredient?: { name: string };
}

interface Station {
  id: string;
  name: string;
}

interface StationConsumptionProps {
  open: boolean;
  onClose: () => void;
  outletId: string;
}

export function StationConsumption({ open, onClose, outletId }: StationConsumptionProps) {
  const [consumptionData, setConsumptionData] = useState<ConsumptionData[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, outletId]);

  useEffect(() => {
    if (open) {
      // Subscribe to real-time updates
      const channel = supabase
        .channel('station-consumption')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'lab_ops_station_consumption',
            filter: `outlet_id=eq.${outletId}`
          },
          () => fetchConsumption()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, outletId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [stationsRes] = await Promise.all([
        supabase
          .from("lab_ops_stations")
          .select("id, name")
          .eq("outlet_id", outletId)
          .eq("type", "BAR")
          .eq("is_active", true)
      ]);

      setStations(stationsRes.data || []);
      await fetchConsumption();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConsumption = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const { data } = await supabase
      .from("lab_ops_station_consumption")
      .select(`
        *,
        station:lab_ops_stations(name),
        ingredient:lab_ops_inventory_items(name)
      `)
      .eq("outlet_id", outletId)
      .eq("shift_date", today)
      .order("variance_percent", { ascending: false });

    setConsumptionData(data || []);
  };

  const getVarianceColor = (percent: number) => {
    if (percent <= -10) return "text-green-400";
    if (percent <= 5) return "text-blue-400";
    if (percent <= 15) return "text-amber-400";
    return "text-red-400";
  };

  const getVarianceIcon = (percent: number) => {
    if (percent <= 5) return <CheckCircle className="h-4 w-4 text-green-400" />;
    if (percent <= 15) return <TrendingUp className="h-4 w-4 text-amber-400" />;
    return <AlertTriangle className="h-4 w-4 text-red-400" />;
  };

  const filteredData = selectedStation === "all" 
    ? consumptionData 
    : consumptionData.filter(d => d.station_id === selectedStation);

  const getTotalStats = () => {
    const data = filteredData;
    return {
      totalSop: data.reduce((sum, d) => sum + Number(d.sop_consumption_ml), 0),
      totalPhysical: data.reduce((sum, d) => sum + Number(d.physical_consumption_ml), 0),
      avgVariance: data.length > 0 
        ? data.reduce((sum, d) => sum + Number(d.variance_percent), 0) / data.length 
        : 0
    };
  };

  const stats = getTotalStats();

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-purple-400" />
            Station Spirit Consumption
            <Badge variant="outline" className="text-gray-400 border-gray-600 ml-2">
              {format(new Date(), 'MMM d, yyyy')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Station Filter */}
        <Tabs value={selectedStation} onValueChange={setSelectedStation}>
          <TabsList className="bg-gray-800 border-gray-700 flex-wrap h-auto">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-purple-600"
            >
              All Stations
            </TabsTrigger>
            {stations.map((station) => (
              <TabsTrigger 
                key={station.id} 
                value={station.id}
                className="data-[state=active]:bg-purple-600"
              >
                {station.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-blue-900/30 border-blue-700">
            <CardContent className="p-4 text-center">
              <Droplet className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-400">
                {(stats.totalSop / 1000).toFixed(2)}L
              </div>
              <div className="text-xs text-blue-300">SOP Theoretical</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-900/30 border-purple-700">
            <CardContent className="p-4 text-center">
              <Wine className="h-6 w-6 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-400">
                {(stats.totalPhysical / 1000).toFixed(2)}L
              </div>
              <div className="text-xs text-purple-300">Physical (Pourer)</div>
            </CardContent>
          </Card>
          <Card className={`${stats.avgVariance > 10 ? 'bg-red-900/30 border-red-700' : 'bg-green-900/30 border-green-700'}`}>
            <CardContent className="p-4 text-center">
              {stats.avgVariance > 10 ? (
                <TrendingUp className="h-6 w-6 text-red-400 mx-auto mb-2" />
              ) : (
                <TrendingDown className="h-6 w-6 text-green-400 mx-auto mb-2" />
              )}
              <div className={`text-2xl font-bold ${stats.avgVariance > 10 ? 'text-red-400' : 'text-green-400'}`}>
                {stats.avgVariance.toFixed(1)}%
              </div>
              <div className={`text-xs ${stats.avgVariance > 10 ? 'text-red-300' : 'text-green-300'}`}>
                Avg Variance
              </div>
            </CardContent>
          </Card>
        </div>

        <ScrollArea className="h-[45vh]">
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No consumption data for today yet. 
              <br />
              <span className="text-sm">Data updates in real-time from BLE pourers.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredData.map((item) => (
                <Card key={item.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium text-white flex items-center gap-2">
                          {item.ingredient?.name || "Unknown Ingredient"}
                          {getVarianceIcon(Number(item.variance_percent))}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.station?.name || "Unknown Station"}
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`${getVarianceColor(Number(item.variance_percent))} border-current`}
                      >
                        {Number(item.variance_percent) > 0 ? '+' : ''}{Number(item.variance_percent).toFixed(1)}%
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {/* SOP Bar */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-16">SOP</span>
                        <div className="flex-1 bg-gray-700 rounded-full h-3">
                          <div 
                            className="bg-blue-500 h-3 rounded-full"
                            style={{ 
                              width: `${Math.min(100, (Number(item.sop_consumption_ml) / Math.max(Number(item.sop_consumption_ml), Number(item.physical_consumption_ml))) * 100)}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm text-blue-400 w-20 text-right">
                          {Number(item.sop_consumption_ml).toFixed(0)}ml
                        </span>
                      </div>

                      {/* Physical Bar */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-16">Physical</span>
                        <div className="flex-1 bg-gray-700 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full ${Number(item.variance_percent) > 10 ? 'bg-red-500' : 'bg-purple-500'}`}
                            style={{ 
                              width: `${Math.min(100, (Number(item.physical_consumption_ml) / Math.max(Number(item.sop_consumption_ml), Number(item.physical_consumption_ml))) * 100)}%` 
                            }}
                          />
                        </div>
                        <span className={`text-sm w-20 text-right ${Number(item.variance_percent) > 10 ? 'text-red-400' : 'text-purple-400'}`}>
                          {Number(item.physical_consumption_ml).toFixed(0)}ml
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-500 text-right">
                      Variance: {Number(item.variance_ml) > 0 ? '+' : ''}{Number(item.variance_ml).toFixed(0)}ml
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
