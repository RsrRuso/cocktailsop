import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Droplets, Users, Package, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toJpeg } from "html-to-image";

const BatchView = () => {
  const { productionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [production, setProduction] = useState<any>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProduction();
  }, [productionId]);

  useEffect(() => {
    if (!loading && production && contentRef.current) {
      // Convert to JPG after data is loaded
      setTimeout(() => {
        if (contentRef.current) {
          toJpeg(contentRef.current, {
            quality: 0.95,
            backgroundColor: '#ffffff'
          })
            .then((dataUrl) => {
              setImageUrl(dataUrl);
            })
            .catch((error) => {
              console.error('Error converting to image:', error);
            });
        }
      }, 100);
    }
  }, [loading, production]);

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
      {imageUrl ? (
        // Display the JPG image
        <div className="max-w-3xl mx-auto space-y-6 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="glass-hover"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Batch Production</h1>
          </div>
          <img 
            src={imageUrl} 
            alt="Batch Production Details" 
            className="w-full rounded-lg shadow-2xl"
          />
        </div>
      ) : (
        // Render content for conversion (hidden when image is ready)
        <div ref={contentRef} className={imageUrl ? "hidden" : ""}>
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
...
            </Card>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground">
              <p>Professional Batch Tracking System • SpecVerse</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchView;
