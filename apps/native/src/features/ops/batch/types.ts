export type MixologistGroupLite = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string | null;
};

export type BatchIngredient = {
  id: string;
  name: string;
  amount: string;
  unit: string;
};

export type BatchRecipeLite = {
  id: string;
  user_id: string;
  recipe_name: string;
  description: string | null;
  current_serves: number;
  ingredients: BatchIngredient[];
  created_at: string | null;
  updated_at: string | null;
};

export type BatchProductionLite = {
  id: string;
  recipe_id: string;
  user_id: string;
  group_id: string | null;
  batch_name: string;
  target_serves: number;
  target_liters: number;
  production_date: string | null;
  produced_by_name: string | null;
  produced_by_email: string | null;
  qr_code_data: string | null;
  notes: string | null;
  created_at: string | null;
};

export type BatchProductionIngredientLite = {
  id: string;
  production_id: string;
  ingredient_name: string;
  original_amount: number;
  scaled_amount: number;
  unit: string;
  created_at: string | null;
};

