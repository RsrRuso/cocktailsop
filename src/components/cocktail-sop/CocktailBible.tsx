import { Card } from "@/components/ui/card";
import { CocktailData } from "@/types/cocktail";
import CocktailCharts from "./CocktailCharts";
import CocktailMetrics from "./CocktailMetrics";

interface CocktailBibleProps {
  data: CocktailData;
}

const CocktailBible = ({ data }: CocktailBibleProps) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10">
        <h1 className="text-3xl font-bold mb-2">{data.drinkName || "Untitled Cocktail"}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {data.glass && <span>Glass: {data.glass}</span>}
          {data.ice && <span>Ice: {data.ice}</span>}
          {data.technique && <span>Technique: {data.technique}</span>}
        </div>
      </Card>

      {/* Image */}
      {data.mainImage && (
        <Card className="overflow-hidden">
          <img
            src={data.mainImage}
            alt={data.drinkName}
            className="w-full h-64 object-cover"
          />
        </Card>
      )}

      {/* Metrics */}
      <CocktailMetrics ingredients={data.ingredients} />

      {/* Charts */}
      <CocktailCharts ingredients={data.ingredients} tasteProfile={data.tasteProfile} />

      {/* Recipe */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recipe</h2>
        {data.ingredients.length > 0 ? (
          <ul className="space-y-2">
            {data.ingredients.map((ingredient, index) => (
              <li key={index} className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">{ingredient.name || "Unnamed ingredient"}</span>
                <span className="text-muted-foreground">
                  {ingredient.amount} {ingredient.unit}
                  {ingredient.abv && ` (${ingredient.abv}% ABV)`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No ingredients added</p>
        )}
        {data.garnish && (
          <div className="mt-4 pt-4 border-t">
            <span className="font-medium">Garnish: </span>
            <span className="text-muted-foreground">{data.garnish}</span>
          </div>
        )}
      </Card>

      {/* Method */}
      {data.methodSOP && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Preparation Method</h2>
          <p className="whitespace-pre-wrap text-muted-foreground">{data.methodSOP}</p>
        </Card>
      )}

      {/* Service Notes */}
      {data.serviceNotes && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Service Notes</h2>
          <p className="whitespace-pre-wrap text-muted-foreground">{data.serviceNotes}</p>
        </Card>
      )}
    </div>
  );
};

export default CocktailBible;
