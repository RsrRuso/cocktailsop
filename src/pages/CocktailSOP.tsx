import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

interface Ingredient {
  id: string;
  name: string;
  ml: number;
  type: string;
  abv: number;
  notes: string;
}

interface TasteProfile {
  sweet: number;
  sour: number;
  bitter: number;
  umami: number;
  salty: number;
}

export default function CocktailSOP() {
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
  const [author, setAuthor] = useState("");
  const [batchSize, setBatchSize] = useState(1);
  
  // Images
  const [mainImage, setMainImage] = useState("");
  const [extraImages, setExtraImages] = useState<string[]>([]);
  
  // Recipe
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [dilutionPct, setDilutionPct] = useState(15);
  const [stdGrams, setStdGrams] = useState(10);
  const [brix, setBrix] = useState<number | null>(null);
  
  // SOP
  const [sop, setSop] = useState("");
  
  // Taste Profile
  const [tasteProfile, setTasteProfile] = useState<TasteProfile>({
    sweet: 5,
    sour: 5,
    bitter: 5,
    umami: 5,
    salty: 5,
  });
  
  // Refs for charts
  const radarRef = useRef<HTMLCanvasElement>(null);
  const tasteBarRef = useRef<HTMLCanvasElement>(null);
  const radarOutRef = useRef<HTMLCanvasElement>(null);
  const tasteBarOutRef = useRef<HTMLCanvasElement>(null);
  
  const radarChartRef = useRef<Chart | null>(null);
  const tasteBarChartRef = useRef<Chart | null>(null);
  const radarOutChartRef = useRef<Chart | null>(null);
  const tasteBarOutChartRef = useRef<Chart | null>(null);

  const ingredientTypes = [
    "Spirit",
    "Fortified",
    "Liqueur",
    "Wine/Beer",
    "Mixer/NA",
    "Citrus",
    "Syrup",
    "Bitters",
    "Tincture",
    "Other",
  ];

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Calculations
  const totalMl = ingredients.reduce((sum, ing) => sum + (ing.ml || 0), 0);
  const pureMl = ingredients.reduce((sum, ing) => sum + (ing.ml || 0) * (ing.abv || 0) / 100, 0);
  const pureG = pureMl * 0.789;
  const drinkAbv = totalMl > 0 ? (pureMl / totalMl) * 100 : 0;
  const stdDrinks = pureG / stdGrams;
  const totalOz = totalMl * 0.033814;
  const caloriesEst = pureG * 7;

  // Draw charts
  useEffect(() => {
    drawCharts();
  }, [tasteProfile, ingredients]);

  const drawCharts = () => {
    // Radar Chart
    const drawRadar = (canvasRef: React.RefObject<HTMLCanvasElement>, chartRef: React.MutableRefObject<Chart | null>) => {
      if (!canvasRef.current) return;
      
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      chartRef.current = new Chart(ctx, {
        type: "radar",
        data: {
          labels: ["Sweet", "Sour", "Bitter", "Umami", "Salty"],
          datasets: [{
            label: "Taste Profile",
            data: [
              tasteProfile.sweet,
              tasteProfile.sour,
              tasteProfile.bitter,
              tasteProfile.umami,
              tasteProfile.salty,
            ],
            backgroundColor: "rgba(212, 175, 55, 0.2)",
            borderColor: "#d4af37",
            borderWidth: 2,
            pointBackgroundColor: "#d4af37",
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            r: {
              min: 0,
              max: 10,
              ticks: { stepSize: 2, color: "#a7acb9" },
              grid: { color: "#2a3040" },
              pointLabels: { color: "#a7acb9", font: { size: 12 } },
            },
          },
          plugins: {
            legend: { display: false },
          },
        },
      });
    };

    // Taste Bars
    const drawTasteBars = (canvasRef: React.RefObject<HTMLCanvasElement>, chartRef: React.MutableRefObject<Chart | null>) => {
      if (!canvasRef.current) return;
      
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      chartRef.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Sweet", "Sour", "Bitter", "Umami", "Salty"],
          datasets: [{
            label: "Intensity",
            data: [
              tasteProfile.sweet,
              tasteProfile.sour,
              tasteProfile.bitter,
              tasteProfile.umami,
              tasteProfile.salty,
            ],
            backgroundColor: "#d4af37",
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            y: {
              min: 0,
              max: 10,
              ticks: { color: "#a7acb9" },
              grid: { color: "#2a3040" },
            },
            x: {
              ticks: { color: "#a7acb9" },
              grid: { display: false },
            },
          },
          plugins: {
            legend: { display: false },
          },
        },
      });
    };

    drawRadar(radarRef, radarChartRef);
    drawTasteBars(tasteBarRef, tasteBarChartRef);
    
    if (currentView === "bible") {
      drawRadar(radarOutRef, radarOutChartRef);
      drawTasteBars(tasteBarOutRef, tasteBarOutChartRef);
    }
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: "",
        ml: 0,
        type: "Spirit",
        abv: 0,
        notes: "",
      },
    ]);
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter((ing) => ing.id !== id));
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    setIngredients(
      ingredients.map((ing) =>
        ing.id === id ? { ...ing, [field]: value } : ing
      )
    );
  };

  const clearIngredients = () => {
    setIngredients([]);
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setMainImage(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExtraImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const readers = files.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          resolve(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    const images = await Promise.all(readers);
    setExtraImages([...extraImages, ...images]);
  };

  const saveSOP = async () => {
    if (!user) return;

    try {
      const sopData = {
        user_id: user.id,
        drink_name: drinkName,
        technique,
        glass,
        ice,
        garnish: garnish,
        main_image: mainImage,
        method_sop: sop,
        recipe: ingredients,
        total_ml: totalMl,
        abv_percentage: drinkAbv,
        taste_profile: tasteProfile,
        taste_sweet: tasteProfile.sweet,
        taste_sour: tasteProfile.sour,
        taste_bitter: tasteProfile.bitter,
        taste_umami: tasteProfile.umami,
        taste_salty: tasteProfile.salty,
        service_notes: serviceNotes,
        batch_size: batchSize,
        brix,
      };

      const { error } = await supabase.from("cocktail_sops").insert([sopData]);

      if (error) throw error;

      toast.success("Cocktail SOP saved successfully!");
    } catch (error: any) {
      console.error("Error saving SOP:", error);
      toast.error("Failed to save SOP");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-[#e6e8ef]">
      <header className="sticky top-0 z-20 bg-gradient-to-b from-[#0b0d12] to-[#0f1115] px-3 py-2.5 border-b border-[#202536] flex gap-2.5 items-center">
        <div className="flex items-center gap-2.5">
          <div className="text-[#d4af37] font-bold tracking-wide">Cocktail SOP & Bible</div>
        </div>
        <div className="flex-1" />
        <Button
          onClick={() => setCurrentView("editor")}
          className={`${
            currentView === "editor"
              ? "bg-[#2a2f3a] text-[#e6e8ef]"
              : "bg-transparent text-[#e6e8ef]"
          } border border-[#2f3643] rounded-lg px-3.5 py-2.5`}
        >
          Input Page
        </Button>
        <Button
          onClick={() => setCurrentView("bible")}
          className={`${
            currentView === "bible"
              ? "bg-[#2a2f3a] text-[#e6e8ef]"
              : "bg-transparent text-[#e6e8ef]"
          } border border-[#2f3643] rounded-lg px-3.5 py-2.5`}
        >
          Cocktail Bible
        </Button>
        <Button
          onClick={saveSOP}
          className="bg-[#d4af37] text-[#0f1115] hover:bg-[#c9a332] rounded-lg px-3.5 py-2.5"
        >
          Save SOP
        </Button>
      </header>

      {/* INPUT PAGE */}
      {currentView === "editor" && (
        <div className="p-3 grid gap-3">
          {/* Identity & Service */}
          <section className="bg-[#171a21] border border-[#232836] rounded-[14px] p-3">
            <h2 className="text-[15px] text-[#d4af37] font-semibold tracking-wide mb-2.5">
              Identity & Service
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 mb-2.5">
              <div>
                <label className="text-xs text-[#a7acb9] block mb-1">Drink Name</label>
                <Input
                  value={drinkName}
                  onChange={(e) => setDrinkName(e.target.value)}
                  placeholder="e.g., Signature Highball"
                  className="bg-[#0e1117] border-[#2a3040] text-[#e6e8ef] rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-[#a7acb9] block mb-1">Technique</label>
                <Input
                  value={technique}
                  onChange={(e) => setTechnique(e.target.value)}
                  placeholder="Stirred / Shaken / Built"
                  className="bg-[#0e1117] border-[#2a3040] text-[#e6e8ef] rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-[#a7acb9] block mb-1">Glass</label>
                <Input
                  value={glass}
                  onChange={(e) => setGlass(e.target.value)}
                  placeholder="Nick & Nora"
                  className="bg-[#0e1117] border-[#2a3040] text-[#e6e8ef] rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-[#a7acb9] block mb-1">Ice Type</label>
                <Input
                  value={ice}
                  onChange={(e) => setIce(e.target.value)}
                  placeholder="Large clear cube"
                  className="bg-[#0e1117] border-[#2a3040] text-[#e6e8ef] rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
              <div>
                <label className="text-xs text-[#a7acb9] block mb-1">Garnish</label>
                <Input
                  value={garnish}
                  onChange={(e) => setGarnish(e.target.value)}
                  placeholder="Orange coin, expressed"
                  className="bg-[#0e1117] border-[#2a3040] text-[#e6e8ef] rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-[#a7acb9] block mb-1">Service Notes</label>
                <Input
                  value={serviceNotes}
                  onChange={(e) => setServiceNotes(e.target.value)}
                  placeholder="Pre-chill glass; atomize table-side"
                  className="bg-[#0e1117] border-[#2a3040] text-[#e6e8ef] rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-[#a7acb9] block mb-1">Author</label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Your Name / Team"
                  className="bg-[#0e1117] border-[#2a3040] text-[#e6e8ef] rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-[#a7acb9] block mb-1">Batch Size</label>
                <Input
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  min={1}
                  className="bg-[#0e1117] border-[#2a3040] text-[#e6e8ef] rounded-xl"
                />
              </div>
            </div>
          </section>

          {/* Images */}
          <section className="bg-[#171a21] border border-[#232836] rounded-[14px] p-3">
            <h2 className="text-[15px] text-[#d4af37] font-semibold tracking-wide mb-2.5">
              Images
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <Button
                  onClick={() => document.getElementById("fileMain")?.click()}
                  variant="ghost"
                  className="w-full border border-[#364057] mb-2"
                >
                  Upload main cocktail image
                </Button>
                <input
                  id="fileMain"
                  type="file"
                  accept="image/*"
                  onChange={handleMainImageUpload}
                  className="hidden"
                />
                {mainImage && (
                  <img
                    src={mainImage}
                    alt="Main"
                    className="w-[180px] rounded-lg border border-[#2a3040]"
                  />
                )}
              </div>
              <div>
                <Button
                  onClick={() => document.getElementById("fileExtra")?.click()}
                  variant="ghost"
                  className="w-full border border-[#364057] mb-2"
                >
                  Upload extra images
                </Button>
                <input
                  id="fileExtra"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleExtraImagesUpload}
                  className="hidden"
                />
                <div className="flex gap-2 flex-wrap">
                  {extraImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Extra ${idx}`}
                      className="w-[100px] rounded-lg border border-[#2a3040]"
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Recipe */}
          <section className="bg-[#171a21] border border-[#232836] rounded-[14px] p-3">
            <h2 className="text-[15px] text-[#d4af37] font-semibold tracking-wide mb-2.5">
              Recipe — Specs (ml only)
            </h2>
            <p className="text-xs text-[#a7acb9] mb-3">
              Use Type + %ABV for correct alcohol math. Non-alcoholic: choose Mixer/NA, Citrus, Syrup.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-[#a7acb9] font-semibold text-sm">
                    <th className="text-left p-2">Ingredient</th>
                    <th className="text-left p-2">ml</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">%ABV</th>
                    <th className="text-left p-2">Prep / Notes</th>
                    <th className="text-left p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing) => (
                    <tr key={ing.id} className="bg-[#0e1117] border border-[#2a3040]">
                      <td className="p-2 rounded-l-lg">
                        <Input
                          value={ing.name}
                          onChange={(e) => updateIngredient(ing.id, "name", e.target.value)}
                          placeholder="Ingredient name"
                          className="bg-transparent border-0 p-1"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={ing.ml}
                          onChange={(e) => updateIngredient(ing.id, "ml", Number(e.target.value))}
                          className="bg-transparent border-0 p-1 w-16"
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={ing.type}
                          onValueChange={(value) => updateIngredient(ing.id, "type", value)}
                        >
                          <SelectTrigger className="bg-transparent border-0 p-1 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ingredientTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={ing.abv}
                          onChange={(e) => updateIngredient(ing.id, "abv", Number(e.target.value))}
                          className="bg-transparent border-0 p-1 w-16"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={ing.notes}
                          onChange={(e) => updateIngredient(ing.id, "notes", e.target.value)}
                          placeholder="Notes"
                          className="bg-transparent border-0 p-1"
                        />
                      </td>
                      <td className="p-2 rounded-r-lg">
                        <Button
                          onClick={() => removeIngredient(ing.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Button
                onClick={addIngredient}
                className="bg-[#121622] border border-[#2a3040] text-[#e9ecf4] text-sm"
              >
                + Add Ingredient
              </Button>
              <Button
                onClick={clearIngredients}
                variant="ghost"
                className="bg-[#121622] border border-[#2a3040] text-[#e9ecf4] text-sm"
              >
                Clear
              </Button>
            </div>

            {/* Metrics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
              <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                <div className="text-xs text-[#a7acb9] mb-1">Total Volume</div>
                <div className="text-lg">
                  {totalMl.toFixed(0)} ml · {totalOz.toFixed(2)} oz
                </div>
              </div>
              <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                <div className="text-xs text-[#a7acb9] mb-1">Pure Alcohol</div>
                <div className="text-lg">
                  {pureMl.toFixed(1)} ml · {pureG.toFixed(1)} g
                </div>
              </div>
              <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                <div className="text-xs text-[#a7acb9] mb-1">Est. Cocktail %ABV</div>
                <div className="text-lg">{drinkAbv.toFixed(1)}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
              <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                <label className="text-xs text-[#a7acb9] block mb-1">Dilution %</label>
                <Input
                  type="number"
                  value={dilutionPct}
                  onChange={(e) => setDilutionPct(Number(e.target.value))}
                  className="bg-transparent border-0 p-1"
                />
              </div>
              <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                <label className="text-xs text-[#a7acb9] block mb-1">Std Drinks (g per drink)</label>
                <Input
                  type="number"
                  value={stdGrams}
                  onChange={(e) => setStdGrams(Number(e.target.value))}
                  className="bg-transparent border-0 p-1 w-24 mb-1"
                />
                <div className="text-lg mt-1.5">{stdDrinks.toFixed(2)} drinks</div>
              </div>
              <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                <label className="text-xs text-[#a7acb9] block mb-1">Measured Brix</label>
                <Input
                  type="number"
                  step={0.1}
                  value={brix || ""}
                  onChange={(e) => setBrix(e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g., 12.5"
                  className="bg-transparent border-0 p-1"
                />
              </div>
            </div>
          </section>

          {/* SOP Steps */}
          <section className="bg-[#171a21] border border-[#232836] rounded-[14px] p-3">
            <h2 className="text-[15px] text-[#d4af37] font-semibold tracking-wide mb-2.5">
              SOP — Steps
            </h2>
            <Textarea
              value={sop}
              onChange={(e) => setSop(e.target.value)}
              placeholder="1) Chill glass.&#10;2) Add ingredients...&#10;3) Shake 12s...&#10;4) Double strain..."
              className="min-h-[90px] bg-[#0e1117] border-[#2a3040] text-[#e6e8ef] rounded-xl resize-y"
            />
          </section>

          {/* Graphics */}
          <section className="bg-[#171a21] border border-[#232836] rounded-[14px] p-3">
            <h2 className="text-[15px] text-[#d4af37] font-semibold tracking-wide mb-2.5">
              Graphics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <canvas ref={radarRef} className="w-full h-[320px] bg-[#0e1117] border border-[#2a3040] rounded-xl p-1" />
              <canvas ref={tasteBarRef} className="w-full h-[320px] bg-[#0e1117] border border-[#2a3040] rounded-xl p-1" />
            </div>
          </section>

          {/* Taste Profile Sliders */}
          <section className="bg-[#171a21] border border-[#232836] rounded-[14px] p-3">
            <h2 className="text-[15px] text-[#d4af37] font-semibold tracking-wide mb-2.5">
              Taste Profile (0-10)
            </h2>
            {(["sweet", "sour", "bitter", "umami", "salty"] as const).map((taste) => (
              <div key={taste} className="mb-3">
                <label className="text-sm text-[#a7acb9] capitalize block mb-1">
                  {taste}: {tasteProfile[taste]}
                </label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={tasteProfile[taste]}
                  onChange={(e) =>
                    setTasteProfile({ ...tasteProfile, [taste]: Number(e.target.value) })
                  }
                  className="w-full h-2 bg-[#2a3040] rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
                />
              </div>
            ))}
          </section>
        </div>
      )}

      {/* COCKTAIL BIBLE PAGE */}
      {currentView === "bible" && (
        <div className="p-3 grid gap-3">
          {/* Header & Identity */}
          <section className="bg-[#171a21] border border-[#232836] rounded-[14px] p-3">
            <h1 className="text-2xl text-[#d4af37] font-bold mb-4">{drinkName || "Untitled Cocktail"}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                    <div className="text-xs text-[#a7acb9] mb-1">Technique</div>
                    <div className="text-sm">{technique || "—"}</div>
                  </div>
                  <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                    <div className="text-xs text-[#a7acb9] mb-1">Glass</div>
                    <div className="text-sm">{glass || "—"}</div>
                  </div>
                  <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                    <div className="text-xs text-[#a7acb9] mb-1">Ice</div>
                    <div className="text-sm">{ice || "—"}</div>
                  </div>
                  <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                    <div className="text-xs text-[#a7acb9] mb-1">Garnish</div>
                    <div className="text-sm">{garnish || "—"}</div>
                  </div>
                  <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                    <div className="text-xs text-[#a7acb9] mb-1">Author</div>
                    <div className="text-sm">{author || "—"}</div>
                  </div>
                  <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                    <div className="text-xs text-[#a7acb9] mb-1">Batch</div>
                    <div className="text-sm">{batchSize}</div>
                  </div>
                </div>
                <div className="mt-2.5">
                  <b className="text-sm">Service Notes:</b> <span className="text-sm">{serviceNotes || "—"}</span>
                </div>
              </div>
              <div>
                {mainImage && (
                  <img
                    src={mainImage}
                    alt="Cocktail"
                    className="w-full rounded-xl border border-[#2a3040] bg-[#0e1117] aspect-[4/3] object-cover"
                  />
                )}
                <div className="flex gap-2 flex-wrap mt-2">
                  {extraImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Extra ${idx}`}
                      className="w-[80px] rounded-lg border border-[#2a3040]"
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Recipe & Metrics */}
          <section className="bg-[#171a21] border border-[#232836] rounded-[14px] p-3 grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-4">
            <div>
              <h2 className="text-[15px] text-[#d4af37] font-semibold tracking-wide mb-2.5">
                Recipe (ml)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-[#a7acb9] font-semibold text-sm">
                      <th className="text-left p-2">Ingredient</th>
                      <th className="text-left p-2">ml</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">%ABV</th>
                      <th className="text-left p-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map((ing) => (
                      <tr key={ing.id} className="bg-[#0e1117] text-sm">
                        <td className="p-2 rounded-l-lg">{ing.name}</td>
                        <td className="p-2">{ing.ml}</td>
                        <td className="p-2">{ing.type}</td>
                        <td className="p-2">{ing.abv}</td>
                        <td className="p-2 rounded-r-lg">{ing.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h2 className="text-[15px] text-[#d4af37] font-semibold tracking-wide mb-2.5">
                Metrics
              </h2>
              <div className="grid grid-cols-1 gap-2">
                <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                  <div className="text-xs text-[#a7acb9] mb-1">Total Volume</div>
                  <div className="text-lg">
                    {totalMl.toFixed(0)} ml · {totalOz.toFixed(2)} oz
                  </div>
                </div>
                <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                  <div className="text-xs text-[#a7acb9] mb-1">Pure Alcohol</div>
                  <div className="text-lg">
                    {pureMl.toFixed(1)} ml · {pureG.toFixed(1)} g
                  </div>
                </div>
                <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                  <div className="text-xs text-[#a7acb9] mb-1">Estimated %ABV</div>
                  <div className="text-lg">{drinkAbv.toFixed(1)}%</div>
                </div>
                <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                  <div className="text-xs text-[#a7acb9] mb-1">Dilution %</div>
                  <div className="text-lg">{dilutionPct}%</div>
                </div>
                <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                  <div className="text-xs text-[#a7acb9] mb-1">Calories (est.)</div>
                  <div className="text-lg">{caloriesEst.toFixed(0)} kcal</div>
                  <div className="text-xs text-[#a7acb9] mt-1">Alcohol-only estimate ≈ 7 kcal/g</div>
                </div>
                <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                  <div className="text-xs text-[#a7acb9] mb-1">Measured Brix</div>
                  <div className="text-lg">{brix !== null ? brix : "—"}</div>
                </div>
                <div className="bg-[#0e1117] border border-[#2a3040] rounded-xl p-2.5">
                  <div className="text-xs text-[#a7acb9] mb-1">Std Drinks</div>
                  <div className="text-lg">{stdDrinks.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Method (SOP) */}
          <section className="bg-[#171a21] border border-[#232836] rounded-[14px] p-3">
            <h2 className="text-[15px] text-[#d4af37] font-semibold tracking-wide mb-2.5">
              Method (SOP)
            </h2>
            <div className="whitespace-pre-wrap leading-relaxed">{sop || "No method specified"}</div>
          </section>

          {/* Graphics */}
          <section className="bg-[#171a21] border border-[#232836] rounded-[14px] p-3">
            <h2 className="text-[15px] text-[#d4af37] font-semibold tracking-wide mb-2.5">
              Graphics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <canvas ref={radarOutRef} className="w-full h-[320px] bg-[#0e1117] border border-[#2a3040] rounded-xl p-1" />
              <canvas ref={tasteBarOutRef} className="w-full h-[320px] bg-[#0e1117] border border-[#2a3040] rounded-xl p-1" />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
