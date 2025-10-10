import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, Diamond, Award, Star, TrendingUp } from "lucide-react";

interface BadgeInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFounder?: boolean;
  isVerified?: boolean;
  badgeLevel?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  username?: string;
  isOwnProfile?: boolean;
}

const BadgeInfoDialog = ({ 
  open, 
  onOpenChange, 
  isFounder, 
  isVerified, 
  badgeLevel = 'bronze',
  username = 'User',
  isOwnProfile = true
}: BadgeInfoDialogProps) => {
  const badgeLevelInfo = {
    bronze: {
      name: 'Bronze',
      icon: Award,
      color: 'from-amber-700 to-amber-900',
      textColor: 'text-amber-700',
      requirements: '0-100 followers',
      perks: ['Basic profile features', 'Post and share content']
    },
    silver: {
      name: 'Silver',
      icon: Award,
      color: 'from-gray-400 to-gray-600',
      textColor: 'text-gray-600',
      requirements: '100-500 followers',
      perks: ['Enhanced visibility', 'Priority in search', 'Custom profile themes']
    },
    gold: {
      name: 'Gold',
      icon: Star,
      color: 'from-yellow-400 to-yellow-600',
      textColor: 'text-yellow-600',
      requirements: '500-2,000 followers',
      perks: ['Featured content', 'Analytics dashboard', 'Early feature access']
    },
    platinum: {
      name: 'Platinum',
      icon: Star,
      color: 'from-blue-400 to-purple-600',
      textColor: 'text-purple-600',
      requirements: '2,000-10,000 followers',
      perks: ['Premium badge', 'Monetization options', 'Verified tick eligibility']
    },
    diamond: {
      name: 'Diamond',
      icon: Diamond,
      color: 'from-cyan-400 to-purple-600',
      textColor: 'text-cyan-500',
      requirements: '10,000+ followers',
      perks: ['Elite status', 'Direct support line', 'Exclusive events access']
    }
  };

  const currentBadge = badgeLevelInfo[badgeLevel];
  const BadgeIcon = currentBadge.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-primary/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isOwnProfile ? 'Your Badge Status' : `${username}'s Badge Status`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Founder Badge Section */}
          {isFounder && (
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 border-2 border-cyan-400/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 blur-xl opacity-50" />
                  <Diamond className="w-12 h-12 text-cyan-400 relative" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                    Founder Status
                  </h3>
                  <p className="text-sm text-muted-foreground">Elite Member</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm">
                  {isOwnProfile 
                    ? "You are a founding member of this platform with exclusive lifetime benefits."
                    : `${username} is a founding member with exclusive privileges.`}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                    Lifetime Access
                  </Badge>
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    Priority Support
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                    All Features
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Verified Badge Section */}
          {isVerified && !isFounder && (
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent blur-md opacity-50" />
                  <BadgeCheck className="w-12 h-12 text-primary relative" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Verified User</h3>
                  <p className="text-sm text-muted-foreground">Authenticated Member</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm">
                  {isOwnProfile 
                    ? "Your account has been verified for authenticity."
                    : `${username}'s account is verified.`}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary">Enhanced Trust</Badge>
                  <Badge variant="secondary">Venue Access</Badge>
                  <Badge variant="secondary">Professional Features</Badge>
                </div>
              </div>
            </div>
          )}

          {/* Level Badge Section */}
          <div className={`relative p-6 rounded-2xl bg-gradient-to-br ${currentBadge.color}/10 border-2 border-current/20`}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${currentBadge.color}`}>
                <BadgeIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${currentBadge.textColor}`}>
                  {currentBadge.name} Level
                </h3>
                <p className="text-sm text-muted-foreground">{currentBadge.requirements}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold mb-2">
                  {isOwnProfile ? 'Your Perks:' : 'Level Benefits:'}
                </p>
                <ul className="space-y-1.5">
                  {currentBadge.perks.map((perk, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {isOwnProfile && badgeLevel !== 'diamond' && (
                <div className="pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    💡 Keep growing your network to unlock the next level!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Badge Progression */}
          {isOwnProfile && (
            <div className="p-4 rounded-xl bg-muted/30">
              <h4 className="font-semibold mb-3 text-sm">Badge Levels</h4>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(badgeLevelInfo).map(([level, info]) => {
                  const Icon = info.icon;
                  const isCurrentLevel = level === badgeLevel;
                  return (
                    <div 
                      key={level}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                        isCurrentLevel 
                          ? 'bg-primary/20 scale-110' 
                          : 'opacity-50 hover:opacity-70'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${info.textColor}`} />
                      <span className="text-[10px] font-medium">{info.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BadgeInfoDialog;
