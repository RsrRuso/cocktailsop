import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SmartReplyPanelProps {
  lastMessage: string;
  onSelectReply: (reply: string) => void;
}

export const SmartReplyPanel = ({ lastMessage, onSelectReply }: SmartReplyPanelProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (lastMessage && lastMessage.trim().length > 3) {
      generateSuggestions();
    }
  }, [lastMessage]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('neuron-ai-assistant', {
        body: {
          action: 'suggest_replies',
          message: lastMessage,
          context: 'friendly conversation'
        }
      });

      if (error) throw error;

      const parsed = JSON.parse(data.result);
      setSuggestions(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast({
        title: "AI Error",
        description: "Couldn't generate smart replies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!lastMessage || suggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="px-4 pb-2"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">AI Smart Replies</span>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={index}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectReply(suggestion)}
                className="px-4 py-2 rounded-full glass backdrop-blur-xl border border-primary/30 hover:border-primary/50 hover:bg-primary/10 transition-all text-sm font-medium"
              >
                {suggestion}
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
