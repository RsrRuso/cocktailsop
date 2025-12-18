import { RefObject, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { LayoutGrid, Save, X, Edit, Trash2, Minus, Plus } from "lucide-react";

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

// Size presets for quick sizing
const SIZE_PRESETS = [
  { label: "Small", width: 60, height: 60 },
  { label: "Medium", width: 90, height: 90 },
  { label: "Large", width: 120, height: 120 },
  { label: "Wide", width: 160, height: 80 },
  { label: "Long", width: 80, height: 160 },
  { label: "Bar", width: 45, height: 130 },
];

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
  
  // Base sizes - larger for better visibility
  const baseSize = isMobile ? 80 : 100;
  const minTableSize = isMobile ? 45 : 50;

  const editingTable = tables.find(t => t.id === editingTableId);

  const EditTablePanel = () => {
    if (!editingTable) return null;
    
    const currentWidth = editingTable.width || baseSize;
    const currentHeight = editingTable.height || baseSize;
    
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/10 backdrop-blur-sm" onClick={() => setEditingTableId(null)}>
        <div
          className="w-full max-w-sm bg-background/10 backdrop-blur-xl rounded-2xl p-4 space-y-4 border border-border/20 max-h-[85vh] overflow-y-auto"
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
          
          {/* Name & Table Number */}
          <div className="grid grid-cols-2 gap-2">
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
              <Label className="text-xs text-white/70">Table #</Label>
              <Input 
                type="number"
                value={editingTable.table_number || ""}
                onChange={(e) => {
                  setTables(prev => prev.map(t => 
                    t.id === editingTable.id ? { ...t, table_number: parseInt(e.target.value) || null } : t
                  ));
                }}
                className="h-8 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
          </div>
          
          {/* Capacity */}
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
          
          {/* Allocation & Shape */}
          <div className="grid grid-cols-2 gap-2">
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
          </div>
          
          {/* Size Presets */}
          <div>
            <Label className="text-xs text-white/70 mb-2 block">Quick Size</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {SIZE_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  className={`h-7 text-xs border-white/20 ${
                    currentWidth === preset.width && currentHeight === preset.height
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                  onClick={() => {
                    setTables(prev => prev.map(t => 
                      t.id === editingTable.id ? { ...t, width: preset.width, height: preset.height } : t
                    ));
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Custom Width */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-white/70">Width: {currentWidth}px</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => {
                    setTables(prev => prev.map(t => 
                      t.id === editingTable.id ? { ...t, width: Math.max(40, currentWidth - 10) } : t
                    ));
                  }}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => {
                    setTables(prev => prev.map(t => 
                      t.id === editingTable.id ? { ...t, width: Math.min(200, currentWidth + 10) } : t
                    ));
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Slider
              value={[currentWidth]}
              min={40}
              max={200}
              step={5}
              onValueChange={([val]) => {
                setTables(prev => prev.map(t => 
                  t.id === editingTable.id ? { ...t, width: val } : t
                ));
              }}
              className="w-full"
            />
          </div>
          
          {/* Custom Height */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-white/70">Height: {currentHeight}px</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => {
                    setTables(prev => prev.map(t => 
                      t.id === editingTable.id ? { ...t, height: Math.max(40, currentHeight - 10) } : t
                    ));
                  }}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => {
                    setTables(prev => prev.map(t => 
                      t.id === editingTable.id ? { ...t, height: Math.min(200, currentHeight + 10) } : t
                    ));
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Slider
              value={[currentHeight]}
              min={40}
              max={200}
              step={5}
              onValueChange={([val]) => {
                setTables(prev => prev.map(t => 
                  t.id === editingTable.id ? { ...t, height: val } : t
                ));
              }}
              className="w-full"
            />
          </div>
          
          {/* Preview */}
          <div className="flex justify-center py-2">
            <div 
              className="bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-medium"
              style={{
                width: Math.min(currentWidth, 100),
                height: Math.min(currentHeight, 100),
                borderRadius: editingTable.shape === "round" ? "50%" : editingTable.shape === "booth" ? "12px" : "6px",
              }}
            >
              Preview
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              className="flex-1"
              onClick={async () => {
                const { error } = await supabase
                  .from("lab_ops_tables")
                  .update({
                    name: editingTable.name,
                    table_number: editingTable.table_number,
                    capacity: editingTable.capacity,
                    allocation: editingTable.allocation,
                    shape: editingTable.shape,
                    width: editingTable.width,
                    height: editingTable.height,
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
                  const { error: archiveErr } = await supabase
                    .from("lab_ops_tables")
                    .update({ is_archived: true, archived_at: new Date().toISOString() })
                    .eq("id", editingTable.id);
                  if (archiveErr) {
                    toast({ title: "Error removing table", description: archiveErr.message, variant: "destructive" });
                    return;
                  }
                }
                setTables(prev => prev.filter(t => t.id !== editingTable.id));
                toast({ title: "Table removed" });
                setEditingTableId(null);
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" />Delete
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {/* Canvas Area - Larger Drawing Space */}
      <div className="flex-1 p-2 md:p-4">
        <div 
          ref={canvasRef}
          className={`relative w-full ${isMobile ? "h-[85vh] min-h-[550px]" : "h-[80vh] min-h-[700px]"} bg-gradient-to-br from-muted/20 to-muted/40 rounded-xl border-2 overflow-auto shadow-inner transition-all duration-150 ${
            draggingTable ? "border-primary/50 ring-2 ring-primary/30" : "border-muted-foreground/30"
          }`}
          onMouseMove={(e) => {
            if (!draggingTable || !canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const scrollLeft = canvasRef.current.scrollLeft;
            const scrollTop = canvasRef.current.scrollTop;
            const x = e.clientX - rect.left + scrollLeft - dragOffset.x;
            const y = e.clientY - rect.top + scrollTop - dragOffset.y;
            const clampedX = Math.max(0, x);
            const clampedY = Math.max(0, y);
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
            const scrollLeft = canvasRef.current.scrollLeft;
            const scrollTop = canvasRef.current.scrollTop;
            const x = touch.clientX - rect.left + scrollLeft - dragOffset.x;
            const y = touch.clientY - rect.top + scrollTop - dragOffset.y;
            const clampedX = Math.max(0, x);
            const clampedY = Math.max(0, y);
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
          {/* Grid Background - Larger scrollable area */}
          <div 
            className="absolute select-none" 
            style={{ 
              width: isMobile ? '1200px' : '1800px',
              height: isMobile ? '900px' : '1200px',
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
              const width = table.width || baseSize;
              const height = table.height || baseSize;
              
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
                      ? "cursor-grabbing scale-105 z-30 shadow-2xl ring-4 ring-white/80" 
                      : isSelected 
                        ? "cursor-grab ring-4 ring-white ring-offset-2 ring-offset-background scale-[1.02] z-20 shadow-2xl" 
                        : "cursor-grab hover:scale-[1.02] hover:shadow-xl z-10"
                  } ${table.status === "seated" ? "opacity-70" : ""}`}
                  style={{
                    left: x,
                    top: y,
                    width,
                    height,
                    borderRadius: table.shape === "round" ? "50%" : table.shape === "booth" ? "16px" : "8px",
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
                  {/* Table Number Badge - TOP, Large & Prominent */}
                  {table.table_number && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black font-bold text-sm px-2.5 py-0.5 rounded-full shadow-lg z-10 min-w-[32px] text-center border-2 border-black/10">
                      #{table.table_number}
                    </div>
                  )}
                  
                  {/* Table Content */}
                  <div className={`absolute inset-0 flex flex-col items-center justify-center text-white font-bold drop-shadow-md pointer-events-none ${
                    width < 70 ? "text-[9px]" : width < 100 ? "text-xs" : "text-sm"
                  }`}>
                    <span className="leading-tight text-center px-1 truncate max-w-full">{table.name}</span>
                    <span className={`opacity-80 ${width < 70 ? "text-[8px]" : "text-xs"}`}>
                      {table.capacity} pax
                    </span>
                  </div>
                  
                  {/* Edit Button - Only shows when selected */}
                  {isSelected && !isDragging && (
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 w-7 h-7 bg-background/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center z-40 border border-border/30 hover:bg-background hover:text-foreground transition-colors"
                      onPointerUp={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingTableId(table.id);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5" />
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
                <div key={alloc.value} className="flex items-center gap-1 text-xs whitespace-nowrap">
                  <span className={`w-2.5 h-2.5 rounded-full ${colors[alloc.value] || "bg-primary"}`}></span>
                  <span className="text-muted-foreground">{alloc.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Edit Panel */}
      <EditTablePanel />
    </div>
  );
}
