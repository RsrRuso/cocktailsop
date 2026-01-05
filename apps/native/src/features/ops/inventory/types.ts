export type FifoStore = {
  id: string;
  name: string;
  location: string | null;
  store_type: string | null;
};

export type FifoItem = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  color_code: string | null;
  barcode: string | null;
  photo_url: string | null;
};

export type FifoInventoryRow = {
  id: string;
  item_id: string;
  store_id: string;
  quantity: number;
  expiration_date: string;
  received_date: string | null;
  batch_number: string | null;
  notes: string | null;
  priority_score: number | null;
  status: string | null;
  created_at: string;
  stores?: Pick<FifoStore, 'name' | 'location' | 'store_type'> | null;
  items?: Pick<FifoItem, 'name' | 'brand' | 'category' | 'color_code' | 'barcode' | 'photo_url'> | null;
};

export type FifoEmployee = {
  id: string;
  name: string;
  title: string;
};

export type FifoTransferRow = {
  id: string;
  inventory_id: string | null;
  from_store_id: string | null;
  to_store_id: string | null;
  quantity: number;
  transferred_by: string | null;
  transfer_date: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  from_store?: { name: string } | null;
  to_store?: { name: string } | null;
  employees?: { name: string } | null;
  inventory?: { items?: { name: string; brand: string | null; category: string | null } | null } | null;
};

export type FifoActivityRow = {
  id: string;
  action_type: string;
  inventory_id: string | null;
  store_id: string | null;
  employee_id: string | null;
  quantity_before: number | null;
  quantity_after: number | null;
  details: any;
  created_at: string;
  stores?: { name: string } | null;
  employees?: { name: string } | null;
};

