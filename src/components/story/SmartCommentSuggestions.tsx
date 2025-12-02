import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface SmartCommentSuggestionsProps {
  storyId: string;
  onSelectSuggestion: (text: string) => void;
}

export const SmartCommentSuggestions = ({
  storyId,
  onSelectSuggestion,
}: SmartCommentSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    generateSuggestions();
  }, [storyId]);

  const generateSuggestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-comment-suggestions", {
        body: { storyId },
      });

      if (error) throw error;

      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Error generating suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-white/70">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs">Generating smart replies...</span>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2 py-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4 text-yellow-400" />
        <span className="text-xs font-medium text-white/90">Quick Replies</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {suggestions.slice(0, 4).map((suggestion, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectSuggestion(suggestion)}
                className="bg-white/15 border-white/30 text-white hover:bg-white/25 rounded-full text-xs backdrop-blur-sm"
              >
                {suggestion}
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
