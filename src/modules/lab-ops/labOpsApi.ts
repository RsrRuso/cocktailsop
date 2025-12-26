/**
 * Lab Ops API Client
 * 
 * Centralized API client for Lab Ops operations.
 * Routes through dedicated edge functions for:
 * - Independent scaling
 * - Isolated error handling
 * - Better monitoring
 */

import { supabase } from "@/integrations/supabase/client";
import { checkLabOpsRateLimit, LabOpsRateLimitError } from "./labOpsRateLimit";

/**
 * Lab Ops API Response type
 */
interface LabOpsApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Call Lab Ops dedicated edge function
 */
async function callLabOpsApi<T = any>(
  action: string,
  payload: Record<string, any>,
  outletId: string
): Promise<LabOpsApiResponse<T>> {
  // Check rate limit before calling
  const rateStatus = checkLabOpsRateLimit(action, outletId);
  if (!rateStatus.allowed) {
    throw new LabOpsRateLimitError(
      `Rate limit exceeded for ${action}`,
      rateStatus.resetIn
    );
  }

  try {
    const { data, error } = await supabase.functions.invoke('lab-ops-api', {
      body: {
        action,
        outletId,
        payload,
      },
    });

    if (error) {
      console.error(`[Lab Ops API] ${action} error:`, error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error(`[Lab Ops API] ${action} exception:`, err);
    return { success: false, error: err.message };
  }
}

// ============================================
// ORDER OPERATIONS
// ============================================

export async function createOrder(outletId: string, orderData: {
  tableId?: string;
  items: Array<{ menuItemId: string; quantity: number; modifiers?: string[]; notes?: string }>;
  staffId: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
}) {
  return callLabOpsApi('order-create', orderData, outletId);
}

export async function updateOrderStatus(outletId: string, orderId: string, status: string) {
  return callLabOpsApi('order-update', { orderId, status }, outletId);
}

export async function voidOrderItem(outletId: string, orderItemId: string, reasonId: string, staffId: string) {
  return callLabOpsApi('order-void', { orderItemId, reasonId, staffId }, outletId);
}

// ============================================
// INVENTORY OPERATIONS
// ============================================

export async function updateInventoryStock(outletId: string, itemId: string, adjustment: number, reason: string) {
  return callLabOpsApi('inventory-update', { itemId, adjustment, reason }, outletId);
}

export async function performStockCount(outletId: string, counts: Array<{ itemId: string; counted: number }>) {
  return callLabOpsApi('inventory-count', { counts }, outletId);
}

// ============================================
// KDS OPERATIONS
// ============================================

export async function refreshKDSOrders(outletId: string, stationType: 'bar' | 'kitchen') {
  return callLabOpsApi('kds-refresh', { stationType }, outletId);
}

export async function updateKDSItemStatus(outletId: string, orderItemId: string, status: 'preparing' | 'ready' | 'served') {
  return callLabOpsApi('kds-update-status', { orderItemId, status }, outletId);
}

// ============================================
// ANALYTICS OPERATIONS
// ============================================

export async function getDailySalesAnalytics(outletId: string, date: string) {
  return callLabOpsApi('analytics-daily', { date }, outletId);
}

export async function generateSalesReport(outletId: string, startDate: string, endDate: string, reportType: string) {
  return callLabOpsApi('analytics-report', { startDate, endDate, reportType }, outletId);
}

// ============================================
// STAFF OPERATIONS
// ============================================

export async function verifyStaffPin(outletId: string, pin: string) {
  return callLabOpsApi('staff-verify-pin', { pin }, outletId);
}

export async function clockInStaff(outletId: string, staffId: string) {
  return callLabOpsApi('staff-clock-in', { staffId }, outletId);
}
