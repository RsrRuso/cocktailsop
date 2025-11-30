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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {imageUrl ? (
        // Display the generated JPG image
        <div className="w-full max-w-3xl">
          <img 
            src={imageUrl} 
            alt="Batch Production Details" 
            className="w-full rounded-lg shadow-2xl"
          />
        </div>
      ) : (
        // Render content for HTML-to-image conversion
        <div ref={contentRef} className="max-w-3xl mx-auto py-8 px-6 bg-white" style={{ width: '1000px' }}>
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-block bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-4 rounded-lg shadow-lg mb-4">
              <h1 className="text-3xl font-bold tracking-wide">BATCH PRODUCTION</h1>
              <p className="text-blue-100 text-sm mt-1">Professional Quality Control System</p>
            </div>
          </div>

          {/* Main Content Card */}
          <div className="bg-gradient-to-br from-gray-50 to-white border-4 border-blue-600 rounded-2xl p-8 shadow-2xl">
            {/* Batch Name - Most Prominent */}
            <div className="text-center mb-8 pb-6 border-b-2 border-blue-200">
              <div className="text-sm text-gray-600 font-semibold mb-2 uppercase tracking-wider">Batch Name</div>
              <div className="text-4xl font-bold text-blue-900 break-words leading-tight">
                {production.batch_name}
              </div>
            </div>

            {/* Production Details Grid */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Quantity */}
              <div className="bg-white rounded-xl p-6 border-2 border-blue-300 shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <Droplets className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-sm font-semibold text-gray-600 uppercase">Quantity</div>
                </div>
                <div className="text-3xl font-bold text-blue-900">
                  {production.target_liters.toFixed(2)} L
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {production.target_serves} servings
                </div>
              </div>

              {/* Producer */}
              <div className="bg-white rounded-xl p-6 border-2 border-green-300 shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-sm font-semibold text-gray-600 uppercase">Producer</div>
                </div>
                <div className="text-xl font-bold text-green-900 break-words">
                  {production.produced_by_name || 'N/A'}
                </div>
              </div>
            </div>

            {/* Dates Section */}
            <div className="grid grid-cols-2 gap-6">
              {/* Production Date */}
              <div className="bg-white rounded-xl p-6 border-2 border-purple-300 shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-sm font-semibold text-gray-600 uppercase">Production Date</div>
                </div>
                <div className="text-lg font-bold text-purple-900">
                  {productionDate}
                </div>
              </div>

              {/* Submission Date */}
              <div className="bg-white rounded-xl p-6 border-2 border-orange-300 shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-sm font-semibold text-gray-600 uppercase">Submitted</div>
                </div>
                <div className="text-lg font-bold text-orange-900">
                  {submissionDate}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Branding */}
          <div className="text-center mt-8 pt-6 border-t-2 border-gray-200">
            <div className="text-gray-600 font-semibold text-sm">
              Professional Batch Tracking System
            </div>
            <div className="text-blue-600 font-bold text-lg mt-1">
              SpecVerse • SV
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchView;
