import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Wine, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CocktailSpec {
  id: string;
  name: string;
  ingredients: any;
  glassware: string;
  technique: string;
  garnish: string;
  created_at: string;
}

const CocktailSpecs = () => {
  const navigate = useNavigate();
  const [specs, setSpecs] = useState<CocktailSpec[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [viewSpec, setViewSpec] = useState<CocktailSpec | null>(null);
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [glassware, setGlassware] = useState("");
  const [technique, setTechnique] = useState("");
  const [garnish, setGarnish] = useState("");

  useEffect(() => {
    fetchSpecs();
  }, []);

  const fetchSpecs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setSpecs(data as any);
  };

  const handleSaveSpec = async () => {
    if (!name || !ingredients) {
      toast.error("Please fill in cocktail name and ingredients");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const specData = {
      user_id: user.id,
      name,
      ingredients: {
        list: ingredients.split("\n").map(i => i.trim()).filter(Boolean),
        glassware,
        technique,
        garnish
      },
      instructions: `${technique}\n\nGlassware: ${glassware}\nGarnish: ${garnish}`
    };

    const { error } = await supabase
      .from("recipes")
      .insert(specData);

    if (error) {
      toast.error("Failed to save spec");
    } else {
      toast.success("Cocktail spec saved!");
      resetForm();
      setIsOpen(false);
      fetchSpecs();
    }
  };

  const resetForm = () => {
    setName("");
    setIngredients("");
    setGlassware("");
    setTechnique("");
    setGarnish("");
  };

  const handleDeleteSpec = async (id: string) => {
    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete spec");
    } else {
      toast.success("Spec deleted");
      fetchSpecs();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
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
              <h1 className="text-2xl font-bold">Cocktail Specs</h1>
              <p className="text-sm text-muted-foreground">Standardized specifications</p>
            </div>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="glass-hover">
                <Plus className="w-4 h-4 mr-2" />
                New Spec
              </Button>
            </DialogTrigger>
            <DialogContent className="glass max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Cocktail Specification</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cocktail Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., House Martini"
                    className="glass"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ingredients (one per line with measurements)</Label>
                  <Textarea
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    placeholder="60ml Gin&#10;10ml Dry Vermouth&#10;2 dash Orange Bitters"
                    className="glass min-h-32"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Glassware</Label>
                  <Input
                    value={glassware}
                    onChange={(e) => setGlassware(e.target.value)}
                    placeholder="e.g., Coupe, Chilled"
                    className="glass"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Technique</Label>
                  <Textarea
                    value={technique}
                    onChange={(e) => setTechnique(e.target.value)}
                    placeholder="e.g., Stir with ice for 30 seconds, strain into chilled coupe"
                    className="glass"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Garnish</Label>
                  <Input
                    value={garnish}
                    onChange={(e) => setGarnish(e.target.value)}
                    placeholder="e.g., Lemon twist, expressed and discarded"
                    className="glass"
                  />
                </div>
                <Button onClick={handleSaveSpec} className="w-full">
                  Save Specification
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {specs.length === 0 ? (
          <Card className="glass p-12 text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Wine className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">No Specs Yet</h3>
              <p className="text-muted-foreground text-sm">
                Create standardized cocktail specifications
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {specs.map((spec) => (
              <Card key={spec.id} className="glass p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold">{spec.name}</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewSpec(spec)}
                      className="glass-hover"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSpec(spec.id)}
                      className="glass-hover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {typeof spec.ingredients === 'object' && spec.ingredients.glassware && (
                    <p>Glassware: {spec.ingredients.glassware}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {viewSpec && (
          <Dialog open={!!viewSpec} onOpenChange={() => setViewSpec(null)}>
            <DialogContent className="glass max-w-2xl">
              <DialogHeader>
                <DialogTitle>{viewSpec.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Ingredients:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {(viewSpec.ingredients?.list || []).map((ing: string, idx: number) => (
                      <li key={idx} className="text-sm">{ing}</li>
                    ))}
                  </ul>
                </div>
                {viewSpec.ingredients?.glassware && (
                  <div>
                    <h4 className="font-semibold mb-2">Glassware:</h4>
                    <p className="text-sm">{viewSpec.ingredients.glassware}</p>
                  </div>
                )}
                {viewSpec.ingredients?.technique && (
                  <div>
                    <h4 className="font-semibold mb-2">Technique:</h4>
                    <p className="text-sm">{viewSpec.ingredients.technique}</p>
                  </div>
                )}
                {viewSpec.ingredients?.garnish && (
                  <div>
                    <h4 className="font-semibold mb-2">Garnish:</h4>
                    <p className="text-sm">{viewSpec.ingredients.garnish}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default CocktailSpecs;
