export interface RecipeIngredient {
  name: string;
  amount: string;
  unit: string;
  abv: string;
  type: string;
  notes: string;
}

export interface TasteProfile {
  sweet: number;
  sour: number;
  bitter: number;
  salty: number;
  umami: number;
}

export interface TextureProfile {
  body: number;
  foam: number;
  bubbles: number;
  oiliness: number;
  creaminess: number;
  astringency: number;
}

export interface CocktailRecipe {
  drinkName: string;
  glass: string;
  ice: string;
  garnish: string;
  technique: string;
  mainImage: string | null;
  ingredients: RecipeIngredient[];
  methodSOP: string;
  serviceNotes: string;
  tasteProfile: TasteProfile;
  textureProfile: TextureProfile;
  ratio: string;
  ph: string;
  brix: string;
  allergens: string;
  pdfOptions?: {
    showUnit?: boolean;
    showType?: boolean;
    showABV?: boolean;
    showNotes?: boolean;
  };
}
