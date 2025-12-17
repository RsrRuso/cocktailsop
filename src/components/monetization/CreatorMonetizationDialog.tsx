import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  Wallet,
  Gift,
  Star,
  TrendingUp,
  Award,
  Heart,
  Users,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreatorMonetizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export const CreatorMonetizationDialog = ({ open, onOpenChange, userId }: CreatorMonetizationDialogProps) => {
  const [monetization, setMonetization] = useState<any>(null);
  const [tips, setTips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchMonetization();
      fetchTips();
    }
  }, [open, userId]);

  const fetchMonetization = async () => {
    const { data } = await supabase
      .from('creator_monetization')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (data) {
      setMonetization(data);
      setIsCreator(data.is_creator);
    }
  };

  const fetchTips = async () => {
    const { data } = await supabase
      .from('creator_tips')
      .select('*, profiles:tipper_id(username, avatar_url)')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) setTips(data);
  };

  const handleBecomeCreator = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('creator_monetization').upsert({
        user_id: userId,
        is_creator: true,
        tips_enabled: true
      });

      if (error) throw error;
      
      toast.success("You're now a creator! Start earning from your content.");
      setIsCreator(true);
      fetchMonetization();
    } catch (error) {
      toast.error("Failed to enable creator mode");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTips = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('creator_monetization')
        .update({ tips_enabled: enabled })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success(enabled ? "Tips enabled!" : "Tips disabled");
      fetchMonetization();
    } catch (error) {
      toast.error("Failed to update setting");
    }
  };

  const handleToggleBadges = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('creator_monetization')
        .update({ badges_enabled: enabled })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success(enabled ? "Badges enabled!" : "Badges disabled");
      fetchMonetization();
    } catch (error) {
      toast.error("Failed to update setting");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
              <DollarSign className="w-5 h-5" />
            </div>
            Creator Earnings
          </DialogTitle>
          <DialogDescription>
            Turn your creativity into income. Earn from tips, badges, and exclusive content.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          {!isCreator ? (
            /* Non-Creator View */
            <div className="space-y-6 py-4">
              <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 mx-auto mb-4 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Become a Creator</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start monetizing your content and building a sustainable income from your creativity.
                  </p>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <Gift className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                      <p className="text-xs text-muted-foreground">Receive Tips</p>
                    </div>
                    <div className="text-center">
                      <Star className="w-6 h-6 mx-auto mb-1 text-amber-500" />
                      <p className="text-xs text-muted-foreground">Sell Badges</p>
                    </div>
                    <div className="text-center">
                      <Users className="w-6 h-6 mx-auto mb-1 text-purple-500" />
                      <p className="text-xs text-muted-foreground">Subscriptions</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleBecomeCreator}
                    disabled={loading}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  >
                    {loading ? "Setting up..." : "Enable Creator Mode"}
                  </Button>
                </CardContent>
              </Card>

              {/* Benefits List */}
              <div className="space-y-3">
                <h4 className="font-semibold">Creator Benefits</h4>
                {[
                  { icon: Gift, title: "Tips & Donations", desc: "Let your fans support you directly" },
                  { icon: Star, title: "Exclusive Badges", desc: "Offer special badges to supporters" },
                  { icon: Heart, title: "Fan Recognition", desc: "Acknowledge your biggest fans" },
                  { icon: TrendingUp, title: "Analytics", desc: "Track your earnings and growth" }
                ].map((item, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            /* Creator Dashboard */
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tips">Tips</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Earnings Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs text-muted-foreground">Available</span>
                      </div>
                      <p className="text-2xl font-bold text-emerald-600">
                        ${monetization?.available_balance || '0.00'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Total Earned</span>
                      </div>
                      <p className="text-2xl font-bold">
                        ${monetization?.total_earnings || '0.00'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Pending Balance */}
                {(monetization?.pending_balance || 0) > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Pending</p>
                          <p className="text-lg font-bold">${monetization?.pending_balance}</p>
                        </div>
                        <Badge variant="outline">Processing</Badge>
                      </div>
                      <Progress value={60} className="mt-3 h-2" />
                      <p className="text-xs text-muted-foreground mt-1">Usually clears in 3-5 days</p>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="justify-start">
                      <ArrowUpRight className="w-4 h-4 mr-2" />
                      Withdraw
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start">
                      <Award className="w-4 h-4 mr-2" />
                      Create Badge
                    </Button>
                  </CardContent>
                </Card>

                {/* Recent Tips */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Recent Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {tips.slice(0, 3).map(tip => (
                      <div key={tip.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm">@{tip.profiles?.username || 'anonymous'}</span>
                        </div>
                        <span className="font-medium text-emerald-600">+${tip.amount}</span>
                      </div>
                    ))}
                    {tips.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm py-4">No tips yet</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tips" className="space-y-3 mt-4">
                {tips.map(tip => (
                  <Card key={tip.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                            {tip.profiles?.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">@{tip.profiles?.username || 'Anonymous'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tip.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-500">${tip.amount}</Badge>
                      </div>
                      {tip.message && (
                        <p className="mt-3 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          "{tip.message}"
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {tips.length === 0 && (
                  <div className="text-center py-8">
                    <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No tips received yet</p>
                    <p className="text-xs text-muted-foreground">Share your content to start receiving tips</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Gift className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">Enable Tips</p>
                          <p className="text-xs text-muted-foreground">Let followers send you tips</p>
                        </div>
                      </div>
                      <Switch 
                        checked={monetization?.tips_enabled || false}
                        onCheckedChange={handleToggleTips}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Star className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">Enable Badges</p>
                          <p className="text-xs text-muted-foreground">Sell exclusive badges to fans</p>
                        </div>
                      </div>
                      <Switch 
                        checked={monetization?.badges_enabled || false}
                        onCheckedChange={handleToggleBadges}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      <span className="font-medium text-sm">Verification Status</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Verified creators get priority placement and a verified badge
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Apply for Verification
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
