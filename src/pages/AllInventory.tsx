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
            photo_url
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
    try {
      const doc = new jsPDF('landscape'); // Use landscape for side-by-side tables
      let yPosition = 20;
      
      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("All Inventory Across Stores", 14, yPosition);
      yPosition += 10;
      
      // Summary
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPosition);
      yPosition += 10;
      
      // Helper function to load image as base64
      const loadImageAsBase64 = (url: string): Promise<string> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.onerror = () => resolve('');
          img.src = url;
        });
      };
      
      // Group inventory by store
      const inventoryByStore: Record<string, any[]> = {};
      filteredInventory.forEach(inv => {
        const storeId = inv.store_id;
        const storeName = inv.stores?.name || 'Unknown Store';
        if (!inventoryByStore[storeId]) {
          inventoryByStore[storeId] = [];
        }
        inventoryByStore[storeId].push({
          ...inv,
          storeName
        });
      });
      
      // Find Attiko and Jerry stores
      const attikoStore = Object.entries(inventoryByStore).find(([_, items]) => 
        items[0]?.storeName?.toLowerCase().includes('attiko')
      );
      const jerryStore = Object.entries(inventoryByStore).find(([_, items]) => 
        items[0]?.storeName?.toLowerCase().includes('jerry')
      );
      
      // Prepare data for both stores
      const prepareStoreData = async (storeItems: any[]) => {
        return await Promise.all(
          storeItems.map(async (item: any) => {
            let imageData = '';
            if (item.items?.photo_url) {
              imageData = await loadImageAsBase64(item.items.photo_url);
            }
            
            return {
              image: imageData,
              name: item.items?.name || 'Unknown Item',
              brand: item.items?.brand || '-',
              category: item.items?.category || '-',
              quantity: item.quantity?.toString() || '0'
            };
          })
        );
      };
      
      // Generate Attiko table on the left
      if (attikoStore) {
        const [_, attikoItems] = attikoStore;
        const storeName = attikoItems[0]?.storeName || 'Attiko';
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(storeName, 14, yPosition);
        
        const attikoData = await prepareStoreData(attikoItems);
        
        autoTable(doc, {
          startY: yPosition + 5,
          head: [['Img', 'Item', 'Brand', 'Category', 'Qty']],
          body: attikoData.map(row => [
            row.image ? 'IMG' : '-',
            row.name,
            row.brand,
            row.category,
            row.quantity
          ]),
          didDrawCell: (data: any) => {
            if (data.column.index === 0 && data.cell.section === 'body') {
              const rowData = attikoData[data.row.index];
              if (rowData.image) {
                try {
                  doc.addImage(
                    rowData.image,
                    'JPEG',
                    data.cell.x + 1,
                    data.cell.y + 1,
                    8,
                    8
                  );
                } catch (e) {
                  console.error('Error adding image:', e);
                }
              }
            }
          },
          margin: { left: 14 },
          tableWidth: 125,
          theme: 'striped',
          headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold', fontSize: 9 },
          styles: { fontSize: 8, cellPadding: 1.5, minCellHeight: 10 },
          columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 45 },
            2: { cellWidth: 25 },
            3: { cellWidth: 28 },
            4: { cellWidth: 15 }
          }
        });
      }
      
      // Generate Jerry table on the right
      if (jerryStore) {
        const [_, jerryItems] = jerryStore;
        const storeName = jerryItems[0]?.storeName || 'Jerry';
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(storeName, 155, yPosition);
        
        const jerryData = await prepareStoreData(jerryItems);
        
        autoTable(doc, {
          startY: yPosition + 5,
          head: [['Img', 'Item', 'Brand', 'Category', 'Qty']],
          body: jerryData.map(row => [
            row.image ? 'IMG' : '-',
            row.name,
            row.brand,
            row.category,
            row.quantity
          ]),
          didDrawCell: (data: any) => {
            if (data.column.index === 0 && data.cell.section === 'body') {
              const rowData = jerryData[data.row.index];
              if (rowData.image) {
                try {
                  doc.addImage(
                    rowData.image,
                    'JPEG',
                    data.cell.x + 1,
                    data.cell.y + 1,
                    8,
                    8
                  );
                } catch (e) {
                  console.error('Error adding image:', e);
                }
              }
            }
          },
          margin: { left: 155 },
          tableWidth: 125,
          theme: 'striped',
          headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold', fontSize: 9 },
          styles: { fontSize: 8, cellPadding: 1.5, minCellHeight: 10 },
          columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 45 },
            2: { cellWidth: 25 },
            3: { cellWidth: 28 },
            4: { cellWidth: 15 }
          }
        });
      }
      
      // Calculate position for total table (below both store tables)
      const maxTableHeight = Math.max(
        attikoStore ? (doc as any).lastAutoTable?.finalY || 0 : 0,
        jerryStore ? (doc as any).lastAutoTable?.finalY || 0 : 0
      );
      yPosition = maxTableHeight + 15;
      
      // Check if we need a new page for the total
      if (yPosition > 180) {
        doc.addPage('landscape');
        yPosition = 20;
      }
      
      // Generate Total table
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Total (Combined Inventory)", 14, yPosition);
      yPosition += 5;
      
      // Aggregate items from both stores
      const totalInventoryMap = new Map();
      filteredInventory.forEach(inv => {
        const itemId = inv.items?.id || inv.item_id;
        if (!itemId) return;
        
        if (totalInventoryMap.has(itemId)) {
          const existing = totalInventoryMap.get(itemId);
          existing.quantity += Number(inv.quantity || 0);
        } else {
          totalInventoryMap.set(itemId, {
            name: inv.items?.name || 'Unknown Item',
            brand: inv.items?.brand || '-',
            category: inv.items?.category || '-',
            quantity: Number(inv.quantity || 0),
            photo_url: inv.items?.photo_url
          });
        }
      });
      
      const totalData = await Promise.all(
        Array.from(totalInventoryMap.values()).map(async (item: any) => {
          let imageData = '';
          if (item.photo_url) {
            imageData = await loadImageAsBase64(item.photo_url);
          }
          
          return {
            image: imageData,
            name: item.name,
            brand: item.brand,
            category: item.category,
            quantity: item.quantity.toString()
          };
        })
      );
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Image', 'Item Name', 'Brand', 'Category', 'Total Quantity']],
        body: totalData.map(row => [
          row.image ? 'IMG' : '-',
          row.name,
          row.brand,
          row.category,
          row.quantity
        ]),
        didDrawCell: (data: any) => {
          if (data.column.index === 0 && data.cell.section === 'body') {
            const rowData = totalData[data.row.index];
            if (rowData.image) {
              try {
                doc.addImage(
                  rowData.image,
                  'JPEG',
                  data.cell.x + 2,
                  data.cell.y + 2,
                  10,
                  10
                );
              } catch (e) {
                console.error('Error adding image:', e);
              }
            }
          }
        },
        theme: 'grid',
        headStyles: { fillColor: [52, 152, 219], fontStyle: 'bold', fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 2.5, minCellHeight: 14 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 90 },
          2: { cellWidth: 60 },
          3: { cellWidth: 60 },
          4: { cellWidth: 30 }
        }
      });
      
      // Grand total
      const grandTotal = Array.from(totalInventoryMap.values()).reduce((sum, item: any) => sum + item.quantity, 0);
      yPosition = (doc as any).lastAutoTable.finalY + 10;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Grand Total Quantity: ${grandTotal}`, 14, yPosition);
      doc.text(`Total Unique Items: ${totalInventoryMap.size}`, 14, yPosition + 7);
      
      // Save PDF
      doc.save(`all-inventory-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error('Error generating PDF:', error);
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
