import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Crown, 
  Plus,
  Users,
  DollarSign,
  Star,
  Check,
  Trash2,
  Edit,
  Sparkles,
  Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PremiumSubscriptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export const PremiumSubscriptionsDialog = ({ open, onOpenChange, userId }: PremiumSubscriptionsDialogProps) => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    benefits: ['']
  });

  useEffect(() => {
    if (open && userId) {
      fetchSubscriptions();
    }
  }, [open, userId]);

  const fetchSubscriptions = async () => {
    const { data } = await supabase
      .from('creator_subscriptions')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setSubscriptions(data);
  };

  const handleAddSubscription = async () => {
    if (!formData.name || !formData.price) {
      toast.error("Name and price are required");
      return;
    }

    setLoading(true);
    try {
      const benefits = formData.benefits.filter(b => b.trim());
      
      const { error } = await supabase.from('creator_subscriptions').insert({
        creator_id: userId,
        name: formData.name,
        description: formData.description,
        price_monthly: parseFloat(formData.price),
        benefits: benefits,
        is_active: true
      });

      if (error) throw error;
      
      toast.success("Subscription tier created!");
      setShowAddForm(false);
      setFormData({ name: '', description: '', price: '', benefits: [''] });
      fetchSubscriptions();
    } catch (error) {
      toast.error("Failed to create subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubscription = async (subId: string) => {
    if (!confirm("Delete this subscription tier?")) return;
    
    try {
      const { error } = await supabase
        .from('creator_subscriptions')
        .delete()
        .eq('id', subId);

      if (error) throw error;
      
      toast.success("Subscription deleted");
      fetchSubscriptions();
    } catch (error) {
      toast.error("Failed to delete subscription");
    }
  };

  const handleToggleActive = async (subId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('creator_subscriptions')
        .update({ is_active: isActive })
        .eq('id', subId);

      if (error) throw error;
      fetchSubscriptions();
    } catch (error) {
      toast.error("Failed to update subscription");
    }
  };

  const addBenefitField = () => {
    setFormData({ ...formData, benefits: [...formData.benefits, ''] });
  };

  const updateBenefit = (index: number, value: string) => {
    const newBenefits = [...formData.benefits];
    newBenefits[index] = value;
    setFormData({ ...formData, benefits: newBenefits });
  };

  const removeBenefit = (index: number) => {
    const newBenefits = formData.benefits.filter((_, i) => i !== index);
    setFormData({ ...formData, benefits: newBenefits.length ? newBenefits : [''] });
  };

  const totalSubscribers = subscriptions.reduce((sum, s) => sum + (s.subscriber_count || 0), 0);
  const monthlyRevenue = subscriptions.reduce((sum, s) => 
    sum + ((s.subscriber_count || 0) * s.price_monthly), 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 text-white">
              <Crown className="w-5 h-5" />
            </div>
            Premium Subscriptions
          </DialogTitle>
          <DialogDescription>
            Create exclusive subscription tiers for your most dedicated fans.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <Tabs defaultValue="tiers" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tiers">Subscription Tiers</TabsTrigger>
              <TabsTrigger value="create">Create Tier</TabsTrigger>
            </TabsList>

            <TabsContent value="tiers" className="space-y-4 mt-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                  <CardContent className="p-3 text-center">
                    <Users className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                    <p className="text-xl font-bold">{totalSubscribers}</p>
                    <p className="text-xs text-muted-foreground">Subscribers</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <Crown className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                    <p className="text-xl font-bold">{subscriptions.length}</p>
                    <p className="text-xs text-muted-foreground">Tiers</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <DollarSign className="w-5 h-5 mx-auto mb-1 text-green-500" />
                    <p className="text-xl font-bold">${monthlyRevenue}</p>
                    <p className="text-xs text-muted-foreground">Monthly</p>
                  </CardContent>
                </Card>
              </div>

              {/* Subscription Tiers */}
              <div className="space-y-3">
                {subscriptions.map(sub => (
                  <Card key={sub.id} className={`overflow-hidden ${!sub.is_active ? 'opacity-60' : ''}`}>
                    <div className="h-1 bg-gradient-to-r from-amber-500 to-yellow-500" />
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-500" />
                            <h4 className="font-bold">{sub.name}</h4>
                            {!sub.is_active && <Badge variant="secondary">Inactive</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{sub.description}</p>
                          <p className="text-2xl font-bold text-primary mt-2">
                            ${sub.price_monthly}<span className="text-sm font-normal text-muted-foreground">/month</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={sub.is_active}
                            onCheckedChange={(checked) => handleToggleActive(sub.id, checked)}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteSubscription(sub.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {sub.benefits && sub.benefits.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs text-muted-foreground mb-2">Benefits:</p>
                          <div className="space-y-1">
                            {sub.benefits.map((benefit: string, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <Check className="w-4 h-4 text-green-500" />
                                <span>{benefit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{sub.subscriber_count || 0} subscribers</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {subscriptions.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <Crown className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <h4 className="font-semibold mb-1">No subscription tiers yet</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create your first subscription tier to start earning monthly revenue
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          const tabTrigger = document.querySelector('[data-state="inactive"][value="create"]') as HTMLElement;
                          tabTrigger?.click();
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Tier
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="create" className="space-y-4 mt-4">
              <Card className="bg-gradient-to-br from-amber-500/5 to-yellow-500/5 border-amber-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-sm">Subscription Benefits</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Subscribers get exclusive access to your premium content, early releases, and special perks.
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tier Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Premium, VIP, Founding Member"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what subscribers get"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Monthly Price *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="9.99"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Benefits</Label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={addBenefitField}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <Input
                          value={benefit}
                          onChange={(e) => updateBenefit(index, e.target.value)}
                          placeholder={`Benefit ${index + 1}`}
                          className="flex-1"
                        />
                        {formData.benefits.length > 1 && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => removeBenefit(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {(formData.name || formData.price) && (
                  <Card className="overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-amber-500 to-yellow-500" />
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-2">Preview</p>
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <h4 className="font-bold">{formData.name || 'Tier Name'}</h4>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        ${formData.price || '0'}<span className="text-sm font-normal text-muted-foreground">/month</span>
                      </p>
                      {formData.benefits.filter(b => b).length > 0 && (
                        <div className="mt-2 space-y-1">
                          {formData.benefits.filter(b => b).map((b, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <Check className="w-3 h-3 text-green-500" />
                              <span>{b}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Button 
                  onClick={handleAddSubscription}
                  disabled={loading || !formData.name || !formData.price}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black"
                >
                  {loading ? "Creating..." : "Create Subscription Tier"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
