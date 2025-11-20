import { Card } from "@/components/ui/card";
import { Ingredient } from "@/types/cocktail";
import { Droplets, Zap, Activity, Flame } from "lucide-react";

interface CocktailMetricsProps {
  ingredients: Ingredient[];
}

const CocktailMetrics = ({ ingredients }: CocktailMetricsProps) => {
  const totalVolume = ingredients.reduce(
    (sum, ing) => sum + (parseFloat(ing.amount) || 0),
    0
  );

  const pureAlcohol = ingredients.reduce(
    (sum, ing) =>
      sum + (parseFloat(ing.amount) || 0) * ((parseFloat(ing.abv) || 0) / 100),
    0
  );

  const abvPercentage = totalVolume > 0 ? (pureAlcohol / totalVolume) * 100 : 0;
  const standardDrinks = pureAlcohol / 14;
  const estimatedCalories = Math.round(pureAlcohol * 7 + totalVolume * 0.5);

  const metrics = [
    {
      label: "Total Volume",
      value: `${totalVolume.toFixed(0)}ml`,
      icon: Droplets,
      color: "text-blue-500",
    },
    {
      label: "ABV",
      value: `${abvPercentage.toFixed(1)}%`,
      icon: Zap,
      color: "text-yellow-500",
    },
    {
      label: "Std Drinks",
      value: standardDrinks.toFixed(1),
      icon: Activity,
      color: "text-green-500",
    },
    {
      label: "Calories",
      value: `${estimatedCalories} kcal`,
      icon: Flame,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="p-4">
          <div className="flex items-center gap-3">
            <metric.icon className={`h-5 w-5 ${metric.color}`} />
            <div>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="text-lg font-semibold">{metric.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default CocktailMetrics;
