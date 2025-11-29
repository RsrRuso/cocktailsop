import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const BatchQRSubmit = () => {
  const { qrId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [producedByName, setProducedByName] = useState("");
  const [targetLiters, setTargetLiters] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadQRData();
  }, [qrId]);

  const loadQRData = async () => {
    try {
      const { data, error } = await supabase
        .from("batch_qr_codes")
        .select("*")
        .eq("id", qrId)
        .single();

      if (error) throw error;

      if (!data || !data.is_active) {
        toast.error("Invalid or inactive QR code");
        return;
      }

      setQrData(data);
    } catch (error) {
      console.error("Error loading QR data:", error);
      toast.error("Failed to load batch information");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!producedByName || !targetLiters) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const recipe = qrData.recipe_data;
      const liters = parseFloat(targetLiters);
      const multiplier = (liters * 1000) / recipe.ingredients.reduce(
        (sum: number, ing: any) => sum + parseFloat(ing.amount || 0),
        0
      );

      const scaledIngredients = recipe.ingredients.map((ing: any) => ({
        ingredient_name: ing.name,
        original_amount: parseFloat(ing.amount),
        scaled_amount: parseFloat(ing.amount) * multiplier,
        unit: ing.unit,
      }));

      const actualServings = parseFloat(recipe.current_serves) * multiplier;

      const qrCodeData = JSON.stringify({
        batchName: recipe.recipe_name,
        date: new Date().toISOString(),
        liters: liters.toFixed(2),
        servings: Math.round(actualServings),
        producedBy: producedByName,
        ingredients: scaledIngredients,
      });

      const { data: production, error: prodError } = await supabase
        .from("batch_productions")
        .insert({
          recipe_id: qrData.recipe_id,
          batch_name: recipe.recipe_name,
          target_serves: Math.round(actualServings),
          target_liters: liters,
          production_date: new Date().toISOString(),
          produced_by_name: producedByName,
          produced_by_email: null,
          produced_by_user_id: null,
          qr_code_data: qrCodeData,
          notes: notes,
          group_id: qrData.group_id,
          user_id: qrData.user_id,
        })
        .select()
        .single();

      if (prodError) throw prodError;

      const ingredientsToInsert = scaledIngredients.map((ing) => ({
        production_id: production.id,
        ...ing,
      }));

      const { error: ingError } = await supabase
        .from("batch_production_ingredients")
        .insert(ingredientsToInsert);

      if (ingError) throw ingError;

      toast.success("Batch production submitted successfully!");
      setProducedByName("");
      setTargetLiters("");
      setNotes("");
    } catch (error) {
      console.error("Error submitting batch:", error);
      toast.error("Failed to submit batch production");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading batch information...</p>
        </div>
      </div>
    );
  }

  if (!qrData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="glass p-6 max-w-md w-full text-center">
          <p className="text-muted-foreground mb-4">Invalid QR code</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  const recipe = qrData.recipe_data;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="glass-hover"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Submit Batch Production</h1>
            <p className="text-sm text-muted-foreground">
              {recipe.recipe_name}
            </p>
          </div>
        </div>

        <Card className="glass p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Recipe Details</h3>
            {recipe.description && (
              <p className="text-sm text-muted-foreground">{recipe.description}</p>
            )}
            <div className="glass p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Ingredients:</p>
              {recipe.ingredients.map((ing: any, idx: number) => (
                <div key={idx} className="text-sm text-muted-foreground flex justify-between">
                  <span>{ing.name}</span>
                  <span className="font-medium">
                    {ing.amount} {ing.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your Name *</Label>
              <Input
                value={producedByName}
                onChange={(e) => setProducedByName(e.target.value)}
                placeholder="Who is producing this batch?"
                className="glass"
              />
            </div>

            <div className="space-y-2">
              <Label>Target Liters *</Label>
              <Input
                type="number"
                step="0.1"
                value={targetLiters}
                onChange={(e) => setTargetLiters(e.target.value)}
                placeholder="e.g., 1.5"
                className="glass"
              />
              <p className="text-xs text-muted-foreground">
                How many liters are you producing?
              </p>
            </div>

            {targetLiters && (
              <div className="glass p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Scaled Ingredients:</p>
                <div className="space-y-1">
                  {recipe.ingredients.map((ing: any, idx: number) => {
                    const multiplier =
                      (parseFloat(targetLiters) * 1000) /
                      recipe.ingredients.reduce(
                        (sum: number, i: any) => sum + parseFloat(i.amount || 0),
                        0
                      );
                    const scaled = (parseFloat(ing.amount) * multiplier).toFixed(2);
                    return (
                      <div
                        key={idx}
                        className="text-sm flex justify-between items-center py-1"
                      >
                        <span>{ing.name}</span>
                        <span className="text-primary font-bold">
                          {scaled} {ing.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any production notes..."
                className="glass min-h-[80px]"
              />
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full py-6"
              size="lg"
              disabled={submitting || !producedByName || !targetLiters}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Submit Batch Production
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BatchQRSubmit;
