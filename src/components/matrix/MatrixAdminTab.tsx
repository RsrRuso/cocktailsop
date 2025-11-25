import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Database, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function MatrixAdminTab() {
  const [loading, setLoading] = useState(false);

  const runPatternDetection = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("matrix-detect-patterns");
      if (error) throw error;
      toast.success(`✨ Detected ${data.patterns.length} patterns`);
    } catch (error) {
      toast.error("Failed to detect patterns");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const runFeatureGeneration = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("matrix-generate-features");
      if (error) throw error;
      toast.success(`✨ Generated ${data.features.length} features`);
    } catch (error) {
      toast.error("Failed to generate features");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          MATRIX AI Admin Controls
        </h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Pattern Detection</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Analyze insights to detect patterns and trends
            </p>
            <Button onClick={runPatternDetection} disabled={loading}>
              <Play className="w-4 h-4 mr-2" />
              Run Pattern Detection
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Feature Generation</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Generate roadmap features from confirmed patterns
            </p>
            <Button onClick={runFeatureGeneration} disabled={loading}>
              <Database className="w-4 h-4 mr-2" />
              Generate Features
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">System Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold">--</div>
            <div className="text-sm text-muted-foreground">Total Insights</div>
          </div>
          <div>
            <div className="text-2xl font-bold">--</div>
            <div className="text-sm text-muted-foreground">Active Patterns</div>
          </div>
          <div>
            <div className="text-2xl font-bold">--</div>
            <div className="text-sm text-muted-foreground">Proposed Features</div>
          </div>
          <div>
            <div className="text-2xl font-bold">--</div>
            <div className="text-sm text-muted-foreground">Memory Entries</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
