import { Card } from "@/components/ui/card";
import { Ingredient, TasteProfile } from "@/types/cocktail";
import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

interface CocktailChartsProps {
  ingredients: Ingredient[];
  tasteProfile: TasteProfile;
}

const CocktailCharts = ({ ingredients, tasteProfile }: CocktailChartsProps) => {
  const radarRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLCanvasElement>(null);
  const radarChartRef = useRef<Chart | null>(null);
  const barChartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!radarRef.current || !barRef.current) return;

    // Cleanup existing charts
    if (radarChartRef.current) radarChartRef.current.destroy();
    if (barChartRef.current) barChartRef.current.destroy();

    // Radar Chart - Taste Profile
    const radarCtx = radarRef.current.getContext("2d");
    if (radarCtx) {
      radarChartRef.current = new Chart(radarCtx, {
        type: "radar",
        data: {
          labels: ["Sweet", "Sour", "Bitter", "Salty", "Umami"],
          datasets: [
            {
              label: "Taste Profile",
              data: [
                tasteProfile.sweet,
                tasteProfile.sour,
                tasteProfile.bitter,
                tasteProfile.salty,
                tasteProfile.umami,
              ],
              backgroundColor: "rgba(59, 130, 246, 0.2)",
              borderColor: "rgba(59, 130, 246, 1)",
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            r: {
              beginAtZero: true,
              max: 10,
              ticks: { stepSize: 2 },
            },
          },
        },
      });
    }

    // Bar Chart - Ingredients
    const barCtx = barRef.current.getContext("2d");
    if (barCtx && ingredients.length > 0) {
      const colors = [
        "rgba(239, 68, 68, 0.8)",
        "rgba(59, 130, 246, 0.8)",
        "rgba(34, 197, 94, 0.8)",
        "rgba(251, 191, 36, 0.8)",
        "rgba(168, 85, 247, 0.8)",
      ];

      barChartRef.current = new Chart(barCtx, {
        type: "bar",
        data: {
          labels: ingredients.map((ing) => ing.name || "Unknown"),
          datasets: [
            {
              label: "Amount (ml)",
              data: ingredients.map((ing) => parseFloat(ing.amount) || 0),
              backgroundColor: colors,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            y: { beginAtZero: true },
          },
        },
      });
    }

    return () => {
      if (radarChartRef.current) radarChartRef.current.destroy();
      if (barChartRef.current) barChartRef.current.destroy();
    };
  }, [ingredients, tasteProfile]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Taste Profile</h3>
        <div className="w-full h-64">
          <canvas ref={radarRef}></canvas>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Ingredient Breakdown</h3>
        <div className="w-full h-64">
          <canvas ref={barRef}></canvas>
        </div>
      </Card>
    </div>
  );
};

export default CocktailCharts;
