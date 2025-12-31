import { Sparkles, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAICredits, FEATURE_MODELS } from './AICreditsProvider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface AICostIndicatorProps {
  feature: keyof typeof FEATURE_MODELS | string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AICostIndicator({ 
  feature, 
  showLabel = false,
  size = 'sm' 
}: AICostIndicatorProps) {
  const { requestsUsed, requestsLimit } = useAICredits();
  const remaining = Math.max(0, requestsLimit - requestsUsed);
  const canAfford = remaining > 0;
  const model = FEATURE_MODELS[feature as keyof typeof FEATURE_MODELS] || 'gemini-2.5-flash';

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} ${
              canAfford 
                ? 'bg-primary/10 text-primary border border-primary/20' 
                : 'bg-destructive/10 text-destructive border border-destructive/20'
            }`}
          >
            <Sparkles className={iconSizes[size]} />
            <span>1</span>
            {showLabel && <span className="opacity-70">request</span>}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Request
            </p>
            <p className="text-sm text-muted-foreground">
              Uses <strong>1</strong> AI request from your monthly limit.
            </p>
            <p className="text-xs text-muted-foreground">
              Model: {model}
            </p>
            {!canAfford && (
              <Badge variant="destructive" className="text-xs">
                No requests remaining ({remaining}/{requestsLimit})
              </Badge>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              Free tier: 50 requests/month
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
