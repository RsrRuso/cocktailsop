import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MasterItem {
  id: string;
  user_id: string;
  item_name: string;
  unit: string | null;
  category: string | null;
  last_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReceivedItem {
  id: string;
  user_id: string;
  purchase_order_id: string | null;
  master_item_id: string | null;
  item_name: string;
  quantity: number;
  unit: string | null;
  unit_price: number | null;
  total_price: number | null;
  received_date: string;
  created_at: string;
}

export const usePurchaseOrderMaster = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch master items
  const { data: masterItems, isLoading: isLoadingMaster } = useQuery({
    queryKey: ['po-master-items', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_order_master_items')
        .select('*')
        .eq('user_id', user?.id)
        .order('item_name', { ascending: true });
      
      if (error) throw error;
      return data as MasterItem[];
    },
    enabled: !!user?.id
  });

  // Fetch received items
  const { data: receivedItems, isLoading: isLoadingReceived } = useQuery({
    queryKey: ['po-received-items', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_order_received_items')
        .select('*')
        .eq('user_id', user?.id)
        .order('received_date', { ascending: false });
      
      if (error) throw error;
      return data as ReceivedItem[];
    },
    enabled: !!user?.id
  });

  // Add master item (upsert - won't duplicate based on normalized name)
  const addMasterItem = useMutation({
    mutationFn: async (item: { item_name: string; unit?: string; category?: string; last_price?: number }) => {
      // Normalize item name - trim and consistent casing
      const normalizedName = item.item_name.trim();
      
      // Check if item already exists (case-insensitive)
      const { data: existing } = await supabase
        .from('purchase_order_master_items')
        .select('id, item_name')
        .eq('user_id', user?.id)
        .ilike('item_name', normalizedName)
        .maybeSingle();
      
      if (existing) {
        // Update existing item with latest price if provided
        if (item.last_price) {
          const { data, error } = await supabase
            .from('purchase_order_master_items')
            .update({ 
              last_price: item.last_price, 
              unit: item.unit || undefined,
              updated_at: new Date().toISOString() 
            })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          return data;
        }
        return existing;
      }
      
      // Insert new item
      const { data, error } = await supabase
        .from('purchase_order_master_items')
        .insert({
          user_id: user?.id,
          item_name: normalizedName,
          unit: item.unit,
          category: item.category,
          last_price: item.last_price
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-master-items'] });
    }
  });

  // Add received item
  const addReceivedItem = useMutation({
    mutationFn: async (item: {
      purchase_order_id?: string;
      master_item_id?: string;
      item_name: string;
      quantity: number;
      unit?: string;
      unit_price?: number;
      total_price?: number;
      received_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('purchase_order_received_items')
        .insert({
          user_id: user?.id,
          ...item,
          received_date: item.received_date || new Date().toISOString().split('T')[0]
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-received-items'] });
    }
  });

  // Bulk add items from purchase order
  const addItemsFromPurchaseOrder = async (
    purchaseOrderId: string,
    items: { item_name: string; quantity: number; unit?: string; unit_price?: number; total_price?: number }[]
  ) => {
    try {
      // First, add all unique items to master list
      for (const item of items) {
        await addMasterItem.mutateAsync({
          item_name: item.item_name,
          unit: item.unit,
          last_price: item.unit_price
        });
      }

      // Get master items to link
      const { data: masterData } = await supabase
        .from('purchase_order_master_items')
        .select('id, item_name')
        .eq('user_id', user?.id);

      const masterMap = new Map(masterData?.map(m => [m.item_name.toLowerCase(), m.id]) || []);

      // Add received items
      for (const item of items) {
        await addReceivedItem.mutateAsync({
          purchase_order_id: purchaseOrderId,
          master_item_id: masterMap.get(item.item_name.toLowerCase()),
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.total_price
        });
      }

      toast.success(`Added ${items.length} items to master list and received items`);
    } catch (error: any) {
      toast.error("Failed to add items: " + error.message);
      throw error;
    }
  };

  // Sync all items from existing purchase orders
  const syncFromExistingOrders = async () => {
    try {
      // Get all purchase orders for user
      const { data: orders, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('id')
        .eq('user_id', user?.id);
      
      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) {
        toast.info("No purchase orders found to sync");
        return;
      }

      // Get all items from all orders
      const { data: items, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select('*')
        .in('purchase_order_id', orders.map(o => o.id));
      
      if (itemsError) throw itemsError;
      if (!items || items.length === 0) {
        toast.info("No items found in purchase orders");
        return;
      }

      // Add each unique item to master list
      const uniqueItems = new Map<string, any>();
      for (const item of items) {
        const key = item.item_name.trim().toLowerCase();
        if (!uniqueItems.has(key)) {
          uniqueItems.set(key, item);
        } else {
          // Update with latest price if newer
          const existing = uniqueItems.get(key);
          if (item.price_per_unit > existing.price_per_unit) {
            uniqueItems.set(key, item);
          }
        }
      }

      let addedCount = 0;
      for (const item of uniqueItems.values()) {
        try {
          // Check if already exists
          const { data: existing } = await supabase
            .from('purchase_order_master_items')
            .select('id')
            .eq('user_id', user?.id)
            .ilike('item_name', item.item_name.trim())
            .maybeSingle();
          
          if (!existing) {
            await supabase
              .from('purchase_order_master_items')
              .insert({
                user_id: user?.id,
                item_name: item.item_name.trim(),
                unit: item.unit,
                last_price: item.price_per_unit
              });
            addedCount++;
          }
        } catch (e) {
          console.error('Failed to add item:', item.item_name, e);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['po-master-items'] });
      toast.success(`Synced ${addedCount} new items from ${orders.length} orders`);
    } catch (error: any) {
      toast.error("Failed to sync: " + error.message);
    }
  };

  // Calculate totals
  const receivedTotals = receivedItems?.reduce((acc, item) => ({
    totalQty: acc.totalQty + (item.quantity || 0),
    totalPrice: acc.totalPrice + (item.total_price || 0)
  }), { totalQty: 0, totalPrice: 0 }) || { totalQty: 0, totalPrice: 0 };

  // Group received items by item name for summary
  const receivedSummary = receivedItems?.reduce((acc, item) => {
    const key = item.item_name.toLowerCase();
    if (!acc[key]) {
      acc[key] = {
        item_name: item.item_name,
        total_qty: 0,
        total_price: 0,
        unit: item.unit,
        avg_price: 0,
        count: 0
      };
    }
    acc[key].total_qty += item.quantity || 0;
    acc[key].total_price += item.total_price || 0;
    acc[key].count += 1;
    acc[key].avg_price = acc[key].total_price / acc[key].total_qty;
    return acc;
  }, {} as Record<string, { item_name: string; total_qty: number; total_price: number; unit: string | null; avg_price: number; count: number }>);

  return {
    masterItems,
    receivedItems,
    isLoadingMaster,
    isLoadingReceived,
    addMasterItem: addMasterItem.mutate,
    addReceivedItem: addReceivedItem.mutate,
    addItemsFromPurchaseOrder,
    syncFromExistingOrders,
    receivedTotals,
    receivedSummary: receivedSummary ? Object.values(receivedSummary) : []
  };
};
