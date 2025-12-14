import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, Target, Timer, TrendingUp, TrendingDown, 
  Award, AlertTriangle, Zap, BarChart3, Clock
} from 'lucide-react';

interface StaffPerformanceData {
  id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  totalPours: number;
  accuratePours: number;
  accuracyPct: number;
  avgPourTime: number;
  avgPourAmount: number;
  overPours: number;
  underPours: number;
  varianceMl: number;
  varianceCost: number;
  speedScore: number;
  trainingFlag: boolean;
  trainingReason?: string;
}

interface StaffPerformancePanelProps {
  outletId: string;
}

const TARGET_POUR_ML = 45; // Standard pour
const ACCURACY_THRESHOLD = 5; // ±5ml is considered accurate
const TRAINING_THRESHOLD = 85; // Below 85% accuracy flags for training

export function StaffPerformancePanel({ outletId }: StaffPerformancePanelProps) {
  const [staffData, setStaffData] = useState<StaffPerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [teamStats, setTeamStats] = useState({
    avgAccuracy: 0,
    totalPours: 0,
    totalVarianceCost: 0,
    flaggedStaff: 0
  });

  useEffect(() => {
    if (outletId) {
      fetchStaffPerformance();
    }
  }, [outletId, period]);

  const getPeriodDays = () => {
    switch (period) {
      case '1d': return 1;
      case '7d': return 7;
      case '30d': return 30;
      default: return 7;
    }
  };

  const fetchStaffPerformance = async () => {
    setIsLoading(true);
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - getPeriodDays());

      // Fetch staff
      const { data: staff } = await supabase
        .from('lab_ops_staff')
        .select('id, full_name, role, user_id')
        .eq('outlet_id', outletId)
        .eq('is_active', true);

      // Fetch pourer readings
      const { data: readings } = await supabase
        .from('lab_ops_pourer_readings')
        .select('*, lab_ops_bottles(spirit_type)')
        .eq('outlet_id', outletId)
        .gte('reading_timestamp', daysAgo.toISOString());

      const performanceData: StaffPerformanceData[] = (staff || []).map(s => {
        const staffReadings = (readings || []).filter((r: any) => r.recorded_by === s.id);
        const totalPours = staffReadings.length;
        
        let accuratePours = 0;
        let overPours = 0;
        let underPours = 0;
        let totalVariance = 0;
        let totalTime = 0;

        staffReadings.forEach((r: any) => {
          const variance = r.ml_dispensed - TARGET_POUR_ML;
          totalVariance += Math.abs(variance);
          
          if (Math.abs(variance) <= ACCURACY_THRESHOLD) {
            accuratePours++;
          } else if (variance > 0) {
            overPours++;
          } else {
            underPours++;
          }

          if (r.pour_duration_seconds) {
            totalTime += r.pour_duration_seconds * 1000;
          }
        });

        const accuracyPct = totalPours > 0 ? (accuratePours / totalPours) * 100 : 100;
        const avgPourTime = totalPours > 0 && totalTime > 0 ? totalTime / totalPours / 1000 : 0;
        const avgPourAmount = totalPours > 0 
          ? staffReadings.reduce((sum: number, r: any) => sum + r.ml_dispensed, 0) / totalPours 
          : TARGET_POUR_ML;
        
        // Variance cost (assume avg cost per ml)
        const avgCostPerMl = 0.05; // €0.05 per ml
        const varianceCost = totalVariance * avgCostPerMl;

        // Speed score (inverse of avg pour time, normalized)
        const speedScore = avgPourTime > 0 ? Math.min(100, (2 / avgPourTime) * 100) : 100;

        // Training flag
        const trainingFlag = accuracyPct < TRAINING_THRESHOLD;
        let trainingReason = '';
        if (overPours > underPours * 2) {
          trainingReason = 'Consistent over-pouring';
        } else if (underPours > overPours * 2) {
          trainingReason = 'Consistent under-pouring';
        } else if (accuracyPct < 70) {
          trainingReason = 'Low accuracy - immediate training required';
        }

        return {
          id: s.id,
          full_name: s.full_name,
          role: s.role,
          totalPours,
          accuratePours,
          accuracyPct: Math.round(accuracyPct * 10) / 10,
          avgPourTime: Math.round(avgPourTime * 100) / 100,
          avgPourAmount: Math.round(avgPourAmount * 10) / 10,
          overPours,
          underPours,
          varianceMl: Math.round(totalVariance),
          varianceCost: Math.round(varianceCost * 100) / 100,
          speedScore: Math.round(speedScore),
          trainingFlag,
          trainingReason
        };
      }).sort((a, b) => b.accuracyPct - a.accuracyPct);

      setStaffData(performanceData);

      // Calculate team stats
      const totalPours = performanceData.reduce((sum, s) => sum + s.totalPours, 0);
      const avgAccuracy = performanceData.length > 0 
        ? performanceData.reduce((sum, s) => sum + s.accuracyPct, 0) / performanceData.length 
        : 0;
      const totalVarianceCost = performanceData.reduce((sum, s) => sum + s.varianceCost, 0);
      const flaggedStaff = performanceData.filter(s => s.trainingFlag).length;

      setTeamStats({
        avgAccuracy: Math.round(avgAccuracy * 10) / 10,
        totalPours,
        totalVarianceCost: Math.round(totalVarianceCost * 100) / 100,
        flaggedStaff
      });

    } catch (error) {
      console.error('Error fetching staff performance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccuracyColor = (pct: number) => {
    if (pct >= 95) return 'text-green-500';
    if (pct >= 85) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getAccuracyBadge = (pct: number) => {
    if (pct >= 95) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (pct >= 85) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Staff Pour Performance</h2>
        </div>
        <div className="flex gap-1">
          {['1d', '7d', '30d'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                period === p 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Team Accuracy</p>
                <p className={`text-2xl font-bold ${getAccuracyColor(teamStats.avgAccuracy)}`}>
                  {teamStats.avgAccuracy}%
                </p>
              </div>
              <Target className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Pours</p>
                <p className="text-2xl font-bold text-blue-500">{teamStats.totalPours}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Variance Cost</p>
                <p className="text-2xl font-bold text-red-500">€{teamStats.totalVarianceCost}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${teamStats.flaggedStaff > 0 ? 'from-yellow-500/10 to-yellow-500/5' : 'from-green-500/10 to-green-500/5'}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Need Training</p>
                <p className={`text-2xl font-bold ${teamStats.flaggedStaff > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                  {teamStats.flaggedStaff}
                </p>
              </div>
              <AlertTriangle className={`w-8 h-8 ${teamStats.flaggedStaff > 0 ? 'text-yellow-500/50' : 'text-green-500/50'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            Individual Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="p-3 space-y-3">
              {staffData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No staff performance data yet
                </p>
              ) : (
                staffData.map((staff, idx) => (
                  <div 
                    key={staff.id}
                    className={`p-3 rounded-lg border ${
                      staff.trainingFlag 
                        ? 'border-yellow-500/30 bg-yellow-500/5' 
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Rank & Avatar */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={staff.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {staff.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium truncate">{staff.full_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{staff.role}</p>
                          </div>
                          <Badge className={getAccuracyBadge(staff.accuracyPct)}>
                            {staff.accuracyPct}% Accuracy
                          </Badge>
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Pours</p>
                            <p className="font-semibold text-sm">{staff.totalPours}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Pour</p>
                            <p className={`font-semibold text-sm ${
                              Math.abs(staff.avgPourAmount - TARGET_POUR_ML) <= ACCURACY_THRESHOLD 
                                ? 'text-green-500' 
                                : 'text-yellow-500'
                            }`}>
                              {staff.avgPourAmount}ml
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-red-400" /> Over
                            </p>
                            <p className="font-semibold text-sm text-red-400">{staff.overPours}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <TrendingDown className="w-3 h-3 text-blue-400" /> Under
                            </p>
                            <p className="font-semibold text-sm text-blue-400">{staff.underPours}</p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2">
                          <Progress 
                            value={staff.accuracyPct} 
                            className="h-1.5"
                          />
                        </div>

                        {/* Training Flag */}
                        {staff.trainingFlag && staff.trainingReason && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-yellow-500">
                            <AlertTriangle className="w-3 h-3" />
                            {staff.trainingReason}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}