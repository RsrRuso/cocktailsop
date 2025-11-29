import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Droplets, Users, Package, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const BatchView = () => {
  const { productionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [production, setProduction] = useState<any>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);

  useEffect(() => {
    loadProduction();
  }, [productionId]);

  const loadProduction = async () => {
    try {
      const { data: prod, error: prodError } = await supabase
        .from("batch_productions")
        .select("*")
        .eq("id", productionId)
        .single();

      if (prodError) throw prodError;

      setProduction(prod);

      const { data: ings, error: ingsError } = await supabase
        .from("batch_production_ingredients")
        .select("*")
        .eq("production_id", productionId);

      if (ingsError) throw ingsError;

      setIngredients(ings || []);
    } catch (error) {
      console.error("Error loading production:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground font-medium">Loading batch details...</p>
        </div>
      </div>
    );
  }

  if (!production) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="glass p-8 max-w-md w-full text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Package className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold">Batch Not Found</h2>
          <p className="text-muted-foreground">
            This batch production does not exist or has been removed.
          </p>
          <Button onClick={() => navigate("/")} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  const productionDate = production.production_date
    ? format(new Date(production.production_date), "MMM dd, yyyy")
    : "N/A";
  const submissionDate = production.created_at
    ? format(new Date(production.created_at), "MMM dd, yyyy 'at' hh:mm a")
    : "N/A";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        {/* Header */}
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Batch Production
            </h1>
            <p className="text-sm text-muted-foreground">Waterproof Sticker Data</p>
          </div>
        </div>

        {/* Main Card */}
        <Card className="glass p-6 sm:p-8 space-y-6 border-2 border-primary/20">
          {/* Batch Name - Hero */}
          <div className="text-center pb-6 border-b border-border/50">
            <div className="inline-block">
              <div className="bg-gradient-to-r from-primary/20 to-secondary/20 p-6 rounded-2xl">
                <Package className="w-12 h-12 text-primary mx-auto mb-3" />
                <h2 className="text-3xl font-bold mb-1">{production.batch_name}</h2>
                <p className="text-sm text-muted-foreground">Batch Name</p>
              </div>
            </div>
          </div>

          {/* Key Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quantity */}
            <div className="glass p-5 rounded-xl border border-primary/10 hover:border-primary/30 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Droplets className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Quantity Produced</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {production.target_liters} L
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {production.target_serves} servings
                  </p>
                </div>
              </div>
            </div>

            {/* Producer */}
            <div className="glass p-5 rounded-xl border border-primary/10 hover:border-primary/30 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Produced By</p>
                  <p className="text-xl font-bold">{production.produced_by_name || "Unknown"}</p>
                  {production.produced_by_email && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {production.produced_by_email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Production Date */}
            <div className="glass p-5 rounded-xl border border-primary/10 hover:border-primary/30 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Production Date</p>
                  <p className="text-xl font-bold">{productionDate}</p>
                </div>
              </div>
            </div>

            {/* Submission Date */}
            <div className="glass p-5 rounded-xl border border-primary/10 hover:border-primary/30 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Submitted On</p>
                  <p className="text-lg font-bold">{submissionDate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ingredients Section */}
          {ingredients.length > 0 && (
            <div className="pt-4 border-t border-border/50">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Ingredients Used
              </h3>
              <div className="space-y-2">
                {ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="glass p-4 rounded-lg flex justify-between items-center hover:bg-primary/5 transition-all"
                  >
                    <span className="font-medium">{ing.ingredient_name}</span>
                    <span className="text-primary font-bold">
                      {parseFloat(ing.scaled_amount).toFixed(2)} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes Section */}
          {production.notes && (
            <div className="pt-4 border-t border-border/50">
              <h3 className="text-lg font-bold mb-3">Production Notes</h3>
              <div className="glass p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-sm leading-relaxed">{production.notes}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Professional Batch Tracking System • SpecVerse</p>
        </div>
      </div>
    </div>
  );
};

export default BatchView;
