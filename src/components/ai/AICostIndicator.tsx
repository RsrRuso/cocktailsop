import { Sparkles, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { CREDIT_COSTS } from './AICreditsProvider';
import { useAICredits } from './AICreditsProvider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface AICostIndicatorProps {
  feature: keyof typeof CREDIT_COSTS;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AICostIndicator({ 
  feature, 
  showLabel = false,
  size = 'sm' 
}: AICostIndicatorProps) {
  const { credits } = useAICredits();
  const cost = CREDIT_COSTS[feature] || 1;
  const canAfford = credits >= cost;

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
            <span>{cost}</span>
            {showLabel && <span className="opacity-70">credit{cost !== 1 ? 's' : ''}</span>}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Feature Cost
            </p>
            <p className="text-sm text-muted-foreground">
              This feature uses <strong>{cost}</strong> AI credit{cost !== 1 ? 's' : ''}.
            </p>
            {!canAfford && (
              <Badge variant="destructive" className="text-xs">
                Not enough credits ({credits} available)
              </Badge>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              Free users get 10 credits daily
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
