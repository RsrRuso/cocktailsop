import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Sparkles, Zap, Crown, Check, Star, Rocket, ArrowLeft,
  Brain, MessageSquare, Image, Music, Hash, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAICredits } from "@/components/ai";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

// Stripe price IDs for AI credit tiers
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
      'Basic AI models',
      'Caption & hashtag generation',
      'Community support',
    ],
  },
  {
    id: 'creator',
    name: 'Creator',
    price: 9.99,
    priceId: 'price_1SkNgvDeFqd186tlYGJv6TvQ',
    requests: 500,
    description: 'For active content creators',
    icon: Star,
    color: 'from-purple-500 to-pink-500',
    popular: true,
    features: [
      '500 AI requests/month',
      'Standard AI models',
      'All AI features unlocked',
      'Priority processing',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29.99,
    priceId: 'price_1SkNhNDeFqd186tlVPNzqoDA',
    requests: 2000,
    description: 'For power users & businesses',
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
    features: [
      '2000 AI requests/month',
      'Premium AI models',
      'Advanced analytics AI',
      'Matrix AI full access',
      'Priority support',
      'API access',
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

export default function AICredits() {
  const navigate = useNavigate();
  const { requestsUsed, requestsLimit, isPremium, usagePercentage, isLoading } = useAICredits();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const remaining = Math.max(0, requestsLimit - requestsUsed);
  const isLow = usagePercentage >= 70;
  const isCritical = usagePercentage >= 90;

  const handleUpgrade = async (tier: typeof PRICING_TIERS[0]) => {
    if (tier.id === 'free' || !tier.priceId) {
      toast.info("You're already on the free tier");
      return;
    }

    setSelectedTier(tier.id);
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceId: tier.priceId,
          mode: 'subscription'
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Opening Stripe checkout...');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsProcessing(false);
      setSelectedTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      
      <main className="pt-16 pb-24 px-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              AI Credits
            </h1>
            <p className="text-sm text-muted-foreground">Manage your AI usage & upgrade</p>
          </div>
        </div>

        {/* Current Usage Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-background to-purple-500/10 border border-primary/20 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-purple-500 shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-semibold">Your AI Usage</h2>
                <p className="text-sm text-muted-foreground">This month</p>
              </div>
            </div>
            {isPremium ? (
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                Premium
              </Badge>
            ) : (
              <Badge variant="secondary">Free Tier</Badge>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <span className={`text-4xl font-bold ${
                  isCritical ? 'text-destructive' : isLow ? 'text-amber-500' : 'text-foreground'
                }`}>
                  {isLoading ? '...' : requestsUsed}
                </span>
                <span className="text-xl text-muted-foreground">/{requestsLimit}</span>
              </div>
              <span className="text-sm text-muted-foreground">{remaining} remaining</span>
            </div>
            <Progress 
              value={usagePercentage} 
              className={`h-3 ${
                isCritical ? '[&>div]:bg-destructive' : isLow ? '[&>div]:bg-amber-500' : ''
              }`}
            />
          </div>

          {isCritical && (
            <div className="flex items-center gap-2 p-3 mt-4 rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Almost at limit! Upgrade to continue using AI features.</span>
            </div>
          )}

          {remaining === 0 && (
            <div className="flex items-center gap-2 p-3 mt-4 rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">You've used all your AI requests. Upgrade now!</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-4 text-center">
            🔄 Resets on the 1st of each month
          </p>
        </motion.div>

        {/* Pricing Tiers */}
        <h3 className="text-lg font-semibold mb-4">Choose Your Plan</h3>
        <div className="grid gap-4 mb-8">
          {PRICING_TIERS.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-5 rounded-2xl border-2 transition-all ${
                tier.popular 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                  Most Popular
                </Badge>
              )}

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${tier.color} shadow-lg`}>
                    <tier.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">{tier.name}</h4>
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold">
                    {tier.price === 0 ? 'Free' : `$${tier.price}`}
                  </span>
                  {tier.price > 0 && (
                    <span className="text-sm text-muted-foreground">/mo</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {tier.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              {tier.price > 0 && (
                <Button
                  className={`w-full ${tier.popular ? 'bg-gradient-to-r from-primary to-purple-500' : ''}`}
                  variant={tier.popular ? 'default' : 'outline'}
                  onClick={() => handleUpgrade(tier)}
                  disabled={isProcessing && selectedTier === tier.id}
                >
                  {isProcessing && selectedTier === tier.id ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                      </motion.div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Upgrade to {tier.name}
                    </>
                  )}
                </Button>
              )}
            </motion.div>
          ))}
        </div>

        {/* AI Features */}
        <h3 className="text-lg font-semibold mb-4">What You Can Do with AI</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {AI_FEATURES.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/50 border border-border"
            >
              <div className="p-3 rounded-xl bg-primary/10 mb-2">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">{feature.name}</span>
              <span className="text-xs text-muted-foreground mt-1">{feature.desc}</span>
            </motion.div>
          ))}
        </div>

        {/* Info */}
        <div className="text-center text-sm text-muted-foreground space-y-2 p-4 rounded-xl bg-muted/30">
          <p>💳 Secure payment via Stripe • Cancel anytime</p>
          <p>💡 Unused requests don't roll over to the next month</p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
