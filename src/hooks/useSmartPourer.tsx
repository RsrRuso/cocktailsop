import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ================================================================
// TYPES
// ================================================================

export interface SmartPourerDevice {
  id: string;
  device_code: string;
  firmware_version: string | null;
  battery_level: number;
  status: string;
  last_sync_at: string | null;
  outlet_id: string | null;
  created_at: string;
}

export interface SmartPourerSku {
  id: string;
  sku_code: string;
  name: string;
  spirit_type: string;
  brand: string | null;
  cost_per_ml: number | null;
  default_bottle_size_ml: number;
  outlet_id: string | null;
  is_active: boolean;
}

export interface SmartPourerBottle {
  id: string;
  sku_id: string;
  bottle_size_ml: number;
  qr_or_nfc_code: string | null;
  outlet_id: string;
  status: string;
  current_level_ml: number;
  opened_at: string | null;
  sku?: SmartPourerSku;
}

export interface DevicePairing {
  id: string;
  device_id: string;
  bottle_id: string;
  paired_by_user: string | null;
  paired_at: string;
  unpaired_at: string | null;
  manager_override: boolean;
  is_active: boolean;
  device?: SmartPourerDevice;
  bottle?: SmartPourerBottle;
}

export interface PourEvent {
  id: string;
  device_id: string;
  bottle_id: string | null;
  sku_id: string | null;
  poured_ml: number;
  pulse_count: number | null;
  started_at: string;
  ended_at: string | null;
  battery: number | null;
  error_flag: boolean;
  error_message: string | null;
  outlet_id: string | null;
  synced_from_offline: boolean;
}

export interface SmartPourerRecipe {
  id: string;
  cocktail_name: string;
  outlet_id: string;
  version: number;
  is_active: boolean;
  description: string | null;
  category: string | null;
  selling_price: number | null;
  items?: SmartPourerRecipeItem[];
}

export interface SmartPourerRecipeItem {
  id: string;
  recipe_id: string;
  sku_id: string;
  ml_required: number;
  is_optional: boolean;
  sku?: SmartPourerSku;
}

export interface VarianceLog {
  id: string;
  sku_id: string | null;
  outlet_id: string;
  variance_date: string;
  measured_ml: number;
  expected_ml: number;
  variance_ml: number;
  variance_cost: number | null;
  variance_type: string;
  reason: string | null;
  reason_notes: string | null;
  manager_id: string | null;
  acknowledged_at: string | null;
}

export interface ShiftSession {
  id: string;
  outlet_id: string;
  shift_date: string;
  shift_type: string;
  opened_at: string;
  opened_by: string | null;
  closed_at: string | null;
  closed_by: string | null;
  status: string;
  variance_reviewed: boolean;
}

// ================================================================
// BLE HUB LOGIC - Pour Data Ingestion
// ================================================================

interface BLEHubOptions {
  outletId: string;
  onPourEvent?: (event: PourEvent) => void;
}

// Offline queue for pour events when disconnected
const offlineQueue: any[] = [];

export function useSmartPourerBLEHub({ outletId, onPourEvent }: BLEHubOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState<Map<string, any>>(new Map());
  const [isScanning, setIsScanning] = useState(false);

  // Sync offline queue when back online
  useEffect(() => {
    const syncOfflineQueue = async () => {
      if (navigator.onLine && offlineQueue.length > 0) {
        console.log(`[BLE Hub] Syncing ${offlineQueue.length} offline events`);
        
        for (const event of [...offlineQueue]) {
          try {
            await supabase.from('smart_pourer_pour_events').insert({
              ...event,
              synced_from_offline: true,
            });
            offlineQueue.shift();
          } catch (error) {
            console.error('[BLE Hub] Failed to sync event:', error);
            break;
          }
        }
      }
    };

    window.addEventListener('online', syncOfflineQueue);
    return () => window.removeEventListener('online', syncOfflineQueue);
  }, []);

  // Validate device exists and has active pairing
  const validateDevice = useCallback(async (deviceCode: string): Promise<{ valid: boolean; deviceId?: string; error?: string }> => {
    const { data: device, error } = await supabase
      .from('smart_pourer_devices')
      .select('id, status')
      .eq('device_code', deviceCode)
      .eq('outlet_id', outletId)
      .single();

    if (error || !device) {
      return { valid: false, error: 'Device not registered' };
    }

    if (device.status !== 'active') {
      return { valid: false, error: `Device is ${device.status}` };
    }

    // Check for active pairing
    const { data: pairing } = await supabase
      .from('smart_pourer_device_pairings')
      .select('id')
      .eq('device_id', device.id)
      .eq('is_active', true)
      .is('unpaired_at', null)
      .single();

    if (!pairing) {
      return { valid: false, error: 'No active bottle pairing' };
    }

    return { valid: true, deviceId: device.id };
  }, [outletId]);

  // Process incoming pour data from BLE device
  const processPourData = useCallback(async (deviceCode: string, pourData: {
    poured_ml: number;
    pulse_count?: number;
    battery?: number;
    started_at?: string;
    ended_at?: string;
    raw_payload?: any;
  }) => {
    const validation = await validateDevice(deviceCode);
    
    const pourEvent: any = {
      device_id: validation.deviceId,
      poured_ml: pourData.poured_ml,
      pulse_count: pourData.pulse_count,
      battery: pourData.battery,
      started_at: pourData.started_at || new Date().toISOString(),
      ended_at: pourData.ended_at,
      outlet_id: outletId,
      raw_payload: pourData.raw_payload,
      error_flag: !validation.valid,
      error_message: validation.error || null,
    };

    // Store locally if offline
    if (!navigator.onLine) {
      offlineQueue.push(pourEvent);
      console.log('[BLE Hub] Queued pour event for offline sync');
      return;
    }

    // Insert to database
    const { data, error } = await supabase
      .from('smart_pourer_pour_events')
      .insert(pourEvent)
      .select()
      .single();

    if (error) {
      console.error('[BLE Hub] Failed to store pour event:', error);
      offlineQueue.push(pourEvent);
    } else if (onPourEvent && data) {
      onPourEvent(data as PourEvent);
    }
  }, [outletId, validateDevice, onPourEvent]);

  // Scan for BLE devices
  const scanForDevices = useCallback(async () => {
    const bluetooth = (navigator as any).bluetooth;
    if (!bluetooth) {
      toast.error('Bluetooth not supported');
      return;
    }

    setIsScanning(true);
    try {
      const device = await bluetooth.requestDevice({
        filters: [
          { namePrefix: 'SP-' }, // Smart Pourer prefix
          { services: ['0000180f-0000-1000-8000-00805f9b34fb'] }, // Battery service
        ],
        optionalServices: [
          '0000180f-0000-1000-8000-00805f9b34fb', // Battery
          '00001234-0000-1000-8000-00805f9b34fb', // Custom pour service
        ],
      });

      if (device) {
        await connectToDevice(device);
      }
    } catch (error: any) {
      if (error.name !== 'NotFoundError') {
        console.error('[BLE Hub] Scan error:', error);
        toast.error('Failed to scan for devices');
      }
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Connect to a BLE device
  const connectToDevice = useCallback(async (device: any) => {
    try {
      const server = await device.gatt?.connect();
      if (!server) throw new Error('Failed to connect');

      // Update device status in database
      await supabase
        .from('smart_pourer_devices')
        .update({ 
          status: 'active',
          last_sync_at: new Date().toISOString(),
        })
        .eq('device_code', device.name || device.id);

      setConnectedDevices(prev => new Map(prev).set(device.id, device));
      setIsConnected(true);

      // Listen for disconnection
      device.addEventListener('gattserverdisconnected', () => {
        setConnectedDevices(prev => {
          const next = new Map(prev);
          next.delete(device.id);
          return next;
        });
        if (connectedDevices.size === 1) {
          setIsConnected(false);
        }
      });

      console.log('[BLE Hub] Connected to device:', device.name);
      toast.success(`Connected to ${device.name || 'Smart Pourer'}`);

    } catch (error) {
      console.error('[BLE Hub] Connection error:', error);
      toast.error('Failed to connect to device');
    }
  }, [connectedDevices.size]);

  // Disconnect from a device
  const disconnectDevice = useCallback(async (deviceId: string) => {
    const device = connectedDevices.get(deviceId);
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }
    setConnectedDevices(prev => {
      const next = new Map(prev);
      next.delete(deviceId);
      return next;
    });
  }, [connectedDevices]);

  return {
    isConnected,
    isScanning,
    connectedDevices: Array.from(connectedDevices.values()),
    offlineQueueLength: offlineQueue.length,
    scanForDevices,
    connectToDevice,
    disconnectDevice,
    processPourData,
    validateDevice,
  };
}

// ================================================================
// DEVICE MANAGEMENT HOOK
// ================================================================

export function useSmartPourerDevices(outletId: string | undefined) {
  const [devices, setDevices] = useState<SmartPourerDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchDevices = useCallback(async () => {
    if (!outletId) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('smart_pourer_devices')
      .select('*')
      .eq('outlet_id', outletId)
      .order('device_code');

    if (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load devices');
    } else {
      setDevices((data || []) as SmartPourerDevice[]);
    }
    setIsLoading(false);
  }, [outletId]);

  useEffect(() => {
    fetchDevices();

    // Real-time subscription
    const channel = supabase
      .channel('smart-pourer-devices')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'smart_pourer_devices',
        filter: `outlet_id=eq.${outletId}`,
      }, () => fetchDevices())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [outletId, fetchDevices]);

  const addDevice = useCallback(async (deviceCode: string, firmwareVersion?: string) => {
    if (!outletId || !user) return null;

    const { data, error } = await supabase
      .from('smart_pourer_devices')
      .insert({
        device_code: deviceCode,
        firmware_version: firmwareVersion,
        outlet_id: outletId,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add device');
      return null;
    }

    toast.success('Device registered');
    return data;
  }, [outletId, user]);

  const updateDeviceStatus = useCallback(async (deviceId: string, status: string) => {
    const { error } = await supabase
      .from('smart_pourer_devices')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', deviceId);

    if (error) {
      toast.error('Failed to update device');
      return false;
    }

    toast.success('Device updated');
    return true;
  }, []);

  return {
    devices,
    isLoading,
    fetchDevices,
    addDevice,
    updateDeviceStatus,
  };
}

// ================================================================
// SKU MANAGEMENT HOOK
// ================================================================

export function useSmartPourerSkus(outletId: string | undefined) {
  const [skus, setSkus] = useState<SmartPourerSku[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchSkus = useCallback(async () => {
    if (!outletId) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('smart_pourer_skus')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching SKUs:', error);
    } else {
      setSkus((data || []) as SmartPourerSku[]);
    }
    setIsLoading(false);
  }, [outletId]);

  useEffect(() => {
    fetchSkus();
  }, [outletId, fetchSkus]);

  const addSku = useCallback(async (sku: {
    sku_code: string;
    name: string;
    spirit_type: string;
    brand?: string;
    cost_per_ml?: number;
    default_bottle_size_ml?: number;
  }) => {
    if (!outletId || !user) return null;

    const { data, error } = await supabase
      .from('smart_pourer_skus')
      .insert({
        ...sku,
        outlet_id: outletId,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add SKU');
      return null;
    }

    toast.success('SKU added');
    await fetchSkus();
    return data;
  }, [outletId, user, fetchSkus]);

  return { skus, isLoading, fetchSkus, addSku };
}

// ================================================================
// BOTTLE MANAGEMENT HOOK
// ================================================================

export function useSmartPourerBottles(outletId: string | undefined) {
  const [bottles, setBottles] = useState<SmartPourerBottle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchBottles = useCallback(async () => {
    if (!outletId) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('smart_pourer_bottles')
      .select(`
        *,
        sku:smart_pourer_skus(*)
      `)
      .eq('outlet_id', outletId)
      .neq('status', 'removed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bottles:', error);
    } else {
      setBottles((data || []) as SmartPourerBottle[]);
    }
    setIsLoading(false);
  }, [outletId]);

  useEffect(() => {
    fetchBottles();
  }, [outletId, fetchBottles]);

  const addBottle = useCallback(async (bottle: {
    sku_id: string;
    bottle_size_ml: number;
    qr_or_nfc_code?: string;
  }) => {
    if (!outletId || !user) return null;

    const { data, error } = await supabase
      .from('smart_pourer_bottles')
      .insert({
        ...bottle,
        outlet_id: outletId,
        user_id: user.id,
        current_level_ml: bottle.bottle_size_ml,
        opened_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add bottle');
      return null;
    }

    toast.success('Bottle registered');
    await fetchBottles();
    return data;
  }, [outletId, user, fetchBottles]);

  const updateBottleStatus = useCallback(async (bottleId: string, status: string) => {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === 'empty') {
      updates.emptied_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('smart_pourer_bottles')
      .update(updates)
      .eq('id', bottleId);

    if (error) {
      toast.error('Failed to update bottle');
      return false;
    }

    await fetchBottles();
    return true;
  }, [fetchBottles]);

  return { bottles, isLoading, fetchBottles, addBottle, updateBottleStatus };
}

// ================================================================
// DEVICE PAIRING HOOK
// ================================================================

export function useDevicePairings(outletId: string | undefined) {
  const [pairings, setPairings] = useState<DevicePairing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchPairings = useCallback(async () => {
    if (!outletId) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('smart_pourer_device_pairings')
      .select(`
        *,
        device:smart_pourer_devices(*),
        bottle:smart_pourer_bottles(*, sku:smart_pourer_skus(*))
      `)
      .eq('is_active', true)
      .is('unpaired_at', null);

    if (error) {
      console.error('Error fetching pairings:', error);
    } else {
      setPairings((data || []) as DevicePairing[]);
    }
    setIsLoading(false);
  }, [outletId]);

  useEffect(() => {
    fetchPairings();

    // Real-time subscription
    const channel = supabase
      .channel('smart-pourer-pairings')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'smart_pourer_device_pairings',
      }, () => fetchPairings())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [outletId, fetchPairings]);

  const createPairing = useCallback(async (deviceId: string, bottleId: string) => {
    if (!user) return null;

    // First, deactivate any existing pairing for this device
    await supabase
      .from('smart_pourer_device_pairings')
      .update({ is_active: false, unpaired_at: new Date().toISOString() })
      .eq('device_id', deviceId)
      .eq('is_active', true);

    const { data, error } = await supabase
      .from('smart_pourer_device_pairings')
      .insert({
        device_id: deviceId,
        bottle_id: bottleId,
        paired_by_user: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create pairing');
      return null;
    }

    toast.success('Device paired with bottle');
    await fetchPairings();
    return data;
  }, [user, fetchPairings]);

  const unpairDevice = useCallback(async (pairingId: string, managerOverride = false) => {
    const { error } = await supabase
      .from('smart_pourer_device_pairings')
      .update({
        is_active: false,
        unpaired_at: new Date().toISOString(),
        manager_override: managerOverride,
      })
      .eq('id', pairingId);

    if (error) {
      toast.error('Failed to unpair device');
      return false;
    }

    toast.success('Device unpaired');
    await fetchPairings();
    return true;
  }, [fetchPairings]);

  return { pairings, isLoading, fetchPairings, createPairing, unpairDevice };
}

// ================================================================
// POUR EVENTS HOOK
// ================================================================

export function usePourEvents(outletId: string | undefined) {
  const [pourEvents, setPourEvents] = useState<PourEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayStats, setTodayStats] = useState({
    totalPours: 0,
    totalMl: 0,
    errorCount: 0,
  });

  const fetchPourEvents = useCallback(async (date?: Date) => {
    if (!outletId) return;
    
    setIsLoading(true);
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('smart_pourer_pour_events')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('started_at', startOfDay.toISOString())
      .lte('started_at', endOfDay.toISOString())
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching pour events:', error);
    } else {
      setPourEvents((data || []) as PourEvent[]);
      
      // Calculate stats
      const stats = (data || []).reduce((acc, event) => ({
        totalPours: acc.totalPours + 1,
        totalMl: acc.totalMl + (event.poured_ml || 0),
        errorCount: acc.errorCount + (event.error_flag ? 1 : 0),
      }), { totalPours: 0, totalMl: 0, errorCount: 0 });
      
      setTodayStats(stats);
    }
    setIsLoading(false);
  }, [outletId]);

  useEffect(() => {
    fetchPourEvents();

    // Real-time subscription for new pours
    const channel = supabase
      .channel('smart-pourer-events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'smart_pourer_pour_events',
        filter: `outlet_id=eq.${outletId}`,
      }, () => fetchPourEvents())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [outletId, fetchPourEvents]);

  return { pourEvents, isLoading, todayStats, fetchPourEvents };
}

// ================================================================
// RECIPE MANAGEMENT HOOK
// ================================================================

export function useSmartPourerRecipes(outletId: string | undefined) {
  const [recipes, setRecipes] = useState<SmartPourerRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchRecipes = useCallback(async () => {
    if (!outletId) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('smart_pourer_recipes')
      .select(`
        *,
        items:smart_pourer_recipe_items(*, sku:smart_pourer_skus(*))
      `)
      .eq('outlet_id', outletId)
      .eq('is_active', true)
      .order('cocktail_name');

    if (error) {
      console.error('Error fetching recipes:', error);
    } else {
      setRecipes((data || []) as SmartPourerRecipe[]);
    }
    setIsLoading(false);
  }, [outletId]);

  useEffect(() => {
    fetchRecipes();
  }, [outletId, fetchRecipes]);

  const addRecipe = useCallback(async (recipe: {
    cocktail_name: string;
    description?: string;
    category?: string;
    selling_price?: number;
    items: { sku_id: string; ml_required: number; is_optional?: boolean }[];
  }) => {
    if (!outletId || !user) return null;

    // Insert recipe
    const { data: recipeData, error: recipeError } = await supabase
      .from('smart_pourer_recipes')
      .insert({
        cocktail_name: recipe.cocktail_name,
        description: recipe.description,
        category: recipe.category,
        selling_price: recipe.selling_price,
        outlet_id: outletId,
        user_id: user.id,
      })
      .select()
      .single();

    if (recipeError || !recipeData) {
      toast.error('Failed to create recipe');
      return null;
    }

    // Insert recipe items
    const itemsToInsert = recipe.items.map(item => ({
      recipe_id: recipeData.id,
      sku_id: item.sku_id,
      ml_required: item.ml_required,
      is_optional: item.is_optional || false,
    }));

    const { error: itemsError } = await supabase
      .from('smart_pourer_recipe_items')
      .insert(itemsToInsert);

    if (itemsError) {
      toast.error('Failed to add recipe items');
      return null;
    }

    toast.success('Recipe created');
    await fetchRecipes();
    return recipeData;
  }, [outletId, user, fetchRecipes]);

  return { recipes, isLoading, fetchRecipes, addRecipe };
}

// ================================================================
// VARIANCE ENGINE HOOK
// ================================================================

export interface VarianceCalculation {
  sku_id: string;
  sku_name: string;
  spirit_type: string;
  measured_ml: number;
  expected_sop_ml: number;
  actual_stock_change_ml: number;
  variance_vs_sop: number;
  variance_vs_stock: number;
  variance_cost: number;
}

export function useVarianceEngine(outletId: string | undefined) {
  const [calculations, setCalculations] = useState<VarianceCalculation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const calculateVariance = useCallback(async (startDate: Date, endDate: Date) => {
    if (!outletId) return [];
    
    setIsLoading(true);

    try {
      // 1. Get measured pours grouped by SKU
      const { data: pourData } = await supabase
        .from('smart_pourer_pour_events')
        .select('sku_id, poured_ml')
        .eq('outlet_id', outletId)
        .eq('error_flag', false)
        .gte('started_at', startDate.toISOString())
        .lte('started_at', endDate.toISOString());

      // 2. Get POS sales with recipe mapping
      const { data: salesData } = await supabase
        .from('smart_pourer_pos_sales')
        .select(`
          pos_item_name,
          quantity,
          mapping:smart_pourer_pos_recipe_mapping(
            recipe:smart_pourer_recipes(
              items:smart_pourer_recipe_items(sku_id, ml_required)
            )
          )
        `)
        .eq('outlet_id', outletId)
        .gte('sold_at', startDate.toISOString())
        .lte('sold_at', endDate.toISOString());

      // 3. Get inventory snapshots
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data: openingSnapshots } = await supabase
        .from('smart_pourer_inventory_snapshots')
        .select('sku_id, ml_amount')
        .eq('outlet_id', outletId)
        .eq('snapshot_date', startDateStr)
        .eq('snapshot_type', 'opening');

      const { data: closingSnapshots } = await supabase
        .from('smart_pourer_inventory_snapshots')
        .select('sku_id, ml_amount')
        .eq('outlet_id', outletId)
        .eq('snapshot_date', endDateStr)
        .eq('snapshot_type', 'closing');

      // 4. Get SKU data
      const { data: skus } = await supabase
        .from('smart_pourer_skus')
        .select('id, name, spirit_type, cost_per_ml')
        .eq('outlet_id', outletId)
        .eq('is_active', true);

      // 5. Calculate variances
      const skuMap = new Map<string, VarianceCalculation>();

      // Initialize with SKU data
      skus?.forEach(sku => {
        skuMap.set(sku.id, {
          sku_id: sku.id,
          sku_name: sku.name,
          spirit_type: sku.spirit_type,
          measured_ml: 0,
          expected_sop_ml: 0,
          actual_stock_change_ml: 0,
          variance_vs_sop: 0,
          variance_vs_stock: 0,
          variance_cost: 0,
        });
      });

      // Add measured pours
      pourData?.forEach(pour => {
        if (pour.sku_id && skuMap.has(pour.sku_id)) {
          const calc = skuMap.get(pour.sku_id)!;
          calc.measured_ml += pour.poured_ml || 0;
        }
      });

      // Calculate expected SOP from sales
      salesData?.forEach(sale => {
        const mappings = sale.mapping as any;
        if (mappings?.[0]?.recipe?.items) {
          mappings[0].recipe.items.forEach((item: any) => {
            if (skuMap.has(item.sku_id)) {
              const calc = skuMap.get(item.sku_id)!;
              calc.expected_sop_ml += item.ml_required * (sale.quantity || 1);
            }
          });
        }
      });

      // Calculate stock change
      const openingMap = new Map(openingSnapshots?.map(s => [s.sku_id, s.ml_amount]) || []);
      const closingMap = new Map(closingSnapshots?.map(s => [s.sku_id, s.ml_amount]) || []);

      skuMap.forEach((calc, skuId) => {
        const opening = openingMap.get(skuId) || 0;
        const closing = closingMap.get(skuId) || 0;
        calc.actual_stock_change_ml = (opening as number) - (closing as number);
        
        // Calculate variances
        calc.variance_vs_sop = calc.measured_ml - calc.expected_sop_ml;
        calc.variance_vs_stock = calc.measured_ml - calc.actual_stock_change_ml;
        
        // Calculate cost
        const sku = skus?.find(s => s.id === skuId);
        const costPerMl = sku?.cost_per_ml || 0;
        calc.variance_cost = calc.variance_vs_sop * costPerMl;
      });

      const results = Array.from(skuMap.values()).filter(
        calc => calc.measured_ml > 0 || calc.expected_sop_ml > 0
      );

      setCalculations(results);
      return results;
    } catch (error) {
      console.error('Error calculating variance:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [outletId]);

  const logVariance = useCallback(async (
    varianceData: {
      sku_id?: string;
      measured_ml: number;
      expected_ml: number;
      variance_ml: number;
      variance_cost?: number;
      variance_type: string;
      reason: string;
      reason_notes?: string;
    }
  ) => {
    if (!outletId || !user) return null;

    const { data, error } = await supabase
      .from('smart_pourer_variance_logs')
      .insert({
        ...varianceData,
        outlet_id: outletId,
        manager_id: user.id,
        acknowledged_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to log variance');
      return null;
    }

    toast.success('Variance logged');
    return data;
  }, [outletId, user]);

  return { calculations, isLoading, calculateVariance, logVariance };
}

// ================================================================
// SHIFT SESSIONS HOOK
// ================================================================

export function useShiftSessions(outletId: string | undefined) {
  const [currentShift, setCurrentShift] = useState<ShiftSession | null>(null);
  const [shifts, setShifts] = useState<ShiftSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchShifts = useCallback(async () => {
    if (!outletId) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('smart_pourer_shift_sessions')
      .select('*')
      .eq('outlet_id', outletId)
      .order('shift_date', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Error fetching shifts:', error);
    } else {
      setShifts((data || []) as ShiftSession[]);
      const openShift = data?.find(s => s.status === 'open');
      setCurrentShift(openShift ? (openShift as ShiftSession) : null);
    }
    setIsLoading(false);
  }, [outletId]);

  useEffect(() => {
    fetchShifts();
  }, [outletId, fetchShifts]);

  const openShift = useCallback(async (shiftType: string) => {
    if (!outletId || !user) return null;

    // Check for already open shift
    if (currentShift) {
      toast.error('Close current shift before opening a new one');
      return null;
    }

    const { data, error } = await supabase
      .from('smart_pourer_shift_sessions')
      .insert({
        outlet_id: outletId,
        shift_type: shiftType,
        opened_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to open shift');
      return null;
    }

    toast.success('Shift opened');
    await fetchShifts();
    return data;
  }, [outletId, user, currentShift, fetchShifts]);

  const closeShift = useCallback(async (shiftId: string, varianceReviewed = false) => {
    if (!user) return false;

    const { error } = await supabase
      .from('smart_pourer_shift_sessions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: user.id,
        variance_reviewed: varianceReviewed,
      })
      .eq('id', shiftId);

    if (error) {
      toast.error('Failed to close shift');
      return false;
    }

    toast.success('Shift closed');
    await fetchShifts();
    return true;
  }, [user, fetchShifts]);

  return { currentShift, shifts, isLoading, openShift, closeShift, fetchShifts };
}
