export type ProcurementWorkspace = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ProcurementStaffLite = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  full_name: string;
  role: string;
  pin_code: string;
  permissions: Record<string, boolean> | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type PurchaseOrderLite = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  order_number: string | null;
  supplier_name: string | null;
  order_date: string | null;
  total_amount: number | null;
  status: string | null;
  notes: string | null;
  document_url: string | null;
  created_at: string | null;
};

export type PurchaseOrderItemInput = {
  item_code?: string;
  item_name: string;
  quantity: number;
  price_per_unit: number;
};

export type MasterItemLite = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  item_name: string;
  unit: string | null;
  category: string | null;
  last_price: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ReceivedItemLite = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  record_id?: string | null;
  document_number?: string | null;
  is_received?: boolean;
  item_name: string;
  quantity: number;
  unit: string | null;
  unit_price: number | null;
  total_price: number | null;
  received_date: string | null;
  created_at: string | null;
};

export type ReceivedRecordLite = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  supplier_name: string | null;
  document_number: string | null;
  received_date: string | null;
  total_items: number | null;
  total_quantity: number | null;
  total_value: number | null;
  status: string | null;
  variance_data?: any | null;
  created_at: string | null;
};

