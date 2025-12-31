import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAICredits, FEATURE_MODELS } from './AICreditsProvider';
import { toast } from 'sonner';

interface AIFeatureGateProps {
  feature: keyof typeof FEATURE_MODELS | string;
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
  const { requestsUsed, requestsLimit, trackRequest, setShowUpgradePrompt } = useAICredits();
  const [isUsing, setIsUsing] = useState(false);
  
  const remaining = Math.max(0, requestsLimit - requestsUsed);
  const canUse = remaining > 0;

  const handleUse = async () => {
    if (!canUse) {
      setShowUpgradePrompt(true);
      toast.error('No AI requests remaining. Please upgrade your plan.');
      return;
    }

    setIsUsing(true);
    try {
      const success = await trackRequest(feature);
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
                No AI requests remaining
              </p>
              <Button
                size="sm"
                onClick={() => setShowUpgradePrompt(true)}
                className="bg-gradient-to-r from-primary to-purple-500"
              >
                <Zap className="w-4 h-4 mr-1" />
                Upgrade Plan
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showCost && canUse && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-primary font-medium">1 req</span>
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
