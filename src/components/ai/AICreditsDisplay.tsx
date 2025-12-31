import { Sparkles, Zap, TrendingUp } from 'lucide-react';
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
  const { credits, isLoading, isPremium, setShowUpgradePrompt } = useAICredits();
  
  const maxCredits = 100;
  const percentage = Math.min((credits / maxCredits) * 100, 100);
  const isLow = credits <= 3;
  const isCritical = credits <= 1;

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
        {credits}
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
          <span className="text-xs text-muted-foreground">AI Credits</span>
          <span className={`font-bold text-sm ${
            isCritical ? 'text-destructive' : isLow ? 'text-amber-500' : 'text-foreground'
          }`}>
            {credits}
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
            <h3 className="font-semibold text-sm">AI Credits</h3>
            <p className="text-xs text-muted-foreground">Power your creativity</p>
          </div>
        </div>
        {isPremium && (
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            <TrendingUp className="w-3 h-3 mr-1" />
            Premium
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <span className={`text-3xl font-bold ${
            isCritical ? 'text-destructive' : isLow ? 'text-amber-500' : 'text-foreground'
          }`}>
            {credits}
          </span>
          <span className="text-xs text-muted-foreground">credits remaining</span>
        </div>
        <Progress 
          value={percentage} 
          className={`h-2 ${
            isCritical ? '[&>div]:bg-destructive' : isLow ? '[&>div]:bg-amber-500' : ''
          }`}
        />
      </div>

      {isLow && showBuyButton && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <Button 
            onClick={handleBuyClick}
            className="w-full bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
          >
            <Zap className="w-4 h-4 mr-2" />
            Get More Credits
          </Button>
        </motion.div>
      )}

      <div className="text-xs text-muted-foreground text-center">
        {isCritical 
          ? '⚠️ Running low! Get more credits to continue using AI features.'
          : isLow 
            ? '💡 Consider getting more credits soon.'
            : '✨ Use AI to enhance your content.'}
      </div>
    </motion.div>
  );
}
