import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Play, Square, Clock, CheckCircle2, AlertTriangle, Wine,
  QrCode, Clipboard, FileDown, RefreshCw, User, Calendar
} from 'lucide-react';
import { format } from 'date-fns';

interface ShiftSession {
  id: string;
  shift_type: string;
  started_at: string;
  ended_at: string | null;
  started_by: string;
  status: string;
  notes: string | null;
}

interface Bottle {
  id: string;
  sku_id: string;
  bottle_size_ml: number;
  current_level_ml: number;
  status: string;
  sku?: { spirit_name: string; brand: string | null };
}

interface InventoryCount {
  bottle_id: string;
  sku_name: string;
  opening_ml: number;
  closing_ml: number;
  variance_ml: number;
}

interface SmartPourerSOPWorkflowsProps {
  outletId: string;
}

export function SmartPourerSOPWorkflows({ outletId }: SmartPourerSOPWorkflowsProps) {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<ShiftSession | null>(null);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [inventoryCounts, setInventoryCounts] = useState<InventoryCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartShiftOpen, setIsStartShiftOpen] = useState(false);
  const [isEndShiftOpen, setIsEndShiftOpen] = useState(false);
  const [shiftType, setShiftType] = useState('day');
  const [shiftNotes, setShiftNotes] = useState('');
  const [closingCounts, setClosingCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (outletId) {
      fetchData();
    }
  }, [outletId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Check for active shift session
      const { data: sessionData } = await supabase
        .from('smart_pourer_shift_sessions')
        .select('*')
        .eq('outlet_id', outletId)
        .eq('status', 'active')
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      setActiveSession(sessionData);

      // Fetch active bottles
      const { data: bottlesData } = await supabase
        .from('smart_pourer_bottles')
        .select(`
          *,
          sku:smart_pourer_skus(spirit_name, brand)
        `)
        .eq('outlet_id', outletId)
        .eq('status', 'active')
        .order('sku_id');

      setBottles(bottlesData || []);

      // Initialize inventory counts
      if (bottlesData) {
        const counts: InventoryCount[] = bottlesData.map(b => ({
          bottle_id: b.id,
          sku_name: b.sku?.spirit_name || 'Unknown',
          opening_ml: b.current_level_ml,
          closing_ml: b.current_level_ml,
          variance_ml: 0,
        }));
        setInventoryCounts(counts);
        
        // Initialize closing counts
        const closingMap: Record<string, number> = {};
        bottlesData.forEach(b => {
          closingMap[b.id] = b.current_level_ml;
        });
        setClosingCounts(closingMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartShift = async () => {
    try {
      // Create inventory snapshot for opening
      const openingSnapshot = bottles.map(b => ({
        outlet_id: outletId,
        sku_id: b.sku_id,
        opening_ml: b.current_level_ml,
        closing_ml: 0,
        snapshot_date: new Date().toISOString().split('T')[0],
      }));

      await supabase.from('smart_pourer_inventory_snapshots').insert(openingSnapshot);

      // Create shift session
      const { data, error } = await supabase
        .from('smart_pourer_shift_sessions')
        .insert({
          outlet_id: outletId,
          shift_type: shiftType,
          started_by: user?.id,
          status: 'active',
          notes: shiftNotes || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Shift started successfully');
      setActiveSession(data);
      setIsStartShiftOpen(false);
      setShiftNotes('');
    } catch (error) {
      console.error('Error starting shift:', error);
      toast.error('Failed to start shift');
    }
  };

  const handleEndShift = async () => {
    if (!activeSession) return;

    try {
      // Update inventory counts with closing values
      const today = new Date().toISOString().split('T')[0];
      
      for (const bottle of bottles) {
        const closingMl = closingCounts[bottle.id] || bottle.current_level_ml;
        
        // Update snapshot with closing values
        await supabase
          .from('smart_pourer_inventory_snapshots')
          .update({ closing_ml: closingMl })
          .eq('outlet_id', outletId)
          .eq('sku_id', bottle.sku_id)
          .eq('snapshot_date', today);

        // Update bottle level
        await supabase
          .from('smart_pourer_bottles')
          .update({ current_level_ml: closingMl })
          .eq('id', bottle.id);
      }

      // End shift session
      const { error } = await supabase
        .from('smart_pourer_shift_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          ended_by: user?.id,
        })
        .eq('id', activeSession.id);

      if (error) throw error;

      toast.success('Shift ended successfully');
      setActiveSession(null);
      setIsEndShiftOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error ending shift:', error);
      toast.error('Failed to end shift');
    }
  };

  const updateClosingCount = (bottleId: string, value: number) => {
    setClosingCounts(prev => ({
      ...prev,
      [bottleId]: value,
    }));
  };

  const getShiftDuration = () => {
    if (!activeSession) return '0h 0m';
    const start = new Date(activeSession.started_at);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const generateShiftReport = () => {
    const report = {
      shift: activeSession,
      bottles: bottles.map(b => ({
        name: b.sku?.spirit_name,
        opening: b.current_level_ml,
        closing: closingCounts[b.id] || b.current_level_ml,
        variance: (closingCounts[b.id] || b.current_level_ml) - b.current_level_ml,
      })),
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shift-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading shift data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          Shift Management
        </h3>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Active Shift Status */}
      <Card className={activeSession ? 'border-green-500/50 bg-green-500/5' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeSession ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <CardTitle className="text-base">Shift Active</CardTitle>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 rounded-full bg-muted" />
                  <CardTitle className="text-base text-muted-foreground">No Active Shift</CardTitle>
                </>
              )}
            </div>
            {activeSession && (
              <Badge variant="outline" className="text-green-500">
                {getShiftDuration()}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activeSession ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Started</p>
                  <p className="font-medium">{format(new Date(activeSession.started_at), 'PPp')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Shift Type</p>
                  <p className="font-medium capitalize">{activeSession.shift_type}</p>
                </div>
              </div>
              {activeSession.notes && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Notes</p>
                  <p>{activeSession.notes}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Dialog open={isEndShiftOpen} onOpenChange={setIsEndShiftOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="flex-1 gap-2">
                      <Square className="h-4 w-4" />
                      End Shift
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Clipboard className="h-5 w-5" />
                        Closing Inventory Count
                      </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="flex-1 pr-4">
                      <div className="space-y-3 py-4">
                        {bottles.map((bottle) => {
                          const closingMl = closingCounts[bottle.id] || bottle.current_level_ml;
                          const variance = closingMl - bottle.current_level_ml;
                          
                          return (
                            <Card key={bottle.id} className="bg-muted/20">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="font-medium">{bottle.sku?.spirit_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Opening: {bottle.current_level_ml}ml / {bottle.bottle_size_ml}ml
                                    </p>
                                  </div>
                                  {variance !== 0 && (
                                    <Badge variant={variance > 0 ? 'default' : 'destructive'}>
                                      {variance > 0 ? '+' : ''}{variance}ml
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <Label className="text-xs whitespace-nowrap">Closing Level:</Label>
                                  <Input
                                    type="number"
                                    value={closingMl}
                                    onChange={(e) => updateClosingCount(bottle.id, parseInt(e.target.value) || 0)}
                                    className="h-8"
                                    max={bottle.bottle_size_ml}
                                    min={0}
                                  />
                                  <span className="text-xs text-muted-foreground">ml</span>
                                </div>
                                <Progress 
                                  value={(closingMl / bottle.bottle_size_ml) * 100} 
                                  className="h-1.5 mt-2"
                                />
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    <DialogFooter className="pt-4 border-t">
                      <Button variant="outline" onClick={() => setIsEndShiftOpen(false)}>Cancel</Button>
                      <Button onClick={handleEndShift} variant="destructive">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirm & End Shift
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={generateShiftReport}>
                  <FileDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Dialog open={isStartShiftOpen} onOpenChange={setIsStartShiftOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2">
                  <Play className="h-4 w-4" />
                  Start Shift
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Shift</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Shift Type</Label>
                    <Select value={shiftType} onValueChange={setShiftType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning (6am - 2pm)</SelectItem>
                        <SelectItem value="day">Day (2pm - 10pm)</SelectItem>
                        <SelectItem value="night">Night (10pm - 6am)</SelectItem>
                        <SelectItem value="double">Double Shift</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      placeholder="Any notes for this shift..."
                      value={shiftNotes}
                      onChange={(e) => setShiftNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Opening Inventory Preview:</p>
                    <div className="text-sm space-y-1">
                      {bottles.slice(0, 5).map(b => (
                        <div key={b.id} className="flex justify-between">
                          <span>{b.sku?.spirit_name}</span>
                          <span>{b.current_level_ml}ml</span>
                        </div>
                      ))}
                      {bottles.length > 5 && (
                        <p className="text-muted-foreground">+ {bottles.length - 5} more bottles</p>
                      )}
                    </div>
                  </div>
                  <Button onClick={handleStartShift} className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Start Shift
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="cursor-pointer hover:bg-muted/20 transition-colors">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <QrCode className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="font-medium text-sm">Scan Bottle</p>
              <p className="text-xs text-muted-foreground">Quick pair device</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/20 transition-colors">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Wine className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-sm">Register Bottle</p>
              <p className="text-xs text-muted-foreground">Add new bottle</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Bottle Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Current Bottle Levels ({bottles.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[300px]">
            <div className="divide-y">
              {bottles.map((bottle) => {
                const percentage = (bottle.current_level_ml / bottle.bottle_size_ml) * 100;
                const isLow = percentage < 20;
                
                return (
                  <div key={bottle.id} className={`px-4 py-3 flex items-center justify-between ${isLow ? 'bg-red-500/5' : ''}`}>
                    <div className="flex items-center gap-3">
                      {isLow && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      <div>
                        <p className="font-medium text-sm">{bottle.sku?.spirit_name}</p>
                        <p className="text-xs text-muted-foreground">{bottle.sku?.brand}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {bottle.current_level_ml}ml / {bottle.bottle_size_ml}ml
                      </p>
                      <Progress value={percentage} className="w-20 h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
