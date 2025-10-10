import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Spirit {
  id: string;
  name: string;
  volume: string;
  abv: string;
}

const ABVCalculator = () => {
  const navigate = useNavigate();
  const [cocktailName, setCocktailName] = useState("");
  const [spirits, setSpirits] = useState<Spirit[]>([
    { id: "1", name: "", volume: "", abv: "" }
  ]);

  const addSpirit = () => {
    setSpirits([
      ...spirits,
      { id: Date.now().toString(), name: "", volume: "", abv: "" }
    ]);
  };

  const removeSpirit = (id: string) => {
    if (spirits.length > 1) {
      setSpirits(spirits.filter(s => s.id !== id));
    }
  };

  const updateSpirit = (id: string, field: keyof Spirit, value: string) => {
    setSpirits(spirits.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const calculateABV = () => {
    const validSpirits = spirits.filter(s => s.volume && s.abv);
    if (validSpirits.length === 0) return null;

    const totalVolume = validSpirits.reduce((sum, s) => sum + parseFloat(s.volume), 0);
    const totalAlcohol = validSpirits.reduce((sum, s) => 
      sum + (parseFloat(s.volume) * parseFloat(s.abv) / 100), 0
    );

    const finalABV = (totalAlcohol / totalVolume) * 100;
    return {
      totalVolume,
      totalAlcohol,
      finalABV: finalABV.toFixed(2)
    };
  };

  const result = calculateABV();

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/ops-tools")}
            className="glass-hover"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">ABV Calculator</h1>
            <p className="text-sm text-muted-foreground">Calculate alcohol by volume</p>
          </div>
        </div>

        <Card className="glass p-6 space-y-6">
          <div className="space-y-2">
            <Label>Cocktail Name</Label>
            <Input
              value={cocktailName}
              onChange={(e) => setCocktailName(e.target.value)}
              placeholder="e.g., Negroni"
              className="glass"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Ingredients with Alcohol</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addSpirit}
                className="glass-hover"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>

            {spirits.map((spirit) => (
              <div key={spirit.id} className="flex gap-2">
                <Input
                  value={spirit.name}
                  onChange={(e) => updateSpirit(spirit.id, "name", e.target.value)}
                  placeholder="Spirit name"
                  className="glass flex-1"
                />
                <Input
                  type="number"
                  value={spirit.volume}
                  onChange={(e) => updateSpirit(spirit.id, "volume", e.target.value)}
                  placeholder="Volume (ml)"
                  className="glass w-28"
                />
                <Input
                  type="number"
                  value={spirit.abv}
                  onChange={(e) => updateSpirit(spirit.id, "abv", e.target.value)}
                  placeholder="ABV %"
                  className="glass w-24"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSpirit(spirit.id)}
                  disabled={spirits.length === 1}
                  className="glass-hover"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {result && cocktailName && (
          <Card className="glass p-6 space-y-4">
            <h3 className="font-bold text-lg">Results</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-muted-foreground">Total Volume</span>
                <span className="font-bold">{result.totalVolume.toFixed(2)} ml</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-muted-foreground">Pure Alcohol</span>
                <span className="font-bold">{result.totalAlcohol.toFixed(2)} ml</span>
              </div>
              <div className="flex justify-between items-center py-4">
                <span className="text-lg font-medium">Final ABV</span>
                <span className="text-3xl font-bold text-primary">{result.finalABV}%</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ABVCalculator;
