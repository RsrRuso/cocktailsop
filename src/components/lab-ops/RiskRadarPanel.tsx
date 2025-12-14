import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, Shield, Clock, Users, Package, 
  TrendingDown, Truck, Calendar, AlertCircle,
  CheckCircle, XCircle, Eye, ChevronRight
} from 'lucide-react';

interface Risk {
  id: string;
  type: 'supplier' | 'shelf_life' | 'staff' | 'variance' | 'inventory';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric?: string;
  action?: string;
  affectedItems?: string[];
}

interface RiskRadarPanelProps {
  outletId: string;
}

export function RiskRadarPanel({ outletId }: RiskRadarPanelProps) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high'>('all');

  useEffect(() => {
    if (outletId) {
      analyzeRisks();
    }
  }, [outletId]);

  const analyzeRisks = async () => {
    setIsLoading(true);
    try {
      const [bottlesRes, salesRes, staffRes, readingsRes] = await Promise.all([
        supabase.from('lab_ops_bottles').select('id, spirit_type, current_level_ml, bottle_size_ml, opened_at').eq('outlet_id', outletId),
        supabase.from('lab_ops_sales').select('spirit_type, total_ml_sold').eq('outlet_id', outletId).gte('sold_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('lab_ops_staff').select('id, name, is_active').eq('outlet_id', outletId),
        supabase.from('lab_ops_pourer_readings').select('id, ml_dispensed, bottle_id').eq('outlet_id', outletId).gte('reading_timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      const bottles = bottlesRes.data || [];
      const sales = salesRes.data || [];
      const staff = staffRes.data || [];
      const readings = readingsRes.data || [];

      const detectedRisks: Risk[] = [];

      // 1. Shelf-life risks - bottles expiring soon
      const expiringBottles = bottles.filter((b: any) => {
        if (!b.opened_at) return false;
        const openedDate = new Date(b.opened_at);
        const daysSinceOpened = (Date.now() - openedDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceOpened > 21 && (b.current_level_ml || 0) > 100; // Open > 3 weeks with content
      });

      if (expiringBottles.length > 0) {
        detectedRisks.push({
          id: 'shelf-1',
          type: 'shelf_life',
          severity: 'high',
          title: `${expiringBottles.length} bottles past optimal freshness`,
          description: 'Opened bottles over 3 weeks old may affect drink quality',
          metric: `${expiringBottles.length} items`,
          action: 'Review and prioritize usage or disposal',
          affectedItems: expiringBottles.map((b: any) => b.spirit_type)
        });
      }

      // 2. Supplier dependency - analyze by spirit type concentration
      const spiritTypeCounts: Record<string, number> = {};
      bottles.forEach((b: any) => {
        const spiritType = b.spirit_type || 'Unknown';
        spiritTypeCounts[spiritType] = (spiritTypeCounts[spiritType] || 0) + 1;
      });

      const dominantSpirit = Object.entries(spiritTypeCounts).find(([_, count]) => count > 5);
      if (dominantSpirit && bottles.length > 0) {
        detectedRisks.push({
          id: 'supplier-1',
          type: 'supplier',
          severity: 'medium',
          title: 'High product concentration detected',
          description: `${dominantSpirit[0]} accounts for ${dominantSpirit[1]} bottles - consider diversifying`,
          metric: `${Math.round((dominantSpirit[1] / bottles.length) * 100)}% concentration`,
          action: 'Consider diversifying product selection'
        });
      }

      // 3. Variance risk - physical vs virtual discrepancies
      const totalPhysical = readings.reduce((sum: number, r: any) => sum + (r.ml_dispensed || 0), 0);
      const totalVirtual = sales.reduce((sum: number, s: any) => sum + (s.total_ml_sold || 0), 0);
      const variancePercent = totalVirtual > 0 ? ((totalPhysical - totalVirtual) / totalVirtual) * 100 : 0;

      if (Math.abs(variancePercent) > 10) {
        detectedRisks.push({
          id: 'variance-1',
          type: 'variance',
          severity: variancePercent > 20 ? 'critical' : 'high',
          title: 'Significant consumption variance',
          description: `Physical consumption ${variancePercent > 0 ? 'exceeds' : 'below'} virtual sales by ${Math.abs(variancePercent).toFixed(1)}%`,
          metric: `${variancePercent > 0 ? '+' : ''}${variancePercent.toFixed(1)}%`,
          action: 'Investigate over-pouring, spillage, or unrecorded consumption'
        });
      }

      // 4. Staff coverage risk
      const activeStaff = staff.filter((s: any) => s.is_active);
      if (activeStaff.length < 2) {
        detectedRisks.push({
          id: 'staff-1',
          type: 'staff',
          severity: 'medium',
          title: 'Limited staff coverage',
          description: 'Fewer than 2 active staff members registered',
          metric: `${activeStaff.length} active`,
          action: 'Consider hiring or activating additional staff'
        });
      }

      // 5. Low inventory critical items
      const lowStockBottles = bottles.filter((b: any) => {
        const level = b.current_level_ml || 0;
        const size = b.bottle_size_ml || 750;
        return (level / size) < 0.1; // Less than 10% remaining
      });

      if (lowStockBottles.length > 3) {
        detectedRisks.push({
          id: 'inv-1',
          type: 'inventory',
          severity: 'high',
          title: `${lowStockBottles.length} bottles critically low`,
          description: 'Multiple bottles below 10% capacity',
          metric: `${lowStockBottles.length} items`,
          action: 'Prioritize reorder or replacement',
          affectedItems: lowStockBottles.map((b: any) => b.spirit_type)
        });
      }

      // 6. No recent activity risk
      if (readings.length === 0 && sales.length === 0) {
        detectedRisks.push({
          id: 'activity-1',
          type: 'variance',
          severity: 'low',
          title: 'No recent activity recorded',
          description: 'No consumption or sales data in the past 7 days',
          metric: '0 transactions',
          action: 'Verify pourer connections and POS integration'
        });
      }

      setRisks(detectedRisks.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }));
    } catch (error) {
      console.error('Error analyzing risks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
    }
  };

  const getRiskIcon = (type: string) => {
    switch (type) {
      case 'supplier': return Truck;
      case 'shelf_life': return Clock;
      case 'staff': return Users;
      case 'variance': return TrendingDown;
      case 'inventory': return Package;
      default: return AlertTriangle;
    }
  };

  const filteredRisks = risks.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'critical') return r.severity === 'critical';
    return r.severity === 'high' || r.severity === 'critical';
  });

  const riskScore = Math.max(0, 100 - (risks.reduce((score, r) => {
    const points = { critical: 25, high: 15, medium: 8, low: 3 };
    return score + points[r.severity];
  }, 0)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 px-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary flex-shrink-0" />
          <h2 className="font-semibold text-sm sm:text-base">Risk Radar</h2>
        </div>
        <div className="flex gap-1 self-start sm:self-auto">
          {['all', 'critical', 'high'].map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f as any)}
              className="text-xs px-2 sm:px-3"
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Risk Score */}
      <Card className={`${riskScore > 70 ? 'bg-green-500/10 border-green-500/30' : riskScore > 40 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Overall Risk Score</p>
              <p className={`text-2xl sm:text-3xl font-bold ${riskScore > 70 ? 'text-green-500' : riskScore > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                {riskScore}/100
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs sm:text-sm font-medium">{risks.length} issues</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {risks.filter(r => r.severity === 'critical').length} critical
              </p>
            </div>
          </div>
          <Progress value={riskScore} className="h-2" />
        </CardContent>
      </Card>

      {/* Risk List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary" />
            Active Risks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[350px]">
            <div className="p-3 space-y-3">
              {filteredRisks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">No significant risks detected</p>
                </div>
              ) : (
                filteredRisks.map(risk => {
                  const Icon = getRiskIcon(risk.type);
                  return (
                    <div
                      key={risk.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 ${getSeverityColor(risk.severity)}`}
                      onClick={() => setSelectedRisk(risk)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-background/50`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium truncate">{risk.title}</p>
                            <Badge variant="outline" className={getSeverityColor(risk.severity)}>
                              {risk.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {risk.description}
                          </p>
                          {risk.metric && (
                            <p className="text-sm font-semibold mt-1">{risk.metric}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selected Risk Detail */}
      {selectedRisk && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Risk Details</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRisk(null)}>
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium">{selectedRisk.title}</p>
              <p className="text-xs text-muted-foreground">{selectedRisk.description}</p>
            </div>
            {selectedRisk.action && (
              <div className="p-2 rounded bg-primary/10">
                <p className="text-xs text-muted-foreground">Recommended Action</p>
                <p className="text-sm font-medium">{selectedRisk.action}</p>
              </div>
            )}
            {selectedRisk.affectedItems && selectedRisk.affectedItems.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Affected Items</p>
                <div className="flex flex-wrap gap-1">
                  {selectedRisk.affectedItems.slice(0, 5).map((item, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
                  ))}
                  {selectedRisk.affectedItems.length > 5 && (
                    <Badge variant="outline" className="text-xs">+{selectedRisk.affectedItems.length - 5} more</Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
