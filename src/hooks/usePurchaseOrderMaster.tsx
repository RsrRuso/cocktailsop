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

export const usePurchaseOrderMaster = (workspaceId?: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch master items (personal + workspace)
  const { data: masterItems, isLoading: isLoadingMaster } = useQuery({
    queryKey: ['po-master-items', user?.id, workspaceId],
    queryFn: async () => {
      let query = supabase
        .from('purchase_order_master_items')
        .select('*')
        .order('item_name', { ascending: true });
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      } else {
        query = query.eq('user_id', user?.id).is('workspace_id', null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as MasterItem[];
    },
    enabled: !!user?.id
  });

  // Fetch received items (personal + workspace)
  const { data: receivedItems, isLoading: isLoadingReceived } = useQuery({
    queryKey: ['po-received-items', user?.id, workspaceId],
    queryFn: async () => {
      let query = supabase
        .from('purchase_order_received_items')
        .select('*')
        .order('received_date', { ascending: false });
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      } else {
        query = query.eq('user_id', user?.id).is('workspace_id', null);
      }
      
      const { data, error } = await query;
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
      
      // Check if item already exists (case-insensitive) - check by workspace for shared items
      let existingQuery = supabase
        .from('purchase_order_master_items')
        .select('id, item_name')
        .ilike('item_name', normalizedName);
      
      if (workspaceId) {
        // For workspace items, check by workspace_id (shared across all members)
        existingQuery = existingQuery.eq('workspace_id', workspaceId);
      } else {
        // For personal items, check by user_id
        existingQuery = existingQuery.eq('user_id', user?.id).is('workspace_id', null);
      }
      
      const { data: existing } = await existingQuery.maybeSingle();
      
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
          workspace_id: workspaceId || null,
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

  // Update master item
  const updateMasterItem = useMutation({
    mutationFn: async (item: {
      id: string;
      unit?: string | null;
      category?: string | null;
      last_price?: number | null;
    }) => {
      const { data, error } = await supabase
        .from('purchase_order_master_items')
        .update({
          unit: item.unit,
          category: item.category,
          last_price: item.last_price,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-master-items'] });
      toast.success("Item updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update: " + error.message);
    }
  });

  // Add received item - linked by record_id for proper isolation
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
      document_number?: string;
      record_id?: string;
    }) => {
      const receivedDate = item.received_date || new Date().toISOString().split('T')[0];
      
      // Always insert new item linked to its specific record
      const { data, error } = await supabase
        .from('purchase_order_received_items')
        .insert({
          user_id: user?.id,
          workspace_id: workspaceId || null,
          item_name: item.item_name.trim(),
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.total_price,
          purchase_order_id: item.purchase_order_id,
          document_number: item.document_number,
          record_id: item.record_id,
          received_date: receivedDate
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

      // Get master items to link (workspace-aware)
      let masterQuery = supabase
        .from('purchase_order_master_items')
        .select('id, item_name');
      
      if (workspaceId) {
        masterQuery = masterQuery.eq('workspace_id', workspaceId);
      } else {
        masterQuery = masterQuery.eq('user_id', user?.id).is('workspace_id', null);
      }
      
      const { data: masterData } = await masterQuery;

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

  // Check if a string looks like a numeric code (SKU/article number)
  const looksLikeCode = (name: string): boolean => {
    const trimmed = name.trim();
    // Pure numeric or starts with Z followed by numbers
    return /^\d+$/.test(trimmed) || /^[A-Z]\d{5,}$/i.test(trimmed);
  };

  // Sync all items from existing purchase orders (workspace-aware)
  const syncFromExistingOrders = async () => {
    try {
      // Get all purchase orders for user or workspace
      let ordersQuery = supabase
        .from('purchase_orders')
        .select('id');
      
      if (workspaceId) {
        ordersQuery = ordersQuery.eq('workspace_id', workspaceId);
      } else {
        ordersQuery = ordersQuery.eq('user_id', user?.id).is('workspace_id', null);
      }
      
      const { data: orders, error: ordersError } = await ordersQuery;
      
      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) {
        toast.info("No purchase orders found to sync");
        return;
      }

      // Get all items from all orders - include item_code for reference
      const { data: items, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select('*')
        .in('purchase_order_id', orders.map(o => o.id));
      
      if (itemsError) throw itemsError;
      if (!items || items.length === 0) {
        toast.info("No items found in purchase orders");
        return;
      }

      // Get existing master items to check for updates (workspace-aware)
      let existingMasterQuery = supabase
        .from('purchase_order_master_items')
        .select('id, item_name, unit, last_price');
      
      if (workspaceId) {
        existingMasterQuery = existingMasterQuery.eq('workspace_id', workspaceId);
      } else {
        existingMasterQuery = existingMasterQuery.eq('user_id', user?.id).is('workspace_id', null);
      }
      
      const { data: existingMaster } = await existingMasterQuery;

      // Also pull received items as a pricing source (uploads often create received rows)
      let receivedQuery = supabase
        .from('purchase_order_received_items')
        .select('item_name, unit, unit_price, total_price, quantity');

      if (workspaceId) {
        receivedQuery = receivedQuery.eq('workspace_id', workspaceId);
      } else {
        receivedQuery = receivedQuery.eq('user_id', user?.id).is('workspace_id', null);
      }

      const { data: receivedForPricing, error: receivedError } = await receivedQuery;
      if (receivedError) throw receivedError;
      
      // Build map of existing items (by name and by code)
      const existingByName = new Map<string, { id: string; item_name: string; unit: string | null; last_price: number | null }>();
      const existingByCode = new Map<string, { id: string; item_name: string; unit: string | null; last_price: number | null }>();
      
      for (const item of existingMaster || []) {
        const key = item.item_name.trim().toLowerCase();
        existingByName.set(key, item);
        // If the existing name looks like a code, track it separately
        if (looksLikeCode(item.item_name)) {
          existingByCode.set(key, item);
        }
      }

      const normalizeKey = (name: string) => name.trim().toLowerCase();

      const computeReceivedUnitPrice = (row: any): number => {
        const direct = Number(row.unit_price ?? 0);
        if (direct > 0) return direct;
        const qty = Number(row.quantity ?? 0);
        const total = Number(row.total_price ?? 0);
        if (qty > 0 && total > 0) return total / qty;
        return 0;
      };

      const considerPriceUpdate = (
        key: string,
        existingItem: { id: string; unit: string | null; last_price: number | null },
        price: number,
        unit?: string | null
      ) => {
        if (!price || price <= 0) return;

        const prev = priceUpdates.get(key);
        const existingUnitMissing = !existingItem.unit || existingItem.unit.trim() === '';
        const shouldUpdateUnit = !!unit && unit.trim() !== '' && existingUnitMissing;

        if (!prev || price > prev.price) {
          priceUpdates.set(key, {
            id: existingItem.id,
            price,
            unit: unit ?? undefined,
            updateUnit: shouldUpdateUnit,
          });
          return;
        }

        // Keep better unit if we don't have one yet and the master item is missing it
        if (shouldUpdateUnit && !prev.updateUnit) {
          priceUpdates.set(key, { ...prev, unit: unit ?? prev.unit, updateUnit: true });
        }
      };

      // Track best prices for existing items that need price updates
      const priceUpdates = new Map<string, { id: string; price: number; unit?: string; updateUnit: boolean }>();
      
      // Build unique items map from PO items - prefer actual names over codes
      const uniqueItems = new Map<string, any>();
      const itemsToUpdate: { id: string; newName: string; unit?: string; price?: number }[] = [];
      
      for (const item of items) {
        // Skip items that are just codes with no proper name
        if (!item.item_name || looksLikeCode(item.item_name)) continue;
        
        const nameKey = normalizeKey(item.item_name);
        const codeKey = item.item_code?.trim().toLowerCase();
        
        // Check if we have a master item with just the code that should be updated with the proper name
        if (codeKey && existingByCode.has(codeKey)) {
          const codeItem = existingByCode.get(codeKey)!;
          // The existing item is just a code, update it with the proper name
          itemsToUpdate.push({
            id: codeItem.id,
            newName: item.item_name.trim(),
            unit: item.unit,
            price: item.price_per_unit
          });
          // Remove from code map so we don't update it twice
          existingByCode.delete(codeKey);
          continue;
        }
        
        // If proper name already exists, track price updates
        if (existingByName.has(nameKey)) {
          const existingItem = existingByName.get(nameKey)!;
          considerPriceUpdate(nameKey, existingItem, Number(item.price_per_unit ?? 0), item.unit);
          continue;
        }
        
        if (!uniqueItems.has(nameKey)) {
          uniqueItems.set(nameKey, item);
        } else {
          // Keep highest price
          const existing = uniqueItems.get(nameKey);
          if (item.price_per_unit > existing.price_per_unit) {
            uniqueItems.set(nameKey, item);
          }
        }
      }

      // Also update prices/units from received items (covers uploads / invoices)
      for (const row of receivedForPricing || []) {
        if (!row.item_name || looksLikeCode(row.item_name)) continue;
        const key = normalizeKey(row.item_name);
        const existingItem = existingByName.get(key);
        if (!existingItem) continue;

        considerPriceUpdate(key, existingItem, computeReceivedUnitPrice(row), row.unit);
      }

      let updatedCount = 0;
      let addedCount = 0;
      let priceUpdateCount = 0;
      
      // Update existing code-only items with proper names
      for (const update of itemsToUpdate) {
        try {
          const updateData: any = {
            item_name: update.newName,
            updated_at: new Date().toISOString(),
          };
          if (update.unit && update.unit.trim() !== '') updateData.unit = update.unit;
          if (typeof update.price === 'number' && update.price > 0) updateData.last_price = update.price;

          await supabase
            .from('purchase_order_master_items')
            .update(updateData)
            .eq('id', update.id);
          updatedCount++;
        } catch (err) {
          console.log('Failed to update:', update.id);
        }
      }

      // Update prices for existing items that have prices in PO/received data
      for (const [, update] of priceUpdates) {
        try {
          const updateData: any = {
            last_price: update.price,
            updated_at: new Date().toISOString(),
          };
          if (update.updateUnit && update.unit) updateData.unit = update.unit;

          await supabase
            .from('purchase_order_master_items')
            .update(updateData)
            .eq('id', update.id);
          priceUpdateCount++;
        } catch (err) {
          console.log('Failed to update price:', update.id);
        }
      }

      // Insert new items
      for (const item of Array.from(uniqueItems.values())) {
        try {
          await addMasterItem.mutateAsync({
            item_name: item.item_name.trim(),
            unit: item.unit || undefined,
            last_price: item.price_per_unit || undefined
          });
          addedCount++;
        } catch (err) {
          console.log('Skipping duplicate:', item.item_name);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['po-master-items'] });
      
      const messages = [];
      if (updatedCount > 0) messages.push(`renamed ${updatedCount}`);
      if (priceUpdateCount > 0) messages.push(`updated ${priceUpdateCount} prices`);
      if (addedCount > 0) messages.push(`added ${addedCount} new`);
      
      if (messages.length > 0) {
        toast.success(`Synced: ${messages.join(', ')}`);
      } else {
        toast.info("All items already synced");
      }
    } catch (error: any) {
      toast.error("Failed to sync: " + error.message);
    }
  };

  // Import items from uploaded file (PDF, CSV, Excel)
  const importFromFile = async (file: File) => {
    try {
      toast.info("Processing file...");
      
      const reader = new FileReader();
      
      return new Promise<void>((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            let parsePayload: any = {};
            
            if (file.type === 'application/pdf') {
              // Convert PDF to base64
              const arrayBuffer = e.target?.result as ArrayBuffer;
              const bytes = new Uint8Array(arrayBuffer);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              parsePayload.pdfBase64 = btoa(binary);
            } else {
              // Text/CSV content
              parsePayload.content = e.target?.result as string;
            }
            
            // Call the parse function
            const { data, error } = await supabase.functions.invoke('parse-purchase-order', {
              body: parsePayload
            });
            
            if (error || !data?.success) {
              toast.error(error?.message || data?.error || "Failed to parse file");
              reject(new Error("Parse failed"));
              return;
            }
            
            const parsed = data.data;
            if (!parsed?.items || parsed.items.length === 0) {
              toast.error("No items found in file");
              reject(new Error("No items"));
              return;
            }
            
            // Get existing master items to avoid duplicates (workspace-aware)
            let existingMasterQuery = supabase
              .from('purchase_order_master_items')
              .select('item_name');
            
            if (workspaceId) {
              existingMasterQuery = existingMasterQuery.eq('workspace_id', workspaceId);
            } else {
              existingMasterQuery = existingMasterQuery.eq('user_id', user?.id).is('workspace_id', null);
            }
            
            const { data: existingMaster } = await existingMasterQuery;
            
            const existingNames = new Set(
              (existingMaster || []).map(i => i.item_name.trim().toLowerCase())
            );
            
            // Build unique items from parsed data
            const uniqueItems = new Map<string, any>();
            for (const item of parsed.items) {
              const key = item.item_name.trim().toLowerCase();
              if (existingNames.has(key)) continue;
              
              if (!uniqueItems.has(key)) {
                uniqueItems.set(key, item);
              } else {
                const existing = uniqueItems.get(key);
                if ((item.price_per_unit || 0) > (existing.price_per_unit || 0)) {
                  uniqueItems.set(key, item);
                }
              }
            }
            
            if (uniqueItems.size === 0) {
              toast.info("All items already exist in master list");
              resolve();
              return;
            }
            
            // Insert new items one by one to handle duplicates gracefully
            let addedCount = 0;
            for (const item of Array.from(uniqueItems.values())) {
              try {
                const derivedPrice =
                  item.price_per_unit ??
                  item.unit_price ??
                  (item.total_price && item.quantity ? item.total_price / item.quantity : undefined);

                await addMasterItem.mutateAsync({
                  item_name: item.item_name.trim(),
                  unit: item.unit || undefined,
                  last_price: derivedPrice || undefined
                });
                addedCount++;
              } catch (err) {
                // Skip duplicates silently
                console.log('Skipping duplicate:', item.item_name);
              }
            }
            
            queryClient.invalidateQueries({ queryKey: ['po-master-items'] });
            toast.success(`Added ${addedCount} unique items from file`);
            resolve();
          } catch (err: any) {
            toast.error("Failed to import: " + err.message);
            reject(err);
          }
        };
        
        reader.onerror = () => {
          toast.error("Failed to read file");
          reject(new Error("File read error"));
        };
        
        if (file.type === 'application/pdf') {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsText(file);
        }
      });
    } catch (error: any) {
      toast.error("Failed to import: " + error.message);
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
    updateMasterItem: updateMasterItem.mutateAsync,
    addReceivedItem: addReceivedItem.mutate,
    addItemsFromPurchaseOrder,
    syncFromExistingOrders,
    importFromFile,
    receivedTotals,
    receivedSummary: receivedSummary ? Object.values(receivedSummary) : []
  };
};
