import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Megaphone, 
  DollarSign, 
  ShoppingBag, 
  Crown,
  TrendingUp,
  Users,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { PromoteContentDialog } from "./PromoteContentDialog";
import { CreatorMonetizationDialog } from "./CreatorMonetizationDialog";
import { ShopProductsDialog } from "./ShopProductsDialog";
import { PremiumSubscriptionsDialog } from "./PremiumSubscriptionsDialog";

interface MonetizationHubProps {
  userId: string;
}

const monetizationFeatures = [
  {
    id: 'promote',
    icon: Megaphone,
    title: 'Promote Content',
    description: 'Boost your posts, reels, and events to reach more people. Set your budget, target audience, and watch your engagement grow.',
    badge: 'Ads',
    gradient: 'from-orange-500 to-red-500',
    stats: { label: 'Avg. Reach', value: '+340%' }
  },
  {
    id: 'creator',
    icon: DollarSign,
    title: 'Creator Earnings',
    description: 'Monetize your content through tips, badges, and exclusive content. Turn your creativity into income.',
    badge: 'Earn',
    gradient: 'from-emerald-500 to-teal-500',
    stats: { label: 'Creators Earned', value: '$2.5M+' }
  },
  {
    id: 'shop',
    icon: ShoppingBag,
    title: 'Your Shop',
    description: 'Sell physical or digital products directly to your followers. Set up your store in minutes.',
    badge: 'Sell',
    gradient: 'from-purple-500 to-pink-500',
    stats: { label: 'Products Sold', value: '50K+' }
  },
  {
    id: 'premium',
    icon: Crown,
    title: 'Premium Subscriptions',
    description: 'Offer exclusive content and perks to subscribers. Build a loyal community that supports you monthly.',
    badge: 'Subscribe',
    gradient: 'from-amber-500 to-yellow-500',
    stats: { label: 'Subscribers', value: '100K+' }
  }
];

export const MonetizationHub = ({ userId }: MonetizationHubProps) => {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Monetization</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            New Features
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {monetizationFeatures.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className="cursor-pointer group hover:shadow-lg transition-all duration-300 border-border/50 overflow-hidden relative"
                onClick={() => setActiveDialog(feature.id)}
              >
                {/* Gradient accent */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient}`} />
                
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg`}>
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-base mt-3 flex items-center gap-2 group-hover:text-primary transition-colors">
                    {feature.title}
                    <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <CardDescription className="text-xs leading-relaxed mb-3">
                    {feature.description}
                  </CardDescription>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">{feature.stats.label}</span>
                    <span className={`text-sm font-bold bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                      {feature.stats.value}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Stats */}
        <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/20">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Ready to grow?</p>
                  <p className="text-xs text-muted-foreground">Start monetizing your content today</p>
                </div>
              </div>
              <Badge className="bg-primary hover:bg-primary/90">
                Get Started
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <PromoteContentDialog 
        open={activeDialog === 'promote'} 
        onOpenChange={(open) => setActiveDialog(open ? 'promote' : null)}
        userId={userId}
      />
      <CreatorMonetizationDialog 
        open={activeDialog === 'creator'} 
        onOpenChange={(open) => setActiveDialog(open ? 'creator' : null)}
        userId={userId}
      />
      <ShopProductsDialog 
        open={activeDialog === 'shop'} 
        onOpenChange={(open) => setActiveDialog(open ? 'shop' : null)}
        userId={userId}
      />
      <PremiumSubscriptionsDialog 
        open={activeDialog === 'premium'} 
        onOpenChange={(open) => setActiveDialog(open ? 'premium' : null)}
        userId={userId}
      />
    </>
  );
};
