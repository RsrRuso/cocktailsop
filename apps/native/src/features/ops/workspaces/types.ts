export type WorkspaceLite = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string | null;
  workspace_type?: string | null;
  member_count?: number;
  store_count?: number;
};

export type FifoActivityLite = {
  id: string;
  action_type: string;
  created_at: string | null;
  user_id: string;
  quantity_before: number | null;
  quantity_after: number | null;
  details: any | null;
};

