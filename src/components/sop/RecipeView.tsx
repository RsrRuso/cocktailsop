import { Card } from "@/components/ui/card";
import { CocktailRecipe } from "@/types/cocktail-recipe";
import RecipeMetrics from "./RecipeMetrics";

interface RecipeViewProps {
  recipe: CocktailRecipe;
}

const RecipeView = ({ recipe }: RecipeViewProps) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10">
        <h1 className="text-2xl font-bold mb-2">{recipe.drinkName || "Untitled"}</h1>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {recipe.glass && <span>Glass: {recipe.glass}</span>}
          {recipe.ice && <span>Ice: {recipe.ice}</span>}
          {recipe.technique && <span>Technique: {recipe.technique}</span>}
        </div>
      </Card>

      {/* Image */}
      {recipe.mainImage && (
        <Card className="overflow-hidden">
          <img
            src={recipe.mainImage}
            alt={recipe.drinkName}
            className="w-full h-48 object-cover"
          />
        </Card>
      )}

      {/* Metrics */}
      <RecipeMetrics ingredients={recipe.ingredients} />

      {/* Recipe */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Recipe</h2>
        {recipe.ingredients.length > 0 ? (
          <ul className="space-y-2">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index} className="flex justify-between items-center border-b pb-2 last:border-0">
                <span className="font-medium">{ingredient.name || "Unnamed"}</span>
                <span className="text-muted-foreground text-sm">
                  {ingredient.amount} {ingredient.unit}
                  {ingredient.abv && ` (${ingredient.abv}% ABV)`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No ingredients</p>
        )}
        {recipe.garnish && (
          <div className="mt-3 pt-3 border-t">
            <span className="font-medium">Garnish: </span>
            <span className="text-muted-foreground">{recipe.garnish}</span>
          </div>
        )}
      </Card>

      {/* Method */}
      {recipe.methodSOP && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Method</h2>
          <p className="whitespace-pre-wrap text-muted-foreground text-sm">{recipe.methodSOP}</p>
        </Card>
      )}

      {/* Taste Profile */}
      {Object.values(recipe.tasteProfile).some(v => v > 0) && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Taste Profile</h2>
          <div className="space-y-2">
            {Object.entries(recipe.tasteProfile).map(([key, value]) => (
              value > 0 && (
                <div key={key} className="flex justify-between items-center">
                  <span className="capitalize text-sm">{key}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${value * 10}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8">{value}/10</span>
                  </div>
                </div>
              )
            ))}
          </div>
        </Card>
      )}

      {/* Service Notes */}
      {recipe.serviceNotes && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Service Notes</h2>
          <p className="whitespace-pre-wrap text-muted-foreground text-sm">{recipe.serviceNotes}</p>
        </Card>
      )}
    </div>
  );
};

export default RecipeView;
