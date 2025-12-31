import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Zap, 
  Crown, 
  Check, 
  Star,
  Rocket,
  X,
  Brain,
  MessageSquare,
  Image,
  Music,
  Hash
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAICredits } from './AICreditsProvider';
import { toast } from 'sonner';

// Lovable-aligned pricing tiers
const PRICING_TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    requests: 50,
    description: 'Perfect for trying out AI features',
    icon: Zap,
    color: 'from-slate-500 to-slate-600',
    features: [
      '50 AI requests/month',
      'Basic AI models (Flash Lite)',
      'Caption & hashtag generation',
      'Community support',
    ],
    current: true,
  },
  {
    id: 'creator',
    name: 'Creator',
    price: 9.99,
    requests: 500,
    description: 'For active content creators',
    icon: Star,
    color: 'from-purple-500 to-pink-500',
    popular: true,
    features: [
      '500 AI requests/month',
      'Standard AI models (Flash)',
      'All AI features unlocked',
      'Priority processing',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29.99,
    requests: 2000,
    description: 'For power users & businesses',
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
    features: [
      '2000 AI requests/month',
      'Premium AI models (Pro)',
      'Advanced analytics AI',
      'Matrix AI full access',
      'Priority support',
      'API access',
    ],
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: 99.99,
    requests: -1,
    description: 'No limits, maximum power',
    icon: Rocket,
    color: 'from-green-500 to-emerald-500',
    features: [
      'Unlimited AI requests',
      'All AI models available',
      'Dedicated support',
      'Custom integrations',
      'Early access to new features',
    ],
  },
];

const AI_FEATURES = [
  { icon: MessageSquare, name: 'Smart Captions', desc: 'AI-generated engaging captions' },
  { icon: Hash, name: 'Trending Hashtags', desc: 'Discover viral hashtags' },
  { icon: Image, name: 'Story Analyzer', desc: 'Get insights on your content' },
  { icon: Music, name: 'Music Matcher', desc: 'Find perfect background music' },
  { icon: Brain, name: 'Matrix AI Chat', desc: 'Your intelligent assistant' },
];

export function AIUpgradeModal() {
  const { showUpgradePrompt, setShowUpgradePrompt, requestsUsed, requestsLimit, isPremium } = useAICredits();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async (tierId: string) => {
    if (tierId === 'free') {
      setShowUpgradePrompt(false);
      return;
    }

    setSelectedTier(tierId);
    setIsProcessing(true);
    
    // TODO: Integrate with Stripe for actual payment
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Upgrade successful! Your new limits are now active.');
    setIsProcessing(false);
    setShowUpgradePrompt(false);
    setSelectedTier(null);
  };

  const remaining = Math.max(0, requestsLimit - requestsUsed);

  return (
    <Dialog open={showUpgradePrompt} onOpenChange={setShowUpgradePrompt}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 bg-gradient-to-b from-background via-background to-primary/5">
        <div className="relative">
          {/* Header */}
          <div className="relative p-6 pb-4 bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/10 border-b border-primary/20">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 rounded-full"
              onClick={() => setShowUpgradePrompt(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-purple-500 shadow-lg shadow-primary/25">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl">AI Usage & Plans</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {remaining} of {requestsLimit} requests remaining this month
                </p>
              </div>
            </div>

            {remaining === 0 && (
              <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  You've used all your AI requests. Upgrade to continue!
                </p>
              </div>
            )}
          </div>

          {/* Pricing tiers */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PRICING_TIERS.map((tier) => (
                <motion.div
                  key={tier.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedTier === tier.id
                      ? 'border-primary bg-primary/5'
                      : tier.current && !isPremium
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border hover:border-primary/50 bg-card'
                  }`}
                  onClick={() => setSelectedTier(tier.id)}
                >
                  {tier.popular && (
                    <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                      Most Popular
                    </Badge>
                  )}
                  
                  {tier.current && !isPremium && (
                    <Badge variant="outline" className="absolute -top-2 left-4 bg-background">
                      Current Plan
                    </Badge>
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${tier.color} shadow-lg`}>
                      <tier.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{tier.name}</h3>
                      <p className="text-xs text-muted-foreground">{tier.description}</p>
                    </div>
                  </div>

                  <div className="mt-3 mb-3">
                    <span className="text-2xl font-bold">
                      {tier.price === 0 ? 'Free' : `$${tier.price}`}
                    </span>
                    {tier.price > 0 && (
                      <span className="text-sm text-muted-foreground">/month</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {tier.features.slice(0, 3).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                    {tier.features.length > 3 && (
                      <p className="text-xs text-primary">+{tier.features.length - 3} more</p>
                    )}
                  </div>

                  {selectedTier === tier.id && (
                    <Check className="absolute top-4 right-4 w-5 h-5 text-primary" />
                  )}
                </motion.div>
              ))}
            </div>

            {/* AI Features preview */}
            <div className="p-4 rounded-2xl bg-muted/50 border border-border">
              <h4 className="font-medium mb-3 text-sm">AI Features Included</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {AI_FEATURES.map((feature, index) => (
                  <div key={index} className="flex flex-col items-center text-center p-2">
                    <div className="p-2 rounded-lg bg-primary/10 mb-1">
                      <feature.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-medium">{feature.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upgrade button */}
            <AnimatePresence>
              {selectedTier && selectedTier !== 'free' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                >
                  <Button
                    className="w-full h-12 text-lg bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                    onClick={() => handleUpgrade(selectedTier)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Sparkles className="w-5 h-5 mr-2" />
                        </motion.div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Upgrade to {PRICING_TIERS.find(t => t.id === selectedTier)?.name}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Secure payment • Cancel anytime
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Usage info */}
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>🔄 Usage resets on the 1st of each month</p>
              <p>💡 Unused requests don't roll over</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
