import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Zap, 
  Crown, 
  Check, 
  Star,
  Rocket,
  Gift,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAICredits } from './AICreditsProvider';
import { toast } from 'sonner';

const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 50,
    price: 4.99,
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    popular: false,
  },
  {
    id: 'creator',
    name: 'Creator Bundle',
    credits: 200,
    price: 14.99,
    originalPrice: 19.99,
    icon: Star,
    color: 'from-purple-500 to-pink-500',
    popular: true,
    savings: '25% OFF',
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 500,
    price: 29.99,
    originalPrice: 49.99,
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
    popular: false,
    savings: '40% OFF',
  },
  {
    id: 'unlimited',
    name: 'Unlimited Monthly',
    credits: -1, // -1 means unlimited
    price: 19.99,
    icon: Rocket,
    color: 'from-green-500 to-emerald-500',
    popular: false,
    isSubscription: true,
  },
];

const FEATURES = [
  'AI Caption Generator',
  'Smart Hashtag Suggestions',
  'Story Content Analyzer',
  'Music Mood Matcher',
  'AI Post Writer',
  'Comment Enhancer',
  'Smart Reply Suggestions',
  'Matrix AI Chat',
];

export function AIUpgradeModal() {
  const { showUpgradePrompt, setShowUpgradePrompt, credits } = useAICredits();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async (packageId: string) => {
    setSelectedPackage(packageId);
    setIsProcessing(true);
    
    // Simulate purchase - replace with actual Stripe integration
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Purchase successful! Credits added to your account.');
    setIsProcessing(false);
    setShowUpgradePrompt(false);
    setSelectedPackage(null);
  };

  return (
    <Dialog open={showUpgradePrompt} onOpenChange={setShowUpgradePrompt}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-gradient-to-b from-background via-background to-primary/5">
        <div className="relative">
          {/* Header with gradient */}
          <div className="relative p-6 pb-8 bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/10 border-b border-primary/20">
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
                <DialogTitle className="text-xl">Get AI Credits</DialogTitle>
                <p className="text-sm text-muted-foreground">Power up your content creation</p>
              </div>
            </div>

            {credits === 0 && (
              <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  You're out of credits! Get more to continue using AI features.
                </p>
              </div>
            )}
          </div>

          {/* Packages */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CREDIT_PACKAGES.map((pkg) => (
                <motion.div
                  key={pkg.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedPackage === pkg.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 bg-card'
                  }`}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                      Most Popular
                    </Badge>
                  )}
                  
                  {pkg.savings && (
                    <Badge variant="secondary" className="absolute -top-2 left-4 bg-green-500/20 text-green-500 border-green-500/30">
                      {pkg.savings}
                    </Badge>
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${pkg.color} shadow-lg`}>
                      <pkg.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{pkg.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {pkg.credits === -1 ? 'Unlimited AI usage' : `${pkg.credits} credits`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      {pkg.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through mr-2">
                          ${pkg.originalPrice}
                        </span>
                      )}
                      <span className="text-2xl font-bold">${pkg.price}</span>
                      {pkg.isSubscription && (
                        <span className="text-xs text-muted-foreground">/month</span>
                      )}
                    </div>
                    {selectedPackage === pkg.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Features list */}
            <div className="p-4 rounded-2xl bg-muted/50 border border-border">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                What you can do with AI Credits
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {FEATURES.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Purchase button */}
            <AnimatePresence>
              {selectedPackage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                >
                  <Button
                    className="w-full h-12 text-lg bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                    onClick={() => handlePurchase(selectedPackage)}
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
                        Purchase Now
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Secure payment powered by Stripe
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Free tier info */}
            <div className="text-center text-sm text-muted-foreground">
              <p>🎁 Free users get 10 credits daily</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
