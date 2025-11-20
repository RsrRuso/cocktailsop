export interface RecipeIngredient {
  name: string;
  amount: string;
  unit: string;
  abv: string;
  type: string;
}

export interface TasteProfile {
  sweet: number;
  sour: number;
  bitter: number;
  salty: number;
  umami: number;
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
}
