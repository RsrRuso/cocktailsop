import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, MapPin, Box, List, Download, Move, Square, Circle, Type, Triangle, Hexagon, Minus, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { ZoomableImage } from "@/components/ZoomableImage";

const EQUIPMENT_TYPES = [
  { value: "fridge", label: "Fridge" },
  { value: "freezer", label: "Freezer" },
  { value: "walk_in_fridge", label: "Walk-in Fridge" },
  { value: "walk_in_freezer", label: "Walk-in Freezer" },
  { value: "cabinet", label: "Cabinet" },
  { value: "drawer", label: "Drawer" },
  { value: "cage", label: "Cage/Storage Cage" },
  { value: "trolley", label: "Trolley/Cart" },
  { value: "alcohol_storage", label: "Alcohol Storage" },
  { value: "non_alcohol_storage", label: "Non-Alcohol Storage" },
  { value: "ice_section", label: "Ice Section" },
  { value: "rail", label: "Rail" },
];

const AREA_TYPES = [
  { value: "station", label: "Station" },
  { value: "storage", label: "Storage" },
  { value: "prep", label: "Prep Area" },
  { value: "service", label: "Service Area" },
];

const ITEM_CATEGORIES = [
  "Purees/Syrups/Brine",
  "Juices/Premixes",
  "Tools",
  "Garnishes",
  "Fresh Ingredients",
  "Spirits",
  "Liqueurs",
  "Wines",
  "Beers",
  "Other",
];

type DrawingMode = "select" | "rect" | "circle" | "text" | "triangle" | "hexagon" | "line";

interface CanvasElement {
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  x2?: number;
  y2?: number;
  points?: { x: number; y: number }[];
  text?: string;
  label?: string;
  color?: string;
  number?: string;
}

export default function MapPlanner() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>("select");
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [draggingElement, setDraggingElement] = useState<number | null>(null);
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [equipmentPhotos, setEquipmentPhotos] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Fetch location maps
  const { data: maps } = useQuery({
    queryKey: ["location_maps", user?.id, currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_maps")
        .select("*")
        .eq("user_id", user?.id)
        .eq("workspace_id", currentWorkspace?.id || null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch areas for selected map
  const { data: areas } = useQuery({
    queryKey: ["location_areas", selectedMap],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_areas")
        .select("*")
        .eq("map_id", selectedMap)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedMap,
  });

  // Fetch equipment for selected area
  const { data: equipment } = useQuery({
    queryKey: ["area_equipment", selectedArea],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("area_equipment")
        .select("*")
        .eq("area_id", selectedArea)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedArea,
  });

  // Fetch items for selected equipment
  const { data: items } = useQuery({
    queryKey: ["equipment_items", selectedEquipment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_items")
        .select("*")
        .eq("equipment_id", selectedEquipment)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedEquipment,
  });

  // Load photos when equipment is selected
  useEffect(() => {
    if (selectedEquipment && equipment) {
      const eq = equipment.find(e => e.id === selectedEquipment);
      setEquipmentPhotos(eq?.photos || []);
    } else {
      setEquipmentPhotos([]);
    }
  }, [selectedEquipment, equipment]);

  // Create map mutation
  const createMapMutation = useMutation({
    mutationFn: async (formData: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from("location_maps")
        .insert({
          user_id: user?.id,
          workspace_id: currentWorkspace?.id || null,
          ...formData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location_maps"] });
      toast.success("Map created successfully");
    },
  });

  // Create area mutation
  const createAreaMutation = useMutation({
    mutationFn: async (formData: { name: string; area_type: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("location_areas")
        .insert({
          map_id: selectedMap,
          ...formData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location_areas"] });
      toast.success("Area created successfully");
    },
  });

  // Create equipment mutation
  const createEquipmentMutation = useMutation({
    mutationFn: async (formData: {
      name: string;
      equipment_type: string;
      capacity?: string;
      notes?: string;
      photos?: string[];
    }) => {
      const { data, error } = await supabase
        .from("area_equipment")
        .insert({
          area_id: selectedArea,
          ...formData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["area_equipment"] });
      toast.success("Equipment added successfully");
    },
  });

  // Update equipment photos
  const updateEquipmentPhotosMutation = useMutation({
    mutationFn: async ({ id, photos }: { id: string; photos: string[] }) => {
      const { error } = await supabase
        .from("area_equipment")
        .update({ photos })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["area_equipment"] });
      toast.success("Photos updated");
    },
  });

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: async (formData: {
      item_name: string;
      category?: string;
      quantity?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("equipment_items")
        .insert({
          equipment_id: selectedEquipment,
          ...formData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment_items"] });
      toast.success("Item added successfully");
    },
  });

  // Delete mutations
  const deleteMapMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("location_maps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location_maps"] });
      toast.success("Map deleted");
      setSelectedMap(null);
    },
  });

  const deleteAreaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("location_areas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location_areas"] });
      toast.success("Area deleted");
      setSelectedArea(null);
    },
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("area_equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["area_equipment"] });
      toast.success("Equipment deleted");
      setSelectedEquipment(null);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment_items"] });
      toast.success("Item deleted");
    },
  });

  // Photo upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedEquipment) return;

    if (equipmentPhotos.length + files.length > 3) {
      toast.error("Maximum 3 photos allowed");
      return;
    }

    const uploadedUrls: string[] = [];

    for (const file of Array.from(files)) {
      const fileName = `${selectedEquipment}_${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("equipment-photos")
        .upload(fileName, file);

      if (error) {
        toast.error("Photo upload failed");
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("equipment-photos")
        .getPublicUrl(data.path);

      uploadedUrls.push(publicUrl);
    }

    const updatedPhotos = [...equipmentPhotos, ...uploadedUrls].slice(0, 3);
    setEquipmentPhotos(updatedPhotos);
    updateEquipmentPhotosMutation.mutate({
      id: selectedEquipment,
      photos: updatedPhotos,
    });
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = equipmentPhotos.filter((_, i) => i !== index);
    setEquipmentPhotos(updatedPhotos);
    if (selectedEquipment) {
      updateEquipmentPhotosMutation.mutate({
        id: selectedEquipment,
        photos: updatedPhotos,
      });
    }
  };

  // Canvas drawing functions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "hsl(var(--background))";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "hsl(var(--border))";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw elements
    canvasElements.forEach((element, index) => {
      ctx.fillStyle = element.color || "hsl(var(--primary))";
      ctx.strokeStyle = draggingElement === index || selectedElement === index 
        ? "hsl(var(--ring))" 
        : "hsl(var(--primary))";
      ctx.lineWidth = selectedElement === index ? 3 : 2;

      if (element.type === "rect") {
        ctx.fillRect(element.x, element.y, element.width!, element.height!);
        ctx.strokeRect(element.x, element.y, element.width!, element.height!);
      } else if (element.type === "circle") {
        ctx.beginPath();
        ctx.arc(element.x, element.y, element.radius!, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (element.type === "triangle") {
        ctx.beginPath();
        ctx.moveTo(element.x, element.y - 40);
        ctx.lineTo(element.x - 35, element.y + 20);
        ctx.lineTo(element.x + 35, element.y + 20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (element.type === "hexagon") {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const x = element.x + 30 * Math.cos(angle);
          const y = element.y + 30 * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (element.type === "line") {
        ctx.beginPath();
        ctx.moveTo(element.x, element.y);
        ctx.lineTo(element.x2!, element.y2!);
        ctx.stroke();
      } else if (element.type === "text") {
        ctx.fillStyle = "hsl(var(--foreground))";
        ctx.font = "16px sans-serif";
        ctx.fillText(element.text!, element.x, element.y);
      }

      // Draw label and number
      if (element.label || element.number) {
        ctx.fillStyle = "hsl(var(--foreground))";
        ctx.font = "bold 12px sans-serif";
        const text = [element.number, element.label].filter(Boolean).join(" - ");
        ctx.fillText(text, element.x, element.y - 8);
      }
    });
  }, [canvasElements, draggingElement, selectedElement]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawingMode === "select") {
      // Select element
      const elementIndex = canvasElements.findIndex((el) => {
        if (el.type === "rect") {
          return x >= el.x && x <= el.x + el.width! && y >= el.y && y <= el.y + el.height!;
        } else if (el.type === "circle") {
          const dist = Math.sqrt((x - el.x) ** 2 + (y - el.y) ** 2);
          return dist <= el.radius!;
        }
        return false;
      });
      setSelectedElement(elementIndex !== -1 ? elementIndex : null);
    } else if (drawingMode === "rect") {
      const newElement: CanvasElement = {
        type: "rect",
        x: x - 50,
        y: y - 25,
        width: 100,
        height: 50,
        color: "hsl(var(--primary))",
        label: "Equipment",
      };
      setCanvasElements([...canvasElements, newElement]);
    } else if (drawingMode === "circle") {
      const newElement: CanvasElement = {
        type: "circle",
        x,
        y,
        radius: 30,
        color: "hsl(var(--secondary))",
        label: "Station",
      };
      setCanvasElements([...canvasElements, newElement]);
    } else if (drawingMode === "triangle") {
      const newElement: CanvasElement = {
        type: "triangle",
        x,
        y,
        color: "hsl(var(--accent))",
      };
      setCanvasElements([...canvasElements, newElement]);
    } else if (drawingMode === "hexagon") {
      const newElement: CanvasElement = {
        type: "hexagon",
        x,
        y,
        color: "hsl(var(--muted))",
      };
      setCanvasElements([...canvasElements, newElement]);
    } else if (drawingMode === "line") {
      const newElement: CanvasElement = {
        type: "line",
        x,
        y,
        x2: x + 100,
        y2: y,
        color: "hsl(var(--foreground))",
      };
      setCanvasElements([...canvasElements, newElement]);
    } else if (drawingMode === "text") {
      const text = prompt("Enter text:");
      if (text) {
        const newElement: CanvasElement = {
          type: "text",
          x,
          y,
          text,
        };
        setCanvasElements([...canvasElements, newElement]);
      }
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingMode !== "select") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on an element
    const elementIndex = canvasElements.findIndex((el) => {
      if (el.type === "rect") {
        return x >= el.x && x <= el.x + el.width! && y >= el.y && y <= el.y + el.height!;
      } else if (el.type === "circle") {
        const dist = Math.sqrt((x - el.x) ** 2 + (y - el.y) ** 2);
        return dist <= el.radius!;
      }
      return false;
    });

    if (elementIndex !== -1) {
      setDraggingElement(elementIndex);
      setSelectedElement(elementIndex);
      setMousePos({ x, y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingElement === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - mousePos.x;
    const dy = y - mousePos.y;

    const updatedElements = [...canvasElements];
    const element = updatedElements[draggingElement];

    element.x += dx;
    element.y += dy;

    if (element.x2 !== undefined) element.x2 += dx;
    if (element.y2 !== undefined) element.y2 += dy;

    setCanvasElements(updatedElements);
    setMousePos({ x, y });
  };

  const handleCanvasMouseUp = () => {
    setDraggingElement(null);
  };

  const clearCanvas = () => {
    if (confirm("Clear the canvas?")) {
      setCanvasElements([]);
      setSelectedElement(null);
    }
  };

  const exportCanvasImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "floor-plan.png";
    link.href = canvas.toDataURL();
    link.click();
    toast.success("Floor plan exported");
  };

  const addNumberToElement = () => {
    if (selectedElement === null) {
      toast.error("Select an element first");
      return;
    }
    const number = prompt("Enter number:");
    if (number) {
      const updated = [...canvasElements];
      updated[selectedElement].number = number;
      setCanvasElements(updated);
    }
  };

  const deleteSelectedElement = () => {
    if (selectedElement !== null) {
      setCanvasElements(canvasElements.filter((_, i) => i !== selectedElement));
      setSelectedElement(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />

      <div className="container mx-auto px-4 pt-20 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Floor Plan Designer</h1>
            <p className="text-muted-foreground">
              Design venue layouts with drag-and-drop shapes and equipment
            </p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Map
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Map</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createMapMutation.mutate({
                    name: formData.get("name") as string,
                    description: formData.get("description") as string,
                  });
                  (e.target as HTMLFormElement).reset();
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="name">Map Name</Label>
                  <Input id="name" name="name" placeholder="e.g., Main Bar Layout" required />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Brief description of this map"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Map
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="designer" className="w-full mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="designer">
              <MapPin className="mr-2 h-4 w-4" />
              Visual Designer
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="mr-2 h-4 w-4" />
              List Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="designer" className="mt-6 space-y-4">
            {!selectedMap ? (
              <Card>
                <CardContent className="flex items-center justify-center py-20">
                  <p className="text-muted-foreground">Select or create a map to start designing</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Drawing Tools */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <CardTitle>Drawing Tools</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={drawingMode === "select" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDrawingMode("select")}
                          title="Select & Move"
                        >
                          <Move className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={drawingMode === "rect" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDrawingMode("rect")}
                          title="Rectangle"
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={drawingMode === "circle" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDrawingMode("circle")}
                          title="Circle"
                        >
                          <Circle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={drawingMode === "triangle" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDrawingMode("triangle")}
                          title="Triangle"
                        >
                          <Triangle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={drawingMode === "hexagon" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDrawingMode("hexagon")}
                          title="Hexagon"
                        >
                          <Hexagon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={drawingMode === "line" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDrawingMode("line")}
                          title="Line"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={drawingMode === "text" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDrawingMode("text")}
                          title="Add Text/Number"
                        >
                          <Type className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={addNumberToElement} title="Add Number to Selected">
                          #
                        </Button>
                        <Button variant="outline" size="sm" onClick={deleteSelectedElement} disabled={selectedElement === null}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearCanvas}>
                          Clear All
                        </Button>
                        <Button variant="default" size="sm" onClick={exportCanvasImage}>
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      {drawingMode === "select" && "Click and drag to move elements. Click an element to select it."}
                      {drawingMode === "rect" && "Click to place rectangular equipment"}
                      {drawingMode === "circle" && "Click to place circular stations"}
                      {drawingMode === "triangle" && "Click to place triangular shapes"}
                      {drawingMode === "hexagon" && "Click to place hexagonal shapes"}
                      {drawingMode === "line" && "Click to draw lines"}
                      {drawingMode === "text" && "Click to add text labels"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <canvas
                      ref={canvasRef}
                      width={1200}
                      height={800}
                      className="border border-border rounded-lg cursor-crosshair w-full bg-background"
                      onClick={handleCanvasClick}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                    />
                  </CardContent>
                </Card>

                {/* Equipment Palette */}
                {areas && areas.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Equipment Palette</CardTitle>
                      <CardDescription>Click equipment to add to canvas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {areas?.map((area) =>
                          equipment
                            ?.filter((eq) => eq.area_id === area.id)
                            .map((eq) => (
                              <Button
                                key={eq.id}
                                variant="outline"
                                size="sm"
                                className="justify-start"
                                onClick={() => {
                                  const newElement: CanvasElement = {
                                    type: "rect",
                                    x: 100,
                                    y: 100,
                                    width: 120,
                                    height: 60,
                                    color: "hsl(var(--primary))",
                                    label: eq.name,
                                  };
                                  setCanvasElements([...canvasElements, newElement]);
                                  toast.success(`Added ${eq.name}`);
                                }}
                              >
                                <Box className="mr-2 h-4 w-4" />
                                {eq.name}
                              </Button>
                            ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Maps List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Maps</CardTitle>
                  <CardDescription>Your venue maps</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {maps?.map((map) => (
                    <div
                      key={map.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedMap === map.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-accent"
                      }`}
                      onClick={() => {
                        setSelectedMap(map.id);
                        setSelectedArea(null);
                        setSelectedEquipment(null);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span className="font-medium">{map.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this map?")) {
                              deleteMapMutation.mutate(map.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {map.description && (
                        <p className="text-sm text-muted-foreground mt-1">{map.description}</p>
                      )}
                    </div>
                  ))}
                  {maps?.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No maps yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Areas */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Areas</CardTitle>
                      <CardDescription>Zones & stations</CardDescription>
                    </div>
                    {selectedMap && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Area</DialogTitle>
                          </DialogHeader>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              createAreaMutation.mutate({
                                name: formData.get("name") as string,
                                area_type: formData.get("area_type") as string,
                                notes: formData.get("notes") as string,
                              });
                              (e.target as HTMLFormElement).reset();
                            }}
                            className="space-y-4"
                          >
                            <div>
                              <Label htmlFor="area_name">Area Name</Label>
                              <Input id="area_name" name="name" placeholder="e.g., Station 1" required />
                            </div>
                            <div>
                              <Label htmlFor="area_type">Type</Label>
                              <Select name="area_type" required>
                                <SelectTrigger id="area_type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {AREA_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="area_notes">Notes</Label>
                              <Textarea id="area_notes" name="notes" />
                            </div>
                            <Button type="submit" className="w-full">
                              Add Area
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!selectedMap && <p className="text-center text-muted-foreground py-8">Select a map first</p>}
                  {selectedMap &&
                    areas?.map((area) => (
                      <div
                        key={area.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedArea === area.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:bg-accent"
                        }`}
                        onClick={() => {
                          setSelectedArea(area.id);
                          setSelectedEquipment(null);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{area.name}</span>
                            <p className="text-xs opacity-75">{area.area_type}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this area?")) {
                                deleteAreaMutation.mutate(area.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  {selectedMap && areas?.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No areas yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Equipment */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Equipment</CardTitle>
                      <CardDescription>Storage & tools</CardDescription>
                    </div>
                    {selectedArea && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Equipment</DialogTitle>
                          </DialogHeader>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              createEquipmentMutation.mutate({
                                name: formData.get("name") as string,
                                equipment_type: formData.get("equipment_type") as string,
                                capacity: formData.get("capacity") as string,
                                notes: formData.get("notes") as string,
                              });
                              (e.target as HTMLFormElement).reset();
                            }}
                            className="space-y-4"
                          >
                            <div>
                              <Label htmlFor="equip_name">Equipment Name</Label>
                              <Input id="equip_name" name="name" placeholder="e.g., Main Fridge" required />
                            </div>
                            <div>
                              <Label htmlFor="equip_type">Type</Label>
                              <Select name="equipment_type" required>
                                <SelectTrigger id="equip_type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {EQUIPMENT_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="capacity">Capacity</Label>
                              <Input id="capacity" name="capacity" placeholder="e.g., 12 bottles" />
                            </div>
                            <div>
                              <Label htmlFor="equip_notes">Notes</Label>
                              <Textarea id="equip_notes" name="notes" />
                            </div>
                            <Button type="submit" className="w-full">
                              Add Equipment
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedArea && <p className="text-center text-muted-foreground py-8">Select an area first</p>}
                  
                  {selectedArea && equipment && equipment.length > 0 && (
                    <Accordion type="single" collapsible className="space-y-2">
                      {equipment.map((equip) => (
                        <AccordionItem key={equip.id} value={equip.id} className="border rounded-lg px-4">
                          <AccordionTrigger
                            className="hover:no-underline"
                            onClick={() => setSelectedEquipment(equip.id)}
                          >
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center gap-2">
                                <Box className="h-4 w-4" />
                                <span className="font-medium">{equip.name}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Delete this equipment?")) {
                                    deleteEquipmentMutation.mutate(equip.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            {/* Equipment Photos */}
                            <div className="space-y-2">
                              <Label>Equipment Photos (Max 3)</Label>
                              <div className="grid grid-cols-3 gap-2">
                                {equipmentPhotos.map((photo, idx) => (
                                  <div key={idx} className="relative group">
                                    <ZoomableImage
                                      src={photo}
                                      alt={`Equipment ${idx + 1}`}
                                      className="w-full h-24 object-cover rounded"
                                      containerClassName="w-full"
                                    />
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                      onClick={() => removePhoto(idx)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                                {equipmentPhotos.length < 3 && (
                                  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded cursor-pointer hover:bg-accent">
                                    <ImageIcon className="h-6 w-6 mb-1" />
                                    <span className="text-xs">Add Photo</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={handlePhotoUpload}
                                      multiple
                                    />
                                  </label>
                                )}
                              </div>
                            </div>

                            {/* Items in Equipment */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Items in {equip.name}</Label>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add Item
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Add Item to {equip.name}</DialogTitle>
                                    </DialogHeader>
                                    <form
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        createItemMutation.mutate({
                                          item_name: formData.get("item_name") as string,
                                          category: formData.get("category") as string,
                                          quantity: formData.get("quantity") as string,
                                          notes: formData.get("notes") as string,
                                        });
                                        (e.target as HTMLFormElement).reset();
                                      }}
                                      className="space-y-4"
                                    >
                                      <div>
                                        <Label htmlFor="item_name">Item Name</Label>
                                        <Input id="item_name" name="item_name" required />
                                      </div>
                                      <div>
                                        <Label htmlFor="category">Category</Label>
                                        <Select name="category">
                                          <SelectTrigger id="category">
                                            <SelectValue placeholder="Select category" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {ITEM_CATEGORIES.map((cat) => (
                                              <SelectItem key={cat} value={cat}>
                                                {cat}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label htmlFor="quantity">Quantity</Label>
                                        <Input id="quantity" name="quantity" placeholder="e.g., 10 bottles" />
                                      </div>
                                      <div>
                                        <Label htmlFor="item_notes">Notes</Label>
                                        <Textarea id="item_notes" name="notes" />
                                      </div>
                                      <Button type="submit" className="w-full">
                                        Add Item
                                      </Button>
                                    </form>
                                  </DialogContent>
                                </Dialog>
                              </div>
                              
                              {items && items.length > 0 ? (
                                <div className="space-y-1">
                                  {items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between p-2 rounded border text-sm"
                                    >
                                      <div>
                                        <span className="font-medium">{item.item_name}</span>
                                        {item.category && (
                                          <span className="text-xs text-muted-foreground ml-2">
                                            ({item.category})
                                          </span>
                                        )}
                                        {item.quantity && (
                                          <span className="text-xs ml-2">{item.quantity}</span>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          if (confirm("Delete this item?")) {
                                            deleteItemMutation.mutate(item.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                  No items yet
                                </p>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}

                  {selectedArea && equipment?.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No equipment yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
