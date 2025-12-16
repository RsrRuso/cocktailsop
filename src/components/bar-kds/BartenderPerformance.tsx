import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Trophy, Clock, Zap, TrendingUp, 
  User, Timer, Award, Calendar
} from "lucide-react";
import { format, startOfWeek, endOfWeek, subDays } from "date-fns";

interface DailyStats {
  id: string;
  bartender_id: string;
  station_id: string | null;
  shift_date: string;
  total_drinks_served: number;
  avg_time_seconds: number;
  min_time_seconds: number | null;
  max_time_seconds: number | null;
  efficiency_score: number;
  bartender?: { full_name: string };
  station?: { name: string };
}

interface BartenderPerformanceProps {
  open: boolean;
  onClose: () => void;
  outletId: string;
}

export function BartenderPerformance({ open, onClose, outletId }: BartenderPerformanceProps) {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("today");

  useEffect(() => {
    if (open) {
      fetchPerformanceData();
    }
  }, [open, outletId, activeTab]);

  const fetchPerformanceData = async () => {
    setIsLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');

      // Determine date range based on active tab
      const dateFilter = activeTab === "week" || activeTab === "leaderboard" ? weekStart : today;

      // Fetch item performance data directly and calculate stats
      const { data: itemPerf } = await supabase
        .from("lab_ops_bartender_item_performance")
        .select(`
          bartender_id,
          station_id,
          time_seconds,
          shift_date,
          bartender:lab_ops_staff(full_name),
          station:lab_ops_stations(name)
        `)
        .eq("outlet_id", outletId)
        .gte("shift_date", dateFilter)
        .not("completed_at", "is", null);

      if (itemPerf && itemPerf.length > 0) {
        // Group by bartender and calculate stats
        const grouped = itemPerf.reduce((acc: any, item) => {
          const id = item.bartender_id;
          if (!id) return acc;
          
          if (!acc[id]) {
            acc[id] = {
              id: id,
              bartender_id: id,
              station_id: item.station_id,
              name: (item.bartender as any)?.full_name || "Unknown",
              station: item.station,
              bartender: item.bartender,
              total_drinks: 0,
              total_time: 0,
              min_time: Infinity,
              max_time: 0,
              shift_date: item.shift_date
            };
          }
          acc[id].total_drinks++;
          acc[id].total_time += item.time_seconds || 0;
          if (item.time_seconds && item.time_seconds < acc[id].min_time) {
            acc[id].min_time = item.time_seconds;
          }
          if (item.time_seconds && item.time_seconds > acc[id].max_time) {
            acc[id].max_time = item.time_seconds;
          }
          return acc;
        }, {});

        const processedData = Object.values(grouped)
          .map((b: any) => ({
            ...b,
            avg_time: b.total_drinks > 0 ? Math.round(b.total_time / b.total_drinks) : 0,
            total_drinks_served: b.total_drinks,
            avg_time_seconds: b.total_drinks > 0 ? Math.round(b.total_time / b.total_drinks) : 0,
            min_time_seconds: b.min_time === Infinity ? null : b.min_time,
            max_time_seconds: b.max_time === 0 ? null : b.max_time,
            efficiency_score: calculateEfficiency(b.total_drinks, b.total_time / b.total_drinks),
            efficiency: calculateEfficiency(b.total_drinks, b.total_time / b.total_drinks)
          }))
          .sort((a: any, b: any) => b.total_drinks - a.total_drinks);

        // Set both daily stats and leaderboard from the same processed data
        setDailyStats(processedData as any);
        setLeaderboard(processedData);
      } else {
        setDailyStats([]);
        setLeaderboard([]);
      }
    } catch (error) {
      console.error("Error fetching performance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateEfficiency = (drinks: number, avgTime: number) => {
    // Higher drinks + lower time = higher score
    const speedScore = Math.max(0, 100 - (avgTime / 3)); // 3 mins = 0, instant = 100
    const volumeScore = Math.min(100, drinks * 2); // 50 drinks = 100
    return Math.round((speedScore + volumeScore) / 2);
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "--";
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-400" />;
    if (index === 1) return <Award className="h-5 w-5 text-gray-300" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-gray-500">#{index + 1}</span>;
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            Bartender Performance
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="today" className="data-[state=active]:bg-amber-600">
              <Clock className="h-4 w-4 mr-1" /> Today
            </TabsTrigger>
            <TabsTrigger value="week" className="data-[state=active]:bg-amber-600">
              <Calendar className="h-4 w-4 mr-1" /> This Week
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-amber-600">
              <Trophy className="h-4 w-4 mr-1" /> Leaderboard
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="today" className="m-0 space-y-4">
              {dailyStats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No performance data for today yet
                </div>
              ) : (
                dailyStats.map((stat, idx) => (
                  <Card key={stat.id} className="bg-gray-800 border-gray-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getRankBadge(idx)}
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-white">{stat.bartender?.full_name}</span>
                        </div>
                        {stat.station && (
                          <Badge variant="outline" className="text-amber-400 border-amber-400">
                            {stat.station.name}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-400">{stat.total_drinks_served}</div>
                          <div className="text-xs text-gray-500">Drinks</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-400">{formatTime(stat.avg_time_seconds)}</div>
                          <div className="text-xs text-gray-500">Avg Time</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-amber-400">{formatTime(stat.min_time_seconds)}</div>
                          <div className="text-xs text-gray-500">Fastest</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-400">{formatTime(stat.max_time_seconds)}</div>
                          <div className="text-xs text-gray-500">Slowest</div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Efficiency Score</span>
                          <span className="text-green-400">{stat.efficiency_score}%</span>
                        </div>
                        <Progress value={stat.efficiency_score} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="week" className="m-0">
              {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No performance data for this week
                </div>
              ) : (
                <div className="space-y-4">
                  {leaderboard.map((leader, idx) => (
                    <Card key={leader.bartender_id} className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getRankBadge(idx)}
                            <div>
                              <div className="font-medium text-white">{leader.name}</div>
                              <div className="text-sm text-gray-500">{leader.total_drinks} drinks this week</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-400">{leader.efficiency}%</div>
                            <div className="text-xs text-gray-500">efficiency</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4 text-center text-sm">
                          <div className="bg-gray-700/50 rounded p-2">
                            <div className="text-blue-400 font-bold">{formatTime(leader.avg_time)}</div>
                            <div className="text-gray-500 text-xs">Avg</div>
                          </div>
                          <div className="bg-gray-700/50 rounded p-2">
                            <div className="text-green-400 font-bold">{formatTime(leader.min_time === Infinity ? 0 : leader.min_time)}</div>
                            <div className="text-gray-500 text-xs">Fastest</div>
                          </div>
                          <div className="bg-gray-700/50 rounded p-2">
                            <div className="text-red-400 font-bold">{formatTime(leader.max_time)}</div>
                            <div className="text-gray-500 text-xs">Slowest</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="leaderboard" className="m-0">
              <div className="space-y-2">
                {leaderboard.slice(0, 10).map((leader, idx) => (
                  <div 
                    key={leader.bartender_id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      idx === 0 ? 'bg-gradient-to-r from-yellow-900/50 to-amber-900/50 border border-yellow-600' :
                      idx === 1 ? 'bg-gradient-to-r from-gray-700/50 to-gray-600/50 border border-gray-500' :
                      idx === 2 ? 'bg-gradient-to-r from-amber-900/50 to-orange-900/50 border border-amber-700' :
                      'bg-gray-800 border border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 flex justify-center">{getRankBadge(idx)}</div>
                      <div>
                        <div className="font-medium text-white">{leader.name}</div>
                        <div className="text-sm text-gray-400">{leader.total_drinks} drinks • {formatTime(leader.avg_time)} avg</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      <span className="text-xl font-bold text-yellow-400">{leader.efficiency}</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
