import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ZoomableImage } from "@/components/ZoomableImage";
import { ArrowLeft, Package, Search, Filter, Image as ImageIcon, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const AllInventory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  const [inventory, setInventory] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchData();
      setupRealtime();
    }
  }, [user, currentWorkspace]);

  const setupRealtime = () => {
    const channel = supabase
      .channel('all-inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory'
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Build queries conditionally based on workspace
      let storesQuery = supabase
        .from('stores')
        .select('*')
        .eq('is_active', true);

      let inventoryQuery = supabase
        .from('inventory')
        .select(`
          *,
          items (
            id,
            name,
            barcode,
            brand,
            category,
            photo_url,
            color_code
          ),
          stores (
            id,
            name,
            area,
            store_type
          )
        `);

      if (currentWorkspace) {
        storesQuery = storesQuery.eq('workspace_id', currentWorkspace.id);
        inventoryQuery = inventoryQuery.eq('workspace_id', currentWorkspace.id);
      } else {
        storesQuery = storesQuery.eq('user_id', user?.id).is('workspace_id', null);
        inventoryQuery = inventoryQuery.eq('user_id', user?.id).is('workspace_id', null);
      }

      const { data: storesData } = await storesQuery.order('name');
      setStores(storesData || []);

      const { data: inventoryData, error } = await inventoryQuery.order('created_at', { ascending: false });

      if (error) throw error;
      setInventory(inventoryData || []);
    } catch (error: any) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(inv => {
    const matchesSearch = !searchQuery || 
      inv.items?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.items?.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.items?.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStore = selectedStore === "all" || inv.store_id === selectedStore;
    
    return matchesSearch && matchesStore;
  });

  // Group by item and aggregate quantities across stores
  const aggregatedInventory = filteredInventory.reduce((acc, inv) => {
    const itemId = inv.items?.id || inv.item_id;
    if (!itemId) return acc;

    if (!acc[itemId]) {
      acc[itemId] = {
        ...inv,
        totalQuantity: 0,
        storeQuantities: []
      };
    }

    acc[itemId].totalQuantity += Number(inv.quantity || 0);
    acc[itemId].storeQuantities.push({
      store: inv.stores,
      quantity: inv.quantity,
      photo_url: inv.photo_url
    });

    return acc;
  }, {} as any);

  const inventoryList = Object.values(aggregatedInventory);

  const generatePDF = async () => {
    if (inventoryList.length === 0) {
      toast.error("No inventory items to export");
      return;
    }

    try {
      toast.loading("Generating PDF with images...");
      const doc = new jsPDF();
      
      // Helper function to convert color codes to RGB
      const getColorRGB = (colorCode: string): [number, number, number] => {
        if (!colorCode || colorCode === '-') {
          return [156, 163, 175]; // Default gray
        }
        
        const code = colorCode.trim();
        
        // Handle hex color codes (e.g., #FF5733 or FF5733)
        if (code.match(/^#?[0-9A-Fa-f]{6}$/)) {
          const hex = code.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          return [r, g, b];
        }
        
        // Handle rgb(r, g, b) format
        const rgbMatch = code.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
        }
        
        // Fallback color name mapping for common names
        const colorMap: { [key: string]: [number, number, number] } = {
          'red': [220, 38, 38],
          'blue': [59, 130, 246],
          'green': [34, 197, 94],
          'yellow': [234, 179, 8],
          'orange': [249, 115, 22],
          'purple': [168, 85, 247],
          'pink': [236, 72, 153],
          'brown': [120, 53, 15],
          'black': [0, 0, 0],
          'white': [255, 255, 255],
          'gray': [156, 163, 175],
          'grey': [156, 163, 175],
          'clear': [229, 231, 235],
          'transparent': [229, 231, 235],
          'amber': [245, 158, 11],
          'gold': [234, 179, 8],
          'silver': [203, 213, 225],
        };
        
        const normalizedColor = code.toLowerCase();
        return colorMap[normalizedColor] || [156, 163, 175];
      };
      
      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("All Inventory Across Stores", 14, 20);
      
      // Summary
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Items: ${inventoryList.length}`, 14, 30);
      doc.text(`Total Stores: ${stores.length}`, 14, 36);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);
      
      let yPosition = 55;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const imageSize = 30; // Compact size
      const lineHeight = 4.5;
      
      // Process each item
      for (let i = 0; i < inventoryList.length; i++) {
        const item = inventoryList[i] as any;
        
        // Check if we need a new page (need space for image + text)
        if (yPosition > 265) {
          doc.addPage();
          yPosition = 20;
        }
        
        const itemName = item.items?.name || 'Unknown Item';
        const brand = item.items?.brand || '-';
        const category = item.items?.category || '-';
        const colorCode = item.items?.color_code || '-';
        const totalQty = item.totalQuantity.toString();
        const storeBreakdown = item.storeQuantities
          .map((sq: any) => `  • ${sq.store?.name || 'Unknown'}: ${sq.quantity}`)
          .join('\n');
        
        // Draw background box
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, yPosition - 1.5, pageWidth - (margin * 2), imageSize + 3, 'F');
        
        // Add image if available
        if (item.items?.photo_url) {
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = item.items.photo_url;
            });
            
            // Add image with border - use PNG for higher quality
            doc.setDrawColor(229, 231, 235);
            doc.setLineWidth(0.5);
            doc.rect(margin + 2, yPosition, imageSize, imageSize);
            
            // Create a canvas to draw high quality image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            const highQualityDataUrl = canvas.toDataURL('image/png', 1.0); // Maximum quality
            
            // Calculate aspect ratio to maintain original proportions
            const imgAspectRatio = img.width / img.height;
            let drawWidth = imageSize - 1;
            let drawHeight = imageSize - 1;
            
            if (imgAspectRatio > 1) {
              // Wider than tall
              drawHeight = drawWidth / imgAspectRatio;
            } else {
              // Taller than wide
              drawWidth = drawHeight * imgAspectRatio;
            }
            
            // Center the image in the box
            const xOffset = (imageSize - drawWidth) / 2;
            const yOffset = (imageSize - drawHeight) / 2;
            
            doc.addImage(highQualityDataUrl, 'PNG', margin + 2.5 + xOffset, yPosition + 0.5 + yOffset, drawWidth, drawHeight);
          } catch (error) {
            console.error('Failed to load image:', error);
            // Draw placeholder
            doc.setFillColor(229, 231, 235);
            doc.rect(margin + 2, yPosition, imageSize, imageSize, 'F');
          }
        } else {
          // Draw placeholder
          doc.setFillColor(229, 231, 235);
          doc.rect(margin + 2, yPosition, imageSize, imageSize, 'F');
        }
        
        // Add item details next to image
        const textX = margin + imageSize + 8;
        let textY = yPosition + 4;
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text(`${i + 1}. ${itemName}`, textX, textY);
        
        textY += lineHeight;
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(75, 85, 99);
        doc.text(`${brand} | ${category}`, textX, textY);
        
        textY += lineHeight;
        // Draw color ball
        const colorRGB = getColorRGB(colorCode);
        doc.setFillColor(colorRGB[0], colorRGB[1], colorRGB[2]);
        doc.circle(textX + 2, textY - 1, 2, 'F');
        
        // Add white border for visibility
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.2);
        doc.circle(textX + 2, textY - 1, 2, 'S');
        
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(75, 85, 99);
        doc.text(`Color: ${colorCode}`, textX + 6, textY);
        
        textY += lineHeight;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(59, 130, 246);
        doc.text(`Qty: ${totalQty}`, textX, textY);
        
        // Store breakdown below the main info
        yPosition += imageSize + 4;
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(107, 114, 128);
        const splitStores = doc.splitTextToSize(storeBreakdown, pageWidth - textX - margin);
        doc.text(splitStores, textX, yPosition);
        
        yPosition += (splitStores.length * 3) + 4;
        
        // Draw separator line
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.2);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 4;
      }
      
      // Save PDF
      doc.save(`all-inventory-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.dismiss();
      toast.success("PDF downloaded with images");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.dismiss();
      toast.error("Failed to generate PDF");
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/store-management')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Store Management
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Package className="h-6 w-6" />
                All Inventory Across Stores
              </CardTitle>
              <Button onClick={generatePDF} variant="default" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Total Items: {inventoryList.length}</span>
              <span>•</span>
              <span>Total Stores: {stores.length}</span>
            </div>
          </CardContent>
        </Card>

        {inventoryList.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No inventory items found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventoryList.map((item: any) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02]">
                {item?.items?.photo_url ? (
                  <ZoomableImage
                    src={item.items.photo_url}
                    alt={item.items.name || 'Item'}
                    containerClassName="h-48 w-full bg-muted/50 border-b-2 border-border/50"
                    className="w-full h-full p-2"
                    objectFit="contain"
                  />
                ) : (
                  <div className="h-48 w-full bg-muted/50 flex items-center justify-center border-b-2 border-border/50">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2">
                    {item.items?.name || 'Unknown Item'}
                  </h3>
                  {item.items?.brand && (
                    <p className="text-sm text-muted-foreground mb-1">
                      Brand: {item.items.brand}
                    </p>
                  )}
                  {item.items?.category && (
                    <p className="text-sm text-muted-foreground mb-2">
                      Category: {item.items.category}
                    </p>
                  )}
                  
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Quantity</span>
                      <Badge variant="default" className="text-base font-bold">
                        {item.totalQuantity}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">By Store:</p>
                      {item.storeQuantities.map((sq: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground truncate max-w-[150px]">
                            {sq.store?.name || 'Unknown Store'}
                          </span>
                          <Badge variant="outline">{sq.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default AllInventory;
