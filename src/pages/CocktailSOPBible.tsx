import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  abv: number;
  type: string;
}

export default function CocktailSOPBible() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<"editor" | "bible">("editor");

  // Identity & Service
  const [drinkName, setDrinkName] = useState("");
  const [technique, setTechnique] = useState("");
  const [glass, setGlass] = useState("");
  const [ice, setIce] = useState("");
  const [garnish, setGarnish] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");

  // Images
  const [mainImage, setMainImage] = useState<string>("");
  const [extraImages, setExtraImages] = useState<string[]>([]);

  // Recipe
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // SOP Steps
  const [sopSteps, setSopSteps] = useState("");

  // Taste Profile
  const [tasteProfile, setTasteProfile] = useState({
    sweet: 50,
    sour: 50,
    bitter: 50,
    salty: 50,
    umami: 50,
  });

  const radarChartRef = useRef<HTMLCanvasElement>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const radarChartInstance = useRef<ChartJS | null>(null);
  const barChartInstance = useRef<ChartJS | null>(null);

  const ingredientTypes = [
    "Spirit",
    "Liqueur",
    "Mixer",
    "Syrup",
    "Juice",
    "Bitters",
    "Other",
  ];

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Calculations
  const totalVolume = ingredients.reduce((sum, ing) => sum + ing.amount, 0);
  const pureAlcohol = ingredients.reduce(
    (sum, ing) => sum + (ing.amount * ing.abv) / 100,
    0
  );
  const abv = totalVolume > 0 ? (pureAlcohol / totalVolume) * 100 : 0;
  const standardDrinks = pureAlcohol / 10;
  const estimatedCalories = Math.round(pureAlcohol * 7 + totalVolume * 0.1);

  useEffect(() => {
    drawCharts();
  }, [tasteProfile, ingredients]);

  const drawCharts = () => {
    // Radar Chart
    if (radarChartRef.current) {
      if (radarChartInstance.current) {
        radarChartInstance.current.destroy();
      }

      const radarCtx = radarChartRef.current.getContext("2d");
      if (radarCtx) {
        radarChartInstance.current = new ChartJS(radarCtx, {
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
                backgroundColor: "rgba(212, 175, 55, 0.2)",
                borderColor: "rgba(212, 175, 55, 1)",
                borderWidth: 2,
                pointBackgroundColor: "rgba(212, 175, 55, 1)",
              },
            ],
          },
          options: {
            scales: {
              r: {
                beginAtZero: true,
                max: 100,
                ticks: { stepSize: 20, color: "#a7acb9" },
                grid: { color: "#2a3040" },
                pointLabels: { color: "#e6e8ef" },
              },
            },
            plugins: {
              legend: { display: false },
            },
          },
        });
      }
    }

    // Bar Chart
    if (barChartRef.current) {
      if (barChartInstance.current) {
        barChartInstance.current.destroy();
      }

      const barCtx = barChartRef.current.getContext("2d");
      if (barCtx) {
        barChartInstance.current = new ChartJS(barCtx, {
          type: "bar",
          data: {
            labels: ingredients.map((ing) => ing.name || "?"),
            datasets: [
              {
                label: "Amount (ml)",
                data: ingredients.map((ing) => ing.amount),
                backgroundColor: "rgba(212, 175, 55, 0.6)",
              },
            ],
          },
          options: {
            scales: {
              y: {
                beginAtZero: true,
                ticks: { color: "#a7acb9" },
                grid: { color: "#2a3040" },
              },
              x: {
                ticks: { color: "#e6e8ef" },
                grid: { color: "#2a3040" },
              },
            },
            plugins: {
              legend: { display: false },
            },
          },
        });
      }
    }
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { name: "", amount: 0, unit: "ml", abv: 0, type: "Spirit" },
    ]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const clearIngredients = () => {
    setIngredients([]);
  };

  const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMainImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtraImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setExtraImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const saveSOP = async () => {
    if (!user) {
      toast.error("Please log in to save");
      return;
    }

    try {
      const { error } = await supabase.from("cocktail_sops").insert({
        user_id: user.id,
        drink_name: drinkName,
        technique,
        glass,
        ice,
        garnish,
        service_notes: serviceNotes,
        main_image: mainImage,
        recipe: ingredients,
        method_sop: sopSteps,
        total_ml: totalVolume,
        abv_percentage: abv,
        taste_profile: tasteProfile,
        taste_sweet: tasteProfile.sweet,
        taste_sour: tasteProfile.sour,
        taste_bitter: tasteProfile.bitter,
        taste_salty: tasteProfile.salty,
        taste_umami: tasteProfile.umami,
      });

      if (error) throw error;
      toast.success("Cocktail SOP saved successfully!");
    } catch (error: any) {
      console.error("Error saving SOP:", error);
      toast.error("Failed to save SOP");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-[#e6e8ef]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gradient-to-b from-[#0b0d12] to-[#0f1115] border-b border-[#202536] px-3 py-2.5 flex items-center gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="h-7 px-3 py-1 bg-[#0e1117] border border-[#d4af37]/50 rounded-lg flex items-center justify-center text-[#d4af37] font-bold text-sm">
            LOGO
          </div>
          <div className="font-bold tracking-wide text-[#d4af37] text-sm">
            Cocktail SOP & Bible
          </div>
        </div>
        <div className="flex-1" />
        <Button
          onClick={() => setCurrentView("editor")}
          variant={currentView === "editor" ? "default" : "outline"}
          size="sm"
          className="text-xs h-9"
        >
          Input Page
        </Button>
        <Button
          onClick={() => setCurrentView("bible")}
          variant={currentView === "bible" ? "default" : "outline"}
          size="sm"
          className="text-xs h-9"
        >
          Cocktail Bible
        </Button>
        <Button onClick={saveSOP} size="sm" className="text-xs h-9">
          Save
        </Button>
      </header>

      {/* Editor View */}
      {currentView === "editor" && (
        <div className="p-3 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3">
          {/* Left Column */}
          <div className="space-y-3">
            {/* Identity & Service */}
            <div className="bg-[#171a21] border border-[#232836] rounded-xl p-3">
              <h2 className="text-[#d4af37] text-sm font-semibold mb-2.5 tracking-wide">
                Identity & Service
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                <div>
                  <Label className="text-xs text-[#a7acb9]">Drink Name</Label>
                  <Input
                    value={drinkName}
                    onChange={(e) => setDrinkName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#a7acb9]">Technique</Label>
                  <Input
                    value={technique}
                    onChange={(e) => setTechnique(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#a7acb9]">Glass</Label>
                  <Input
                    value={glass}
                    onChange={(e) => setGlass(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#a7acb9]">Ice</Label>
                  <Input
                    value={ice}
                    onChange={(e) => setIce(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs text-[#a7acb9]">Garnish</Label>
                  <Input
                    value={garnish}
                    onChange={(e) => setGarnish(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs text-[#a7acb9]">Service Notes</Label>
                  <Input
                    value={serviceNotes}
                    onChange={(e) => setServiceNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="bg-[#171a21] border border-[#232836] rounded-xl p-3">
              <h2 className="text-[#d4af37] text-sm font-semibold mb-2.5 tracking-wide">
                Images
              </h2>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-[#a7acb9]">Main Image</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageUpload}
                    className="mt-1"
                  />
                  {mainImage && (
                    <img
                      src={mainImage}
                      alt="Main"
                      className="mt-2 w-32 h-32 object-cover rounded-lg border border-[#2a3040]"
                    />
                  )}
                </div>
                <div>
                  <Label className="text-xs text-[#a7acb9]">Extra Images</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleExtraImagesUpload}
                    className="mt-1"
                  />
                  {extraImages.length > 0 && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {extraImages.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Extra ${idx}`}
                          className="w-20 h-20 object-cover rounded-lg border border-[#2a3040]"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recipe */}
            <div className="bg-[#171a21] border border-[#232836] rounded-xl p-3">
              <h2 className="text-[#d4af37] text-sm font-semibold mb-2.5 tracking-wide">
                Recipe
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-[#a7acb9] text-xs">
                      <th className="text-left px-2.5 py-2">Ingredient</th>
                      <th className="text-left px-2.5 py-2">Amount</th>
                      <th className="text-left px-2.5 py-2">Unit</th>
                      <th className="text-left px-2.5 py-2">ABV%</th>
                      <th className="text-left px-2.5 py-2">Type</th>
                      <th className="text-left px-2.5 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map((ing, idx) => (
                      <tr key={idx} className="bg-[#0e1117] rounded-lg">
                        <td className="px-2.5 py-2 rounded-l-lg">
                          <Input
                            value={ing.name}
                            onChange={(e) =>
                              updateIngredient(idx, "name", e.target.value)
                            }
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-2.5 py-2">
                          <Input
                            type="number"
                            value={ing.amount}
                            onChange={(e) =>
                              updateIngredient(idx, "amount", Number(e.target.value))
                            }
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-2.5 py-2">
                          <Input
                            value={ing.unit}
                            onChange={(e) =>
                              updateIngredient(idx, "unit", e.target.value)
                            }
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-2.5 py-2">
                          <Input
                            type="number"
                            value={ing.abv}
                            onChange={(e) =>
                              updateIngredient(idx, "abv", Number(e.target.value))
                            }
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-2.5 py-2">
                          <select
                            value={ing.type}
                            onChange={(e) =>
                              updateIngredient(idx, "type", e.target.value)
                            }
                            className="h-8 w-full rounded-lg bg-background border border-input px-2 text-xs"
                          >
                            {ingredientTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2.5 py-2 rounded-r-lg">
                          <Button
                            onClick={() => removeIngredient(idx)}
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 mt-2">
                <Button onClick={addIngredient} size="sm" className="text-xs">
                  + Add
                </Button>
                <Button
                  onClick={clearIngredients}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* SOP Steps */}
            <div className="bg-[#171a21] border border-[#232836] rounded-xl p-3">
              <h2 className="text-[#d4af37] text-sm font-semibold mb-2.5 tracking-wide">
                SOP Steps
              </h2>
              <Textarea
                value={sopSteps}
                onChange={(e) => setSopSteps(e.target.value)}
                placeholder="Enter preparation steps..."
                className="min-h-[120px]"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            {/* Graphics */}
            <div className="bg-[#171a21] border border-[#232836] rounded-xl p-3">
              <h2 className="text-[#d4af37] text-sm font-semibold mb-2.5 tracking-wide">
                Graphics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <canvas ref={radarChartRef} className="w-full h-80" />
                </div>
                <div>
                  <canvas ref={barChartRef} className="w-full h-80" />
                </div>
              </div>
            </div>

            {/* Taste Profile Sliders */}
            <div className="bg-[#171a21] border border-[#232836] rounded-xl p-3">
              <h2 className="text-[#d4af37] text-sm font-semibold mb-2.5 tracking-wide">
                Taste Profile
              </h2>
              <div className="space-y-3">
                {(["sweet", "sour", "bitter", "salty", "umami"] as const).map(
                  (taste) => (
                    <div key={taste}>
                      <div className="flex justify-between text-xs mb-1">
                        <Label className="text-[#a7acb9] capitalize">{taste}</Label>
                        <span className="text-[#e6e8ef]">
                          {tasteProfile[taste]}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={tasteProfile[taste]}
                        onChange={(e) =>
                          setTasteProfile({
                            ...tasteProfile,
                            [taste]: Number(e.target.value),
                          })
                        }
                        className="w-full h-2 bg-[#0e1117] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
                      />
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Summary Metrics */}
            <div className="bg-[#171a21] border border-[#232836] rounded-xl p-3">
              <h2 className="text-[#d4af37] text-sm font-semibold mb-2.5 tracking-wide">
                Summary
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="bg-[#0e1117] border border-[#2a3040] rounded-lg p-2.5">
                  <div className="text-xs text-[#a7acb9] mb-1">Total Volume</div>
                  <div className="text-lg font-semibold">{totalVolume} ml</div>
                </div>
                <div className="bg-[#0e1117] border border-[#2a3040] rounded-lg p-2.5">
                  <div className="text-xs text-[#a7acb9] mb-1">ABV</div>
                  <div className="text-lg font-semibold">{abv.toFixed(1)}%</div>
                </div>
                <div className="bg-[#0e1117] border border-[#2a3040] rounded-lg p-2.5">
                  <div className="text-xs text-[#a7acb9] mb-1">Calories (est.)</div>
                  <div className="text-lg font-semibold">{estimatedCalories}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bible View */}
      {currentView === "bible" && (
        <div className="p-3 max-w-5xl mx-auto space-y-3">
          <div className="bg-[#171a21] border border-[#232836] rounded-xl p-4">
            <h1 className="text-2xl font-bold text-[#d4af37] mb-4">{drinkName || "Untitled Cocktail"}</h1>
            
            {mainImage && (
              <img
                src={mainImage}
                alt={drinkName}
                className="w-full max-w-md mx-auto rounded-lg border border-[#2a3040] mb-4"
              />
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <h3 className="text-[#d4af37] font-semibold mb-2">Details</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-[#a7acb9]">Technique:</span> {technique}</p>
                  <p><span className="text-[#a7acb9]">Glass:</span> {glass}</p>
                  <p><span className="text-[#a7acb9]">Ice:</span> {ice}</p>
                  <p><span className="text-[#a7acb9]">Garnish:</span> {garnish}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-[#d4af37] font-semibold mb-2">Metrics</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-[#a7acb9]">Volume:</span> {totalVolume} ml</p>
                  <p><span className="text-[#a7acb9]">ABV:</span> {abv.toFixed(1)}%</p>
                  <p><span className="text-[#a7acb9]">Est. Calories:</span> {estimatedCalories}</p>
                  <p><span className="text-[#a7acb9]">Std. Drinks:</span> {standardDrinks.toFixed(1)}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-[#d4af37] font-semibold mb-2">Recipe</h3>
              <div className="space-y-1 text-sm">
                {ingredients.map((ing, idx) => (
                  <p key={idx}>
                    • {ing.amount} {ing.unit} {ing.name} ({ing.abv}% ABV)
                  </p>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-[#d4af37] font-semibold mb-2">Preparation</h3>
              <p className="text-sm whitespace-pre-line">{sopSteps}</p>
            </div>

            {serviceNotes && (
              <div>
                <h3 className="text-[#d4af37] font-semibold mb-2">Service Notes</h3>
                <p className="text-sm">{serviceNotes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
