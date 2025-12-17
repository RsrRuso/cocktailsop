import { useState } from "react";
import { 
  Megaphone, 
  DollarSign, 
  ShoppingBag, 
  Crown,
  TrendingUp,
  Sparkles,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    description: 'Boost your posts, reels, and events',
    badge: 'Ads',
    gradient: 'from-orange-500 to-red-500',
    iconBg: 'bg-gradient-to-br from-orange-500 to-red-500'
  },
  {
    id: 'creator',
    icon: DollarSign,
    title: 'Creator Earnings',
    description: 'Monetize through tips & badges',
    badge: 'Earn',
    gradient: 'from-emerald-500 to-teal-500',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500'
  },
  {
    id: 'shop',
    icon: ShoppingBag,
    title: 'Your Shop',
    description: 'Sell products to followers',
    badge: 'Sell',
    gradient: 'from-purple-500 to-pink-500',
    iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500'
  },
  {
    id: 'premium',
    icon: Crown,
    title: 'Premium Subscriptions',
    description: 'Offer exclusive content',
    badge: 'Subscribe',
    gradient: 'from-amber-500 to-yellow-500',
    iconBg: 'bg-gradient-to-br from-amber-500 to-yellow-500'
  }
];

export const MonetizationHub = ({ userId }: MonetizationHubProps) => {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between border-border/50 bg-card hover:bg-accent"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-medium">Monetization</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                New
              </Badge>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-[var(--radix-dropdown-menu-trigger-width)] bg-card border-border z-50"
        >
          {monetizationFeatures.map((feature, index) => (
            <div key={feature.id}>
              <DropdownMenuItem 
                className="cursor-pointer py-3 px-3 focus:bg-accent"
                onClick={() => setActiveDialog(feature.id)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`p-2 rounded-lg ${feature.iconBg} text-white shadow-sm`}>
                    <feature.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{feature.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{feature.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {feature.badge}
                  </Badge>
                </div>
              </DropdownMenuItem>
              {index < monetizationFeatures.length - 1 && <DropdownMenuSeparator />}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

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
