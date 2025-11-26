import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

interface SmartReplySuggestionsProps {
  lastMessage: string;
  onSelectReply: (reply: string) => void;
}

export const SmartReplySuggestions = ({ lastMessage, onSelectReply }: SmartReplySuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Generate smart reply suggestions based on last message
    if (lastMessage && lastMessage.length > 5) {
      setLoading(true);
      setShow(true);
      
      // Simulated AI-powered suggestions (in real app, call AI edge function)
      setTimeout(() => {
        const contextualReplies = generateContextualReplies(lastMessage);
        setSuggestions(contextualReplies);
        setLoading(false);
      }, 800);
    }
  }, [lastMessage]);

  const generateContextualReplies = (message: string): string[] => {
    const lowerMessage = message.toLowerCase();
    
    // Question detection
    if (lowerMessage.includes('?')) {
      return [
        "I'll check and get back to you 👍",
        "Let me think about that...",
        "Good question! 🤔"
      ];
    }
    
    // Positive sentiment
    if (lowerMessage.match(/great|awesome|amazing|perfect|love|good/)) {
      return [
        "That's fantastic! 🎉",
        "I'm so glad! 😊",
        "Awesome! 🔥"
      ];
    }
    
    // Invitation or meeting
    if (lowerMessage.match(/meet|coffee|dinner|lunch|catch up/)) {
      return [
        "Sounds great! When works for you?",
        "I'd love to! 📅",
        "Let's do it! 💪"
      ];
    }
    
    // Thanks/Gratitude
    if (lowerMessage.match(/thank|thanks|appreciate/)) {
      return [
        "You're welcome! 🙏",
        "Anytime! 💯",
        "Happy to help! ✨"
      ];
    }
    
    // Default contextual replies
    return [
      "Got it! 👍",
      "Thanks for letting me know! ✨",
      "Sounds good! 🔥"
    ];
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="px-4 py-2 border-t glass backdrop-blur-xl border-primary/20"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Smart Replies</span>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSelectReply(suggestion);
                    setShow(false);
                  }}
                  className="glass backdrop-blur-lg hover:glow-primary whitespace-nowrap"
                >
                  {suggestion}
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};