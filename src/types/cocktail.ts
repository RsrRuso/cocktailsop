export interface Ingredient {
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

export interface CocktailData {
  drinkName: string;
  glass: string;
  ice: string;
  garnish: string;
  technique: string;
  mainImage: string | null;
  ingredients: Ingredient[];
  methodSOP: string;
  serviceNotes: string;
  tasteProfile: TasteProfile;
}
