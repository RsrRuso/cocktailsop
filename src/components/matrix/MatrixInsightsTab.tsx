import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";

export function MatrixInsightsTab() {
  const [content, setContent] = useState("");
  const [type, setType] = useState<string>("feedback");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please enter your insight");
      return;
    }

    setLoading(true);

    try {
      // Analyze insight with AI
      const { data: aiData, error: aiError } = await supabase.functions.invoke(
        "matrix-analyze-insight",
        { body: { content: content.trim() } }
      );

      if (aiError) throw aiError;

      const analysis = aiData.analysis;

      // Store insight
      const { error: insertError } = await supabase
        .from("matrix_insights")
        .insert({
          content: content.trim(),
          type: analysis.type || type,
          category: analysis.category || "other",
          priority: analysis.priority || "medium",
          sentiment: analysis.sentiment || "neutral",
          keywords: analysis.keywords || [],
          summary: analysis.summary || content.substring(0, 100),
          actionable: analysis.actionable ?? true,
          status: "processed",
        });

      if (insertError) throw insertError;

      toast.success("✨ Thank you! Your insight has been added to MATRIX AI");
      setContent("");
      setType("feedback");
    } catch (error: any) {
      toast.error("Failed to submit insight");
      console.error("Insight error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 max-w-2xl"
    >
      <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <Lightbulb className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h3 className="font-semibold mb-1">Help Shape SpecVerse</h3>
          <p className="text-sm text-muted-foreground">
            Share your ideas, feedback, or report bugs. MATRIX AI learns from all user
            insights to improve the platform for everyone.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="type">Insight Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="feedback">💬 General Feedback</SelectItem>
              <SelectItem value="feature">💡 Feature Request</SelectItem>
              <SelectItem value="bug">🐛 Bug Report</SelectItem>
              <SelectItem value="improvement">⚡ Improvement Idea</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="content">Your Insight</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts, ideas, or issues..."
            className="min-h-[200px] resize-none"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {content.length} / 2000 characters
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !content.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Lightbulb className="w-4 h-4 mr-2" />
              Submit to MATRIX AI
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
