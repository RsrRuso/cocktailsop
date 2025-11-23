import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, ArrowRightLeft, Clock, User, Package } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Transaction {
  id: string;
  type: 'transfer' | 'receiving';
  timestamp: string;
  user_email: string;
  user_name?: string;
  from_store?: string;
  to_store?: string;
  store?: string;
  item_name: string;
  quantity: number;
  status: string;
}

const InventoryTransactions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      // Build the query with proper null handling
      let query = supabase
        .from('inventory_transfers')
        .select(`
          *,
          from_store:stores!inventory_transfers_from_store_id_fkey(name),
          to_store:stores!inventory_transfers_to_store_id_fkey(name),
          inventory(items(name))
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply workspace filter
      if (currentWorkspace) {
        query = query.eq('workspace_id', currentWorkspace.id);
      } else {
        query = query.is('workspace_id', null);
      }

      const { data: transfersData, error: transferError } = await query;

      if (transferError) {
        console.error('[InventoryTransactions] Error fetching transfers:', transferError);
        throw transferError;
      }

      // Fetch user profiles separately
      const userIds = [...new Set(transfersData?.map((t: any) => t.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, username')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map((p: any) => [p.id, p]) || []);

      // Format transactions with all details from the query
      const allTransactions: Transaction[] = (transfersData || [])
        .map((t: any) => {
          const profile = profilesMap.get(t.user_id);
          
          return {
            id: t.id,
            type: 'transfer' as const,
            timestamp: t.transfer_date || t.created_at,
            user_email: profile?.email || user?.email || 'Unknown',
            user_name: profile?.full_name || profile?.username || null,
            from_store: t.from_store?.name || 'Unknown',
            to_store: t.to_store?.name || 'Unknown',
            item_name: t.inventory?.items?.name || 'Unknown Item',
            quantity: Number(t.quantity) || 0,
            status: t.status || 'completed',
          };
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      console.log('[InventoryTransactions] Loaded transactions:', allTransactions.length);
      setTransactions(allTransactions);
    } catch (error: any) {
      console.error('[InventoryTransactions] Error:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, currentWorkspace]);

  // Real-time subscription for inventory transfers
  useRealtimeSubscription({
    channel: 'inventory-transactions-transfers',
    table: 'inventory_transfers',
    event: '*',
    onUpdate: fetchTransactions,
    debounceMs: 500,
  });

  // Real-time subscription for inventory changes
  useRealtimeSubscription({
    channel: 'inventory-transactions-inventory',
    table: 'inventory',
    event: '*',
    onUpdate: fetchTransactions,
    debounceMs: 500,
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <p className="text-muted-foreground">Loading transactions...</p>
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
            <CardTitle className="text-2xl flex items-center gap-2">
              <ArrowRightLeft className="h-6 w-6" />
              Live Inventory Transactions
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Real-time tracking of all transfers and receivings
            </p>
          </CardHeader>
        </Card>

        {transactions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No transactions yet</p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <Card key={transaction.id} className="border-l-4 border-l-primary/50 hover:shadow-lg transition-all hover:border-l-primary">
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      {/* Header with User Info and Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border-2 border-primary/20">
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">
                              {transaction.user_name 
                                ? transaction.user_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                : transaction.user_email.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="space-y-1">
                            <p className="font-semibold text-base text-foreground">
                              {transaction.user_name || 'User'}
                            </p>
                            <p className="text-xs text-muted-foreground font-medium">
                              {transaction.user_email}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <Badge 
                            variant="outline" 
                            className={`${getStatusColor(transaction.status)} font-semibold px-3 py-1`}
                          >
                            {transaction.status.toUpperCase()}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {transaction.type === 'transfer' ? 'Transfer' : 'Receiving'}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Transaction Details */}
                      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                        {/* Item and Quantity */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground font-medium">Item</p>
                              <p className="font-semibold text-lg text-foreground">
                                {transaction.item_name === 'Multiple Items' ? 'Multiple Items' : transaction.item_name}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground font-medium">Quantity</p>
                            <p className="text-2xl font-extrabold text-primary leading-none">
                              {transaction.quantity}
                              <span className="ml-1 text-xs font-medium text-muted-foreground">units</span>
                            </p>
                          </div>
                        </div>
                        
                        {/* Store Transfer Information */}
                        {transaction.type === 'transfer' ? (
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground font-medium mb-1">From</p>
                              <div className="bg-background rounded px-3 py-2">
                                <p className="font-semibold text-sm">{transaction.from_store}</p>
                              </div>
                            </div>
                            
                            <ArrowRightLeft className="h-5 w-5 text-primary mt-5 flex-shrink-0" />
                            
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground font-medium mb-1">To</p>
                              <div className="bg-background rounded px-3 py-2">
                                <p className="font-semibold text-sm">{transaction.to_store}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground font-medium mb-1">Store</p>
                            <div className="bg-background rounded px-3 py-2">
                              <p className="font-semibold text-sm">{transaction.store}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Timestamp */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">
                          {new Date(transaction.timestamp).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default InventoryTransactions;
