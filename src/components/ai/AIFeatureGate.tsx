import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAICredits, CREDIT_COSTS } from './AICreditsProvider';
import { toast } from 'sonner';

interface AIFeatureGateProps {
  feature: keyof typeof CREDIT_COSTS;
  children: ReactNode;
  onUse?: () => Promise<void>;
  showCost?: boolean;
}

export function AIFeatureGate({ 
  feature, 
  children, 
  onUse,
  showCost = true 
}: AIFeatureGateProps) {
  const { credits, useCredits, setShowUpgradePrompt } = useAICredits();
  const [isUsing, setIsUsing] = useState(false);
  
  const cost = CREDIT_COSTS[feature] || 1;
  const canUse = credits >= cost;

  const handleUse = async () => {
    if (!canUse) {
      setShowUpgradePrompt(true);
      toast.error(`Not enough credits. You need ${cost} credit(s) for this feature.`);
      return;
    }

    setIsUsing(true);
    try {
      const success = await useCredits(cost, feature);
      if (success && onUse) {
        await onUse();
      }
    } catch (error) {
      console.error('Error using AI feature:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsUsing(false);
    }
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {!canUse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg"
          >
            <div className="text-center p-4">
              <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Requires {cost} credit(s)
              </p>
              <Button
                size="sm"
                onClick={() => setShowUpgradePrompt(true)}
                className="bg-gradient-to-r from-primary to-purple-500"
              >
                <Zap className="w-4 h-4 mr-1" />
                Get Credits
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showCost && canUse && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-primary font-medium">{cost}</span>
          </div>
        </div>
      )}

      <div onClick={canUse ? handleUse : undefined} className={!canUse ? 'opacity-50' : ''}>
        {children}
      </div>

      {isUsing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg z-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-6 h-6 text-primary" />
          </motion.div>
        </div>
      )}
    </div>
  );
}
