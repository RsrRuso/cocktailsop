import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Users, Table2, Save, RotateCcw, Shuffle } from "lucide-react";

interface Staff {
  id: string;
  full_name: string;
  role: string;
  assigned_tables: number[];
}

interface FloorTable {
  id: string;
  table_number: number | null;
  name: string;
  assigned_to?: string | null;
}

interface QuickTableAssignmentProps {
  open: boolean;
  onClose: () => void;
  outletId: string;
  onSave?: () => void;
}

export function QuickTableAssignment({ open, onClose, outletId, onSave }: QuickTableAssignmentProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [assignments, setAssignments] = useState<Record<number, string | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, outletId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, tablesRes] = await Promise.all([
        supabase
          .from("lab_ops_staff")
          .select("id, full_name, role")
          .eq("outlet_id", outletId)
          .eq("is_active", true)
          .in("role", ["waiter", "bartender", "server", "manager"]),
        supabase
          .from("lab_ops_tables")
          .select("id, table_number, name, assigned_to")
          .eq("outlet_id", outletId)
          .order("table_number", { ascending: true })
      ]);

      const staffData = (staffRes.data || []).map(s => ({
        ...s,
        assigned_tables: [] as number[]
      }));
      setStaff(staffData);
      
      const tableData = tablesRes.data || [];
      setTables(tableData);
      
      // Build initial assignments from tables
      const initialAssignments: Record<number, string | null> = {};
      tableData.forEach(t => {
        if (t.table_number !== null) {
          initialAssignments[t.table_number] = t.assigned_to || null;
        }
      });
      setAssignments(initialAssignments);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error loading data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const assignTable = (tableNumber: number, staffId: string | null) => {
    setAssignments(prev => ({
      ...prev,
      [tableNumber]: staffId
    }));
  };

  const clearAllAssignments = () => {
    const cleared: Record<number, string | null> = {};
    tables.forEach(t => {
      if (t.table_number !== null) {
        cleared[t.table_number] = null;
      }
    });
    setAssignments(cleared);
    toast({ title: "All assignments cleared" });
  };

  const autoAssign = () => {
    if (staff.length === 0) {
      toast({ title: "No staff available", variant: "destructive" });
      return;
    }
    
    const validTables = tables.filter(t => t.table_number !== null);
    const tablesPerStaff = Math.ceil(validTables.length / staff.length);
    
    const newAssignments: Record<number, string | null> = {};
    validTables.forEach((table, idx) => {
      const staffIndex = Math.floor(idx / tablesPerStaff);
      if (staff[staffIndex] && table.table_number !== null) {
        newAssignments[table.table_number] = staff[staffIndex].id;
      }
    });
    
    setAssignments(newAssignments);
    toast({ title: "Tables auto-assigned evenly" });
  };

  const saveAssignments = async () => {
    setIsSaving(true);
    try {
      // Update each table's assigned_to field
      const updates = tables
        .filter(t => t.table_number !== null)
        .map(t => 
          supabase
            .from("lab_ops_tables")
            .update({ assigned_to: assignments[t.table_number!] || null })
            .eq("id", t.id)
        );
      
      await Promise.all(updates);
      
      toast({ title: "Table assignments saved successfully" });
      onSave?.();
      onClose();
    } catch (error: any) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getStaffName = (staffId: string | null) => {
    if (!staffId) return "Unassigned";
    return staff.find(s => s.id === staffId)?.full_name || "Unknown";
  };

  const getStaffColor = (staffId: string | null) => {
    if (!staffId) return "bg-muted text-muted-foreground";
    const index = staff.findIndex(s => s.id === staffId);
    const colors = [
      "bg-blue-500/20 text-blue-400 border-blue-500",
      "bg-green-500/20 text-green-400 border-green-500",
      "bg-purple-500/20 text-purple-400 border-purple-500",
      "bg-orange-500/20 text-orange-400 border-orange-500",
      "bg-pink-500/20 text-pink-400 border-pink-500",
      "bg-cyan-500/20 text-cyan-400 border-cyan-500",
    ];
    return colors[index % colors.length];
  };

  const getStaffTableCount = (staffId: string) => {
    return Object.values(assignments).filter(id => id === staffId).length;
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="bg-card border-border max-w-3xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Quick Table Assignment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={autoAssign}
              className="flex-1"
            >
              <Shuffle className="h-4 w-4 mr-2" />
              Auto-Assign Evenly
            </Button>
            <Button 
              variant="outline" 
              onClick={clearAllAssignments}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>

          {/* Staff Summary */}
          <Card className="bg-muted/30">
            <CardHeader className="py-2 px-4">
              <CardTitle className="text-sm">Staff on Shift</CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <div className="flex flex-wrap gap-2">
                {staff.map(s => (
                  <Badge 
                    key={s.id} 
                    variant="outline"
                    className={getStaffColor(s.id)}
                  >
                    {s.full_name} ({getStaffTableCount(s.id)} tables)
                  </Badge>
                ))}
                {staff.length === 0 && (
                  <p className="text-sm text-muted-foreground">No staff available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Table Grid */}
          <ScrollArea className="h-[45vh]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
              {tables
                .filter(t => t.table_number !== null)
                .map(table => (
                  <Card 
                    key={table.id} 
                    className={`transition-all ${
                      assignments[table.table_number!] 
                        ? 'border-primary/50' 
                        : 'border-border/50'
                    }`}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Table2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">T{table.table_number}</span>
                        </div>
                      </div>
                      <Select
                        value={assignments[table.table_number!] || "none"}
                        onValueChange={(v) => assignTable(table.table_number!, v === "none" ? null : v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue>
                            <span className={assignments[table.table_number!] ? "" : "text-muted-foreground"}>
                              {getStaffName(assignments[table.table_number!])}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {staff.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}
            </div>
            
            {tables.filter(t => t.table_number !== null).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No tables configured. Add tables in the floor plan first.
              </div>
            )}
          </ScrollArea>

          {/* Save Button */}
          <Button 
            onClick={saveAssignments} 
            className="w-full"
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Assignments"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
