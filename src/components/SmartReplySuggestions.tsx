import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface SmartReplySuggestionsProps {
  lastMessage: string;
  onSelectReply: (reply: string) => void;
}

export function SmartReplySuggestions({ 
  lastMessage, 
  onSelectReply
}: SmartReplySuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lastMessage) {
      generateSuggestions();
    }
  }, [lastMessage]);

  const generateSuggestions = async () => {
    if (!lastMessage) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-message-assistant", {
        body: { 
          conversationContext: [lastMessage],
          action: "suggest_replies"
        },
      });

      if (error) throw error;
      if (data?.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (error: any) {
      console.error("Failed to generate smart replies:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-3 pb-2 pt-1">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
        <span className="text-xs font-semibold text-primary">AI Smart Replies</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={generateSuggestions}
          disabled={loading}
          className="h-6 px-2 text-xs ml-auto"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-2 flex-wrap"
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-8 w-24 glass rounded-full animate-pulse"
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex gap-2 flex-wrap"
          >
            {suggestions.map((suggestion, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSelectReply(suggestion)}
                  className="glass backdrop-blur-xl hover:bg-primary/20 hover:scale-105 transition-all border-primary/20 text-sm rounded-full px-4 h-8"
                >
                  {suggestion}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
