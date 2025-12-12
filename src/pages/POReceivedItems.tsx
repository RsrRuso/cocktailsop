import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchaseOrderMaster } from "@/hooks/usePurchaseOrderMaster";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, DollarSign, Search, TrendingUp } from "lucide-react";
import { useState } from "react";

const POReceivedItems = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { receivedItems, receivedSummary, receivedTotals, isLoadingReceived } = usePurchaseOrderMaster();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'all' | 'summary'>('summary');

  if (!user) {
    navigate('/auth');
    return null;
  }

  const filteredItems = viewMode === 'summary' 
    ? receivedSummary.filter(item => 
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : receivedItems?.filter(item =>
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Received Items</h1>
              <p className="text-sm text-muted-foreground">Overall received inventory</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Totals Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Quantity</p>
                <p className="text-2xl font-bold">{receivedTotals.totalQty.toFixed(2)}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">${receivedTotals.totalPrice.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <Button 
            variant={viewMode === 'summary' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('summary')}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Summary
          </Button>
          <Button 
            variant={viewMode === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('all')}
          >
            <Package className="h-4 w-4 mr-2" />
            All Items
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Items Table */}
        <Card>
          {isLoadingReceived ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : viewMode === 'summary' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead className="text-right">Avg Price</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems?.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.item_name}
                      {item.unit && <Badge variant="outline" className="ml-2 text-xs">{item.unit}</Badge>}
                    </TableCell>
                    <TableCell className="text-right">{item.total_qty.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${item.avg_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">${item.total_price.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {(!filteredItems || filteredItems.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No received items yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.item_name}
                      {item.unit && <Badge variant="outline" className="ml-2 text-xs">{item.unit}</Badge>}
                    </TableCell>
                    <TableCell>{new Date(item.received_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">${item.unit_price?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell className="text-right font-semibold">${item.total_price?.toFixed(2) || '0.00'}</TableCell>
                  </TableRow>
                ))}
                {(!filteredItems || filteredItems.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No received items yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
};

export default POReceivedItems;
