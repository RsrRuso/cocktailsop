import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, Sparkles, Package, Calendar, Camera, Target, AlertTriangle } from 'lucide-react';
import { ProactiveSuggestion, useMatrixProactiveSuggestions } from '@/hooks/useMatrixProactiveSuggestions';
import { Skeleton } from '@/components/ui/skeleton';

const typeIcons: Record<ProactiveSuggestion['type'], React.ReactNode> = {
  inventory: <Package className="w-4 h-4" />,
  batch: <Sparkles className="w-4 h-4" />,
  schedule: <Calendar className="w-4 h-4" />,
  social: <Camera className="w-4 h-4" />,
  career: <Target className="w-4 h-4" />,
  general: <Sparkles className="w-4 h-4" />
};

const priorityColors: Record<ProactiveSuggestion['priority'], string> = {
  high: 'border-destructive/50 bg-destructive/10',
  medium: 'border-primary/50 bg-primary/10',
  low: 'border-border bg-muted/50'
};

const priorityBadges: Record<ProactiveSuggestion['priority'], string> = {
  high: 'bg-destructive text-destructive-foreground',
  medium: 'bg-primary text-primary-foreground',
  low: 'bg-muted text-muted-foreground'
};

interface MatrixProactiveSuggestionsProps {
  onAskMatrix?: (question: string) => void;
}

export function MatrixProactiveSuggestions({ onAskMatrix }: MatrixProactiveSuggestionsProps) {
  const navigate = useNavigate();
  const { suggestions, loading, dismissSuggestion } = useMatrixProactiveSuggestions();

  if (loading) {
    return (
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Sparkles className="w-4 h-4" />
          <span>Loading suggestions...</span>
        </div>
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (!suggestions.length) {
    return null;
  }

  const handleSuggestionClick = (suggestion: ProactiveSuggestion) => {
    if (suggestion.action?.route) {
      navigate(suggestion.action.route);
    }
  };

  const handleAskAbout = (suggestion: ProactiveSuggestion) => {
    if (onAskMatrix) {
      onAskMatrix(`Tell me more about ${suggestion.title.toLowerCase()}`);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Sparkles className="w-4 h-4 text-primary" />
        </motion.div>
        <span className="font-medium">Smart Suggestions</span>
        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
          {suggestions.length} items
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-lg border p-3 ${priorityColors[suggestion.priority]}`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">{suggestion.icon}</div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{suggestion.title}</h4>
                    {suggestion.priority === 'high' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${priorityBadges[suggestion.priority]}`}>
                        Urgent
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {suggestion.message}
                  </p>

                  <div className="flex items-center gap-2">
                    {suggestion.action && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion.action.label}
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => handleAskAbout(suggestion)}
                    >
                      Ask Matrix
                    </Button>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                  onClick={() => dismissSuggestion(suggestion.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>

              {suggestion.daysAgo && suggestion.daysAgo >= 7 && (
                <div className="absolute -top-1 -right-1">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  </motion.div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}
