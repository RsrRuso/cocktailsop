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

