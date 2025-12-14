import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface InventoryResult {
  itemName: string;
  totalQuantity: number;
  locations: {
    storeName: string;
    storeId: string;
    quantity: number;
  }[];
  highestStockLocation: string;
  lastUpdated: string;
}

export interface LowStockItem {
  itemName: string;
  quantity: number;
  storeName: string;
  threshold?: number;
}

export function useMatrixInventory() {
  const { user } = useAuth();
  
  // Get item aliases for fuzzy matching
  const getItemAliases = useCallback(async () => {
    const { data } = await supabase
      .from('item_aliases')
      .select('item_name, alias, category')
      .or(`is_global.eq.true,user_id.eq.${user?.id}`);
    return data || [];
  }, [user?.id]);
  
  // Normalize item name using aliases
  const normalizeItemName = useCallback(async (input: string): Promise<string> => {
    const normalized = input.toLowerCase().trim();
    const aliases = await getItemAliases();
    
    // Check if input matches an alias
    for (const alias of aliases) {
      if (alias.alias.toLowerCase() === normalized) {
        return alias.item_name;
      }
    }
    
    // Check for partial matches
    for (const alias of aliases) {
      if (normalized.includes(alias.alias.toLowerCase())) {
        return alias.item_name;
      }
    }
    
    // Return original with title case
    return input.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, [getItemAliases]);
  
  // Check stock for a specific item across all stores
  const checkStock = useCallback(async (itemName: string): Promise<InventoryResult | null> => {
    if (!user) return null;
    
    const normalizedName = await normalizeItemName(itemName);
    
    // Query FIFO inventory system
    const { data: fifoData, error: fifoError } = await supabase
      .from('fifo_inventory')
      .select(`
        id,
        quantity,
        updated_at,
        fifo_items!inner (name),
        fifo_stores!inner (name, id)
      `)
      .eq('user_id', user.id)
      .ilike('fifo_items.name', `%${normalizedName}%`);
    
    if (fifoError) {
      console.error('FIFO query error:', fifoError);
    }
    
    // Also check workspace-based inventory
    const { data: workspaceData } = await supabase
      .from('fifo_inventory')
      .select(`
        id,
        quantity,
        updated_at,
        workspace_id,
        fifo_items!inner (name),
        fifo_stores!inner (name, id)
      `)
      .not('workspace_id', 'is', null)
      .ilike('fifo_items.name', `%${normalizedName}%`);
    
    // Combine and aggregate results
    const allData = [...(fifoData || []), ...(workspaceData || [])];
    
    if (!allData || allData.length === 0) {
      return null;
    }
    
    // Aggregate by store
    const storeMap = new Map<string, { name: string; id: string; quantity: number }>();
    let latestUpdate = '';
    
    for (const item of allData) {
      const storeId = (item.fifo_stores as any)?.id;
      const storeName = (item.fifo_stores as any)?.name || 'Unknown Store';
      
      if (!storeMap.has(storeId)) {
        storeMap.set(storeId, { name: storeName, id: storeId, quantity: 0 });
      }
      
      const store = storeMap.get(storeId)!;
      store.quantity += item.quantity || 0;
      
      if (!latestUpdate || item.updated_at > latestUpdate) {
        latestUpdate = item.updated_at;
      }
    }
    
    const locations = Array.from(storeMap.values());
    const totalQuantity = locations.reduce((sum, loc) => sum + loc.quantity, 0);
    const highestStock = locations.reduce((max, loc) => 
      loc.quantity > max.quantity ? loc : max, { name: '', id: '', quantity: 0 }
    );
    
    return {
      itemName: (allData[0].fifo_items as any)?.name || normalizedName,
      totalQuantity,
      locations: locations.map(l => ({
        storeName: l.name,
        storeId: l.id,
        quantity: l.quantity
      })),
      highestStockLocation: highestStock.name,
      lastUpdated: latestUpdate
    };
  }, [user, normalizeItemName]);
  
  // Get all low stock items
  const getLowStockItems = useCallback(async (threshold = 10): Promise<LowStockItem[]> => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('fifo_inventory')
      .select(`
        quantity,
        fifo_items!inner (name),
        fifo_stores!inner (name)
      `)
      .eq('user_id', user.id)
      .lt('quantity', threshold)
      .gt('quantity', 0);
    
    if (error) {
      console.error('Low stock query error:', error);
      return [];
    }
    
    return (data || []).map(item => ({
      itemName: (item.fifo_items as any)?.name || 'Unknown',
      quantity: item.quantity || 0,
      storeName: (item.fifo_stores as any)?.name || 'Unknown Store',
      threshold
    }));
  }, [user]);
  
  // Compare stock between stores
  const compareStores = useCallback(async (itemName?: string): Promise<any[]> => {
    if (!user) return [];
    
    let query = supabase
      .from('fifo_stores')
      .select(`
        id,
        name,
        fifo_inventory (
          quantity,
          fifo_items (name)
        )
      `)
      .eq('user_id', user.id);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Compare stores error:', error);
      return [];
    }
    
    return (data || []).map(store => {
      let totalItems = 0;
      let totalQuantity = 0;
      const inventory = (store.fifo_inventory as any[]) || [];
      
      for (const inv of inventory) {
        if (!itemName || (inv.fifo_items?.name || '').toLowerCase().includes(itemName.toLowerCase())) {
          totalItems++;
          totalQuantity += inv.quantity || 0;
        }
      }
      
      return {
        storeName: store.name,
        storeId: store.id,
        totalItems,
        totalQuantity
      };
    });
  }, [user]);
  
  // Get all inventory summary
  const getInventorySummary = useCallback(async (): Promise<any> => {
    if (!user) return null;
    
    const { data: stores } = await supabase
      .from('fifo_stores')
      .select('id, name')
      .eq('user_id', user.id);
    
    const { data: items } = await supabase
      .from('fifo_items')
      .select('id, name, category')
      .eq('user_id', user.id);
    
    const { data: inventory } = await supabase
      .from('fifo_inventory')
      .select('quantity')
      .eq('user_id', user.id);
    
    const totalQuantity = (inventory || []).reduce((sum, inv) => sum + (inv.quantity || 0), 0);
    
    return {
      totalStores: stores?.length || 0,
      totalItems: items?.length || 0,
      totalQuantity,
      storeNames: (stores || []).map(s => s.name)
    };
  }, [user]);
  
  return {
    checkStock,
    getLowStockItems,
    compareStores,
    getInventorySummary,
    normalizeItemName
  };
}
