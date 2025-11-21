import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useInAppNotificationContext } from "@/contexts/InAppNotificationContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, ArrowRightLeft, Clock, User } from "lucide-react";
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
  const { showNotification } = useInAppNotificationContext();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      setupRealtime();
    }
  }, [user, currentWorkspace]);

  const setupRealtime = () => {
    const transferChannel = supabase
      .channel('transfers-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_transfers'
        },
        (payload) => {
          fetchTransactions();
          showNotification(
            '📦 New Transfer',
            'Inventory transfer initiated',
            'transaction',
            () => navigate('/inventory-transactions')
          );
        }
      )
      .subscribe();

    const inventoryChannel = supabase
      .channel('inventory-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory'
        },
        (payload) => {
          fetchTransactions();
          showNotification(
            '✅ New Receiving',
            'Inventory received successfully',
            'receiving',
            () => navigate('/inventory-transactions')
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transferChannel);
      supabase.removeChannel(inventoryChannel);
    };
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      const workspaceFilter = currentWorkspace 
        ? { workspace_id: currentWorkspace.id }
        : { user_id: user?.id, workspace_id: null };

      // Fetch transfers
      const { data: transfersData } = await supabase
        .from('inventory_transfers')
        .select(`
          *,
          from_store:stores!inventory_transfers_from_store_id_fkey(name),
          to_store:stores!inventory_transfers_to_store_id_fkey(name),
          inventory(items(name)),
          profiles!inventory_transfers_user_id_fkey(full_name, email)
        `)
        .match(workspaceFilter)
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch receivings
      const { data: receivingsData } = await supabase
        .from('inventory_receivings' as any)
        .select(`
          *,
          store:stores(name),
          item:items(name),
          profiles!inventory_receivings_user_id_fkey(full_name, email)
        `)
        .match(workspaceFilter)
        .order('created_at', { ascending: false })
        .limit(100);

      // Combine and format transactions
      const allTransactions: Transaction[] = [
        ...(transfersData || []).map((t: any) => ({
          id: t.id,
          type: 'transfer' as const,
          timestamp: t.transfer_date || t.created_at,
          user_email: t.profiles?.email || 'Unknown',
          user_name: t.profiles?.full_name,
          from_store: t.from_store?.name,
          to_store: t.to_store?.name,
          item_name: t.inventory?.items?.name || 'Unknown Item',
          quantity: Number(t.quantity),
          status: t.status
        })),
        ...(receivingsData || []).map((r: any) => ({
          id: r.id,
          type: 'receiving' as const,
          timestamp: r.received_date || r.created_at,
          user_email: r.profiles?.email || 'Unknown',
          user_name: r.profiles?.full_name,
          store: r.store?.name,
          item_name: r.item?.name || 'Unknown Item',
          quantity: Number(r.quantity),
          status: r.status
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setTransactions(allTransactions);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

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
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-semibold">
                              {transaction.user_name || transaction.user_email}
                            </p>
                            {transaction.user_name && (
                              <p className="text-xs text-muted-foreground">
                                {transaction.user_email}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className={getStatusColor(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm">
                            <span className="font-medium">{transaction.item_name}</span>
                            {' • '}
                            <span className="text-muted-foreground">Qty: {transaction.quantity}</span>
                          </p>
                          
                          {transaction.type === 'transfer' ? (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <ArrowRightLeft className="h-3 w-3" />
                              Transfer: {transaction.from_store} → {transaction.to_store}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Receiving at: {transaction.store}
                            </p>
                          )}
                          
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                            <Clock className="h-3 w-3" />
                            {new Date(transaction.timestamp).toLocaleString()}
                          </p>
                        </div>
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
