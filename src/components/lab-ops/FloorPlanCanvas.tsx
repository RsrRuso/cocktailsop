import { RefObject, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { LayoutGrid, Save, X, Edit, Trash2 } from "lucide-react";

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

interface FloorPlanCanvasProps {
  canvasRef: RefObject<HTMLDivElement>;
  floorPlanTables: Table[];
  tables: Table[];
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  selectedTableForMove: string | null;
  setSelectedTableForMove: (id: string | null) => void;
  draggingTable: string | null;
  setDraggingTable: (id: string | null) => void;
  dragOffset: { x: number; y: number };
  setDragOffset: (offset: { x: number; y: number }) => void;
  handleTableDrag: (tableId: string, x: number, y: number) => void;
  saveTablePosition: (table: Table) => void;
  ALLOCATIONS: { value: string; label: string }[];
  SHAPES: { value: string; label: string }[];
}

export function FloorPlanCanvas({
  canvasRef,
  floorPlanTables,
  tables,
  setTables,
  selectedTableForMove,
  setSelectedTableForMove,
  draggingTable,
  setDraggingTable,
  dragOffset,
  setDragOffset,
  handleTableDrag,
  saveTablePosition,
  ALLOCATIONS,
  SHAPES,
}: FloorPlanCanvasProps) {
  const isMobile = useIsMobile();
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  
  // Mobile: smaller tables for more canvas space
  const baseSize = isMobile ? 50 : 70;
  const minTableSize = isMobile ? 35 : 50;

  const editingTable = tables.find(t => t.id === editingTableId);

  const EditTablePanel = () => {
    if (!editingTable) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setEditingTableId(null)}>
        <div 
          className="w-full max-w-xs bg-black/60 backdrop-blur-xl rounded-2xl p-4 space-y-3 border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white/90">Edit Table</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setEditingTableId(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <Label className="text-xs text-white/70">Name</Label>
            <Input 
              value={editingTable.name}
              onChange={(e) => {
                setTables(prev => prev.map(t => 
                  t.id === editingTable.id ? { ...t, name: e.target.value } : t
                ));
              }}
              className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
          <div>
            <Label className="text-xs text-white/70">Capacity</Label>
            <Input 
              type="number"
              value={editingTable.capacity || ""}
              onChange={(e) => {
                setTables(prev => prev.map(t => 
                  t.id === editingTable.id ? { ...t, capacity: parseInt(e.target.value) || 0 } : t
                ));
              }}
              className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
          <div>
            <Label className="text-xs text-white/70">Allocation</Label>
            <Select 
              value={editingTable.allocation || "indoor"} 
              onValueChange={(v) => {
                setTables(prev => prev.map(t => 
                  t.id === editingTable.id ? { ...t, allocation: v } : t
                ));
              }}
            >
              <SelectTrigger className="h-8 text-sm bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALLOCATIONS.map(a => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-white/70">Shape</Label>
            <Select 
              value={editingTable.shape || "square"} 
              onValueChange={(v) => {
                setTables(prev => prev.map(t => 
                  t.id === editingTable.id ? { ...t, shape: v } : t
                ));
              }}
            >
              <SelectTrigger className="h-8 text-sm bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
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
                const { error } = await supabase
                  .from("lab_ops_tables")
                  .update({
                    name: editingTable.name,
                    capacity: editingTable.capacity,
                    allocation: editingTable.allocation,
                    shape: editingTable.shape,
                    position_x: Math.round(editingTable.position_x || 0),
                    position_y: Math.round(editingTable.position_y || 0)
                  })
                  .eq("id", editingTable.id);
                if (error) {
                  toast({ title: "Error updating table", description: error.message, variant: "destructive" });
                  return;
                }
                toast({ title: "Table saved" });
                setEditingTableId(null);
              }}
            >
              <Save className="h-3 w-3 mr-1" />Save
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={async () => {
                const { error } = await supabase.from("lab_ops_tables").delete().eq("id", editingTable.id);
                if (error) {
                  toast({ title: "Error deleting table", description: error.message, variant: "destructive" });
                  return;
                }
                setTables(prev => prev.filter(t => t.id !== editingTable.id));
                toast({ title: "Table deleted" });
                setEditingTableId(null);
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" />Delete
            </Button>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            className="w-full mt-2 border-white/20 text-white hover:bg-white/10"
            onClick={() => setEditingTableId(null)}
          >
            Close
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {/* Canvas Area - Full Width */}
      <div className="flex-1 p-2 md:p-4">
        <div 
          ref={canvasRef}
          className={`relative w-full ${isMobile ? "h-[75vh] min-h-[450px]" : "h-[70vh] min-h-[600px]"} bg-gradient-to-br from-muted/20 to-muted/40 rounded-xl border-2 overflow-hidden shadow-inner transition-all duration-150 ${
            draggingTable ? "border-primary/50 ring-2 ring-primary/30" : "border-muted-foreground/30"
          }`}
          onMouseMove={(e) => {
            if (!draggingTable || !canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left - dragOffset.x;
            const y = e.clientY - rect.top - dragOffset.y;
            const clampedX = Math.max(0, Math.min(x, rect.width - minTableSize));
            const clampedY = Math.max(0, Math.min(y, rect.height - minTableSize));
            handleTableDrag(draggingTable, clampedX, clampedY);
          }}
          onMouseUp={() => {
            if (draggingTable) {
              const table = tables.find(t => t.id === draggingTable);
              if (table) {
                saveTablePosition(table);
              }
              setDraggingTable(null);
            }
          }}
          onMouseLeave={() => {
            if (draggingTable) {
              const table = tables.find(t => t.id === draggingTable);
              if (table) {
                saveTablePosition(table);
              }
              setDraggingTable(null);
            }
          }}
          onTouchMove={(e) => {
            if (!draggingTable || !canvasRef.current) return;
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvasRef.current.getBoundingClientRect();
            const x = touch.clientX - rect.left - dragOffset.x;
            const y = touch.clientY - rect.top - dragOffset.y;
            const clampedX = Math.max(0, Math.min(x, rect.width - minTableSize));
            const clampedY = Math.max(0, Math.min(y, rect.height - minTableSize));
            handleTableDrag(draggingTable, clampedX, clampedY);
          }}
          onTouchEnd={() => {
            if (draggingTable) {
              const table = tables.find(t => t.id === draggingTable);
              if (table) {
                saveTablePosition(table);
              }
              setDraggingTable(null);
            }
          }}
          onClick={() => setSelectedTableForMove(null)}
        >
          {/* Grid Background */}
          <div 
            className="absolute inset-0 select-none" 
            style={{ 
              backgroundImage: `
                linear-gradient(to right, hsl(var(--muted-foreground) / 0.08) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--muted-foreground) / 0.08) 1px, transparent 1px)
              `,
              backgroundSize: isMobile ? '30px 30px' : '40px 40px'
            }}
          >
            {/* Tables */}
            {floorPlanTables.map((table) => {
              const x = table.position_x ?? (50 + Math.random() * 200);
              const y = table.position_y ?? (50 + Math.random() * 200);
              const width = table.width || (table.shape === "rectangle" ? baseSize * 1.4 : table.shape === "bar" ? baseSize * 0.5 : baseSize);
              const height = table.height || (table.shape === "rectangle" ? baseSize * 0.7 : table.shape === "bar" ? baseSize * 1.2 : baseSize);
              
              const allocationColors: Record<string, string> = {
                indoor: "from-blue-500 to-blue-600",
                outdoor: "from-green-500 to-green-600",
                patio: "from-amber-500 to-amber-600",
                terrace: "from-orange-500 to-orange-600",
                rooftop: "from-purple-500 to-purple-600",
                private: "from-pink-500 to-pink-600"
              };
              const gradientColor = allocationColors[table.allocation || "indoor"] || "from-primary to-primary/80";
              const isSelected = selectedTableForMove === table.id;
              const isDragging = draggingTable === table.id;
              
              return (
                <div
                  key={table.id}
                  className={`absolute select-none touch-none bg-gradient-to-br ${gradientColor} ${
                    isDragging 
                      ? "cursor-grabbing scale-110 z-30 shadow-2xl ring-4 ring-white/80" 
                      : isSelected 
                        ? "cursor-grab ring-4 ring-white ring-offset-2 ring-offset-background scale-105 z-20 shadow-2xl" 
                        : "cursor-grab hover:scale-105 hover:shadow-xl z-10"
                  } ${table.status === "seated" ? "opacity-70" : ""}`}
                  style={{
                    left: x,
                    top: y,
                    width,
                    height,
                    borderRadius: table.shape === "round" ? "50%" : table.shape === "booth" ? "12px" : "6px",
                    boxShadow: isDragging 
                      ? "0 25px 50px rgba(0,0,0,0.4)" 
                      : isSelected 
                        ? "0 20px 40px rgba(0,0,0,0.3)" 
                        : "0 4px 12px rgba(0,0,0,0.15)",
                    transition: isDragging ? "none" : "transform 0.15s ease-out, box-shadow 0.15s ease-out"
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDragOffset({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top
                    });
                    setDraggingTable(table.id);
                    setSelectedTableForMove(table.id);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    const touch = e.touches[0];
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDragOffset({
                      x: touch.clientX - rect.left,
                      y: touch.clientY - rect.top
                    });
                    setDraggingTable(table.id);
                    setSelectedTableForMove(table.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDragging) {
                      setSelectedTableForMove(isSelected ? null : table.id);
                    }
                  }}
                >
                  <div className={`absolute inset-0 flex flex-col items-center justify-center text-white font-bold drop-shadow-md pointer-events-none ${isMobile ? "text-[10px]" : "text-sm"}`}>
                    <span className={isMobile ? "text-[10px] leading-tight" : "text-sm"}>{table.name}</span>
                    <span className={`opacity-80 ${isMobile ? "text-[8px]" : "text-xs"}`}>{table.capacity}</span>
                  </div>
                  
                  {/* Edit Button - Only shows when selected */}
                  {isSelected && !isDragging && (
                    <button
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-primary hover:text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTableId(table.id);
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        setEditingTableId(table.id);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Empty State */}
          {floorPlanTables.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <LayoutGrid className={`${isMobile ? "h-12 w-12" : "h-16 w-16"} opacity-30 mb-4`} />
              <p className={`${isMobile ? "text-sm" : "text-lg"} font-medium`}>No tables yet</p>
              <p className={`${isMobile ? "text-xs" : "text-sm"}`}>Add tables from the Tables tab first</p>
            </div>
          )}
        </div>
        
        {/* Footer - Compact on Mobile */}
        <div className={`flex items-center justify-between mt-2 md:mt-4 ${isMobile ? "flex-col gap-2" : ""}`}>
          <div className={`flex items-center gap-3 md:gap-6 text-xs md:text-sm text-muted-foreground ${isMobile ? "order-2" : ""}`}>
            <span className="flex items-center gap-1">
              <span className="text-sm md:text-lg">👆</span> Tap to select, <Edit className="h-3 w-3 inline" /> to edit
            </span>
          </div>
          {/* Allocation Legend - Scrollable on Mobile */}
          <div className={`flex gap-2 md:gap-3 ${isMobile ? "overflow-x-auto pb-1 w-full justify-center" : "flex-wrap"}`}>
            {ALLOCATIONS.slice(0, isMobile ? 4 : ALLOCATIONS.length).map(alloc => {
              const colors: Record<string, string> = {
                indoor: "bg-blue-500",
                outdoor: "bg-green-500",
                patio: "bg-amber-500",
                terrace: "bg-orange-500",
                rooftop: "bg-purple-500",
                private: "bg-pink-500"
              };
              return (
                <div key={alloc.value} className="flex items-center gap-1 shrink-0">
                  <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${colors[alloc.value] || "bg-gray-500"}`} />
                  <span className="text-[10px] md:text-xs text-muted-foreground">{alloc.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Transparent Edit Panel */}
      {editingTableId && <EditTablePanel />}
    </div>
  );
}