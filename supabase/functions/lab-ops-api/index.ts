/**
 * Lab Ops Dedicated Edge Function
 * 
 * Handles all Lab Ops specific API operations independently from main app.
 * Benefits:
 * - Scales independently based on Lab Ops traffic
 * - Isolated error handling (Lab Ops errors don't affect main app)
 * - Dedicated logging for Lab Ops operations
 * - Can be monitored separately
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LabOpsRequest {
  action: string;
  outletId: string;
  payload: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let action = 'unknown';

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action: requestAction, outletId, payload }: LabOpsRequest = await req.json();
    action = requestAction;

    console.log(`[Lab Ops API] Action: ${action}, Outlet: ${outletId}`);

    // Validate outlet access
    if (!outletId) {
      return new Response(
        JSON.stringify({ error: 'Outlet ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: any;

    switch (action) {
      // ============================================
      // ORDER OPERATIONS
      // ============================================
      case 'order-create':
        result = await handleCreateOrder(supabase, outletId, payload);
        break;

      case 'order-update':
        result = await handleUpdateOrderStatus(supabase, outletId, payload);
        break;

      case 'order-void':
        result = await handleVoidOrderItem(supabase, outletId, payload);
        break;

      // ============================================
      // INVENTORY OPERATIONS
      // ============================================
      case 'inventory-update':
        result = await handleInventoryUpdate(supabase, outletId, payload);
        break;

      case 'inventory-count':
        result = await handleStockCount(supabase, outletId, payload);
        break;

      // ============================================
      // KDS OPERATIONS
      // ============================================
      case 'kds-refresh':
        result = await handleKDSRefresh(supabase, outletId, payload);
        break;

      case 'kds-update-status':
        result = await handleKDSUpdateStatus(supabase, outletId, payload);
        break;

      // ============================================
      // ANALYTICS OPERATIONS
      // ============================================
      case 'analytics-daily':
        result = await handleDailyAnalytics(supabase, outletId, payload);
        break;

      case 'analytics-report':
        result = await handleGenerateReport(supabase, outletId, payload);
        break;

      // ============================================
      // STAFF OPERATIONS
      // ============================================
      case 'staff-verify-pin':
        result = await handleVerifyPin(supabase, outletId, payload);
        break;

      case 'staff-clock-in':
        result = await handleClockIn(supabase, outletId, payload);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const duration = Date.now() - startTime;
    console.log(`[Lab Ops API] ${action} completed in ${duration}ms`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Lab Ops API] ${action} failed after ${duration}ms:`, error);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================
// HANDLER IMPLEMENTATIONS
// ============================================

async function handleCreateOrder(supabase: any, outletId: string, payload: any) {
  const { tableId, items, staffId, orderType } = payload;

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('lab_ops_orders')
    .insert({
      outlet_id: outletId,
      table_id: tableId || null,
      staff_id: staffId,
      order_type: orderType,
      status: 'pending',
      total_amount: 0,
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Create order items
  let totalAmount = 0;
  for (const item of items) {
    // Get menu item price
    const { data: menuItem } = await supabase
      .from('lab_ops_menu_items')
      .select('base_price')
      .eq('id', item.menuItemId)
      .single();

    const itemPrice = (menuItem?.base_price || 0) * item.quantity;
    totalAmount += itemPrice;

    await supabase
      .from('lab_ops_order_items')
      .insert({
        order_id: order.id,
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        unit_price: menuItem?.base_price || 0,
        modifiers: item.modifiers || [],
        notes: item.notes || null,
        status: 'pending',
      });
  }

  // Update order total
  await supabase
    .from('lab_ops_orders')
    .update({ total_amount: totalAmount })
    .eq('id', order.id);

  return { orderId: order.id, totalAmount };
}

async function handleUpdateOrderStatus(supabase: any, outletId: string, payload: any) {
  const { orderId, status } = payload;

  const { error } = await supabase
    .from('lab_ops_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('outlet_id', outletId);

  if (error) throw error;
  return { success: true };
}

async function handleVoidOrderItem(supabase: any, outletId: string, payload: any) {
  const { orderItemId, reasonId, staffId } = payload;

  const { error } = await supabase
    .from('lab_ops_order_items')
    .update({
      status: 'voided',
      void_reason_id: reasonId,
      voided_by: staffId,
      voided_at: new Date().toISOString(),
    })
    .eq('id', orderItemId);

  if (error) throw error;
  return { success: true };
}

async function handleInventoryUpdate(supabase: any, outletId: string, payload: any) {
  const { itemId, adjustment, reason } = payload;

  // Get current stock
  const { data: item } = await supabase
    .from('lab_ops_inventory_items')
    .select('current_stock')
    .eq('id', itemId)
    .eq('outlet_id', outletId)
    .single();

  const newStock = (item?.current_stock || 0) + adjustment;

  // Update stock
  const { error } = await supabase
    .from('lab_ops_inventory_items')
    .update({ current_stock: newStock })
    .eq('id', itemId);

  if (error) throw error;

  // Log transaction
  await supabase.from('lab_ops_inventory_transactions').insert({
    inventory_item_id: itemId,
    outlet_id: outletId,
    quantity: adjustment,
    transaction_type: adjustment > 0 ? 'addition' : 'reduction',
    reason,
  });

  return { newStock };
}

async function handleStockCount(supabase: any, outletId: string, payload: any) {
  const { counts } = payload;

  for (const count of counts) {
    await supabase
      .from('lab_ops_inventory_items')
      .update({ 
        current_stock: count.counted,
        last_counted_at: new Date().toISOString()
      })
      .eq('id', count.itemId)
      .eq('outlet_id', outletId);
  }

  return { success: true, counted: counts.length };
}

async function handleKDSRefresh(supabase: any, outletId: string, payload: any) {
  const { stationType } = payload;

  // Get pending orders for KDS
  const { data: orders, error } = await supabase
    .from('lab_ops_order_items')
    .select(`
      id,
      quantity,
      status,
      notes,
      created_at,
      menu_item:lab_ops_menu_items(name, category_id),
      order:lab_ops_orders(id, table_id, order_type, status)
    `)
    .eq('order.outlet_id', outletId)
    .in('status', ['pending', 'preparing'])
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) throw error;
  return { orders };
}

async function handleKDSUpdateStatus(supabase: any, outletId: string, payload: any) {
  const { orderItemId, status } = payload;

  const updateData: any = { status };
  if (status === 'ready') {
    updateData.ready_at = new Date().toISOString();
  } else if (status === 'served') {
    updateData.served_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('lab_ops_order_items')
    .update(updateData)
    .eq('id', orderItemId);

  if (error) throw error;
  return { success: true };
}

async function handleDailyAnalytics(supabase: any, outletId: string, payload: any) {
  const { date } = payload;
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;

  // Get daily totals
  const { data: orders } = await supabase
    .from('lab_ops_orders')
    .select('total_amount, status')
    .eq('outlet_id', outletId)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay);

  const completedOrders = orders?.filter((o: any) => o.status === 'completed') || [];
  const totalRevenue = completedOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);

  return {
    date,
    totalOrders: orders?.length || 0,
    completedOrders: completedOrders.length,
    totalRevenue,
    averageOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
  };
}

async function handleGenerateReport(supabase: any, outletId: string, payload: any) {
  const { startDate, endDate, reportType } = payload;

  // Generate report based on type
  const { data: orders } = await supabase
    .from('lab_ops_orders')
    .select('*, order_items:lab_ops_order_items(*)')
    .eq('outlet_id', outletId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  return {
    reportType,
    dateRange: { startDate, endDate },
    orderCount: orders?.length || 0,
    data: orders,
  };
}

async function handleVerifyPin(supabase: any, outletId: string, payload: any) {
  const { pin } = payload;

  const { data: staff, error } = await supabase
    .from('lab_ops_staff')
    .select('id, full_name, role, permissions')
    .eq('outlet_id', outletId)
    .eq('pin_code', pin)
    .eq('is_active', true)
    .single();

  if (error || !staff) {
    return { valid: false };
  }

  return { valid: true, staff };
}

async function handleClockIn(supabase: any, outletId: string, payload: any) {
  const { staffId } = payload;

  const { error } = await supabase
    .from('lab_ops_staff_shifts')
    .insert({
      staff_id: staffId,
      outlet_id: outletId,
      clock_in: new Date().toISOString(),
    });

  if (error) throw error;
  return { success: true, clockedInAt: new Date().toISOString() };
}
