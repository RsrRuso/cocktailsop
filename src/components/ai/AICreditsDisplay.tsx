import { Sparkles, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAICredits } from './AICreditsProvider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface AICreditsDisplayProps {
  variant?: 'compact' | 'full' | 'minimal';
  showBuyButton?: boolean;
  onBuyClick?: () => void;
}

export function AICreditsDisplay({ 
  variant = 'compact', 
  showBuyButton = true,
  onBuyClick 
}: AICreditsDisplayProps) {
  const { requestsUsed, requestsLimit, isLoading, isPremium, usagePercentage, setShowUpgradePrompt } = useAICredits();
  
  const remaining = Math.max(0, requestsLimit - requestsUsed);
  const isLow = usagePercentage >= 70;
  const isCritical = usagePercentage >= 90;

  const handleBuyClick = () => {
    if (onBuyClick) {
      onBuyClick();
    } else {
      setShowUpgradePrompt(true);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse bg-muted/50 rounded-lg h-10 w-24" />
    );
  }

  if (variant === 'minimal') {
    return (
      <Badge 
        variant={isCritical ? 'destructive' : isLow ? 'secondary' : 'default'}
        className="gap-1 font-mono"
      >
        <Sparkles className="w-3 h-3" />
        {remaining}/{requestsLimit}
      </Badge>
    );
  }

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border backdrop-blur-sm ${
          isCritical 
            ? 'bg-destructive/10 border-destructive/30' 
            : isLow 
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-primary/5 border-primary/20'
        }`}
      >
        <div className={`p-1 rounded-full ${
          isCritical ? 'bg-destructive/20' : isLow ? 'bg-amber-500/20' : 'bg-primary/20'
        }`}>
          <Zap className={`w-4 h-4 ${
            isCritical ? 'text-destructive' : isLow ? 'text-amber-500' : 'text-primary'
          }`} />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">AI Requests</span>
          <span className={`font-bold text-sm ${
            isCritical ? 'text-destructive' : isLow ? 'text-amber-500' : 'text-foreground'
          }`}>
            {remaining} left
          </span>
        </div>
        {isPremium && (
          <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-purple-500 to-pink-500">
            PRO
          </Badge>
        )}
      </motion.div>
    );
  }

  // Full variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 via-background to-purple-500/5 border border-primary/20 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-purple-500 shadow-lg shadow-primary/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Usage</h3>
            <p className="text-xs text-muted-foreground">This month</p>
          </div>
        </div>
        {isPremium ? (
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            <TrendingUp className="w-3 h-3 mr-1" />
            Premium
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Free Tier
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <div>
            <span className={`text-3xl font-bold ${
              isCritical ? 'text-destructive' : isLow ? 'text-amber-500' : 'text-foreground'
            }`}>
              {requestsUsed}
            </span>
            <span className="text-muted-foreground text-lg">/{requestsLimit}</span>
          </div>
          <span className="text-xs text-muted-foreground">requests used</span>
        </div>
        <Progress 
          value={usagePercentage} 
          className={`h-2 ${
            isCritical ? '[&>div]:bg-destructive' : isLow ? '[&>div]:bg-amber-500' : ''
          }`}
        />
      </div>

      {isCritical && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Almost at limit! Upgrade to continue.</span>
        </div>
      )}

      {(isLow || !isPremium) && showBuyButton && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <Button 
            onClick={handleBuyClick}
            className="w-full bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
          >
            <Zap className="w-4 h-4 mr-2" />
            {isPremium ? 'Add More Requests' : 'Upgrade to Premium'}
          </Button>
        </motion.div>
      )}

      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>{isPremium ? '✨ Premium: 500 requests/month' : '🎁 Free: 50 requests/month'}</p>
        <p className="opacity-70">Resets on the 1st of each month</p>
      </div>
    </motion.div>
  );
}
