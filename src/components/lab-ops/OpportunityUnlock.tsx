import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Lightbulb, DollarSign, TrendingUp, Target, 
  Zap, ArrowRight, Check, Star, Sparkles,
  PiggyBank, BarChart3, Users, Wine
} from 'lucide-react';

interface Opportunity {
  id: string;
  type: 'cost_saving' | 'margin_improvement' | 'training' | 'seasonal' | 'efficiency';
  title: string;
  description: string;
  potentialSaving: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  steps?: string[];
  implemented?: boolean;
}

interface OpportunityUnlockProps {
  outletId: string;
}

export function OpportunityUnlock({ outletId }: OpportunityUnlockProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [implementedIds, setImplementedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (outletId) {
      analyzeOpportunities();
    }
  }, [outletId]);

  const analyzeOpportunities = async () => {
    setIsLoading(true);
    try {
      const [bottlesRes, salesRes, readingsRes] = await Promise.all([
        supabase.from('lab_ops_bottles').select('id, spirit_type, current_level_ml').eq('outlet_id', outletId),
        supabase.from('lab_ops_sales').select('spirit_type, total_ml_sold').eq('outlet_id', outletId).gte('sold_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('lab_ops_pourer_readings').select('id, ml_dispensed, bottle_id').eq('outlet_id', outletId).gte('reading_timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      const bottles = bottlesRes.data || [];
      const sales = salesRes.data || [];
      const readings = readingsRes.data || [];

      const detectedOpportunities: Opportunity[] = [];

      // 1. Over-pouring reduction opportunity
      const totalPhysical = readings.reduce((sum: number, r: any) => sum + (r.ml_dispensed || 0), 0);
      const totalVirtual = sales.reduce((sum: number, s: any) => sum + (s.total_ml_sold || 0), 0);
      const overPour = totalPhysical - totalVirtual;
      
      if (overPour > 500) {
        const savingPotential = overPour * 0.05; // €0.05 per ml average
        detectedOpportunities.push({
          id: 'cost-1',
          type: 'cost_saving',
          title: 'Reduce over-pouring by 15%',
          description: `You're dispensing ${overPour}ml more than recorded sales. Reducing over-pours can save significant costs.`,
          potentialSaving: Math.round(savingPotential * 12), // Annual projection
          effort: 'low',
          impact: 'high',
          steps: [
            'Train staff on standard pour techniques',
            'Use jiggers for premium spirits',
            'Review pourer readings weekly',
            'Recognize top-performing bartenders'
          ]
        });
      }

      // 2. Premium spirit upselling
      const premiumSales = sales.filter((s: any) => ['Cognac', 'Scotch', 'Premium Vodka'].includes(s.spirit_type));
      const premiumRatio = sales.length > 0 ? premiumSales.length / sales.length : 0;
      
      if (premiumRatio < 0.2) {
        detectedOpportunities.push({
          id: 'margin-1',
          type: 'margin_improvement',
          title: 'Increase premium spirit sales',
          description: `Only ${Math.round(premiumRatio * 100)}% of sales are premium spirits. Upselling can boost margins by 20-30%.`,
          potentialSaving: Math.round(sales.length * 2.5 * 12), // €2.50 extra margin per sale, annual
          effort: 'medium',
          impact: 'high',
          steps: [
            'Train staff on premium recommendations',
            'Create signature cocktails with premiums',
            'Highlight premium options on menu',
            'Offer premium flights or tastings'
          ]
        });
      }

      // 3. Inventory optimization
      const slowMoving = bottles.filter((b: any) => {
        const usage = readings.filter((r: any) => r.bottle_id === b.id);
        return usage.length < 5; // Less than 5 pours in 30 days
      });

      if (slowMoving.length > 3) {
        const tiedUpCapital = slowMoving.length * 35; // Average €35 per bottle
        detectedOpportunities.push({
          id: 'efficiency-1',
          type: 'efficiency',
          title: 'Optimize slow-moving inventory',
          description: `${slowMoving.length} bottles have minimal movement. Reducing dead stock frees up capital.`,
          potentialSaving: tiedUpCapital,
          effort: 'low',
          impact: 'medium',
          steps: [
            'Create promotional cocktails featuring slow movers',
            'Offer happy hour specials',
            'Consider returning or exchanging with supplier',
            'Adjust future order quantities'
          ]
        });
      }

      // 4. Staff training ROI
      detectedOpportunities.push({
        id: 'training-1',
        type: 'training',
        title: 'Bartender certification program',
        description: 'Invest in certified training to improve consistency, speed, and customer satisfaction.',
        potentialSaving: 2400, // Estimated annual benefit
        effort: 'medium',
        impact: 'high',
        steps: [
          'Enroll top performers in certification',
          'Implement speed and accuracy benchmarks',
          'Create internal training materials',
          'Recognition and incentive program'
        ]
      });

      // 5. Seasonal opportunity
      const currentMonth = new Date().getMonth();
      if (currentMonth >= 10 || currentMonth <= 1) {
        detectedOpportunities.push({
          id: 'seasonal-1',
          type: 'seasonal',
          title: 'Winter cocktail promotion',
          description: 'Capitalize on seasonal preferences with warm cocktails and holiday specials.',
          potentialSaving: 1800,
          effort: 'low',
          impact: 'medium',
          steps: [
            'Create seasonal menu with warm cocktails',
            'Feature premium whiskeys and rums',
            'Holiday-themed presentation',
            'Social media promotion'
          ]
        });
      } else if (currentMonth >= 5 && currentMonth <= 8) {
        detectedOpportunities.push({
          id: 'seasonal-2',
          type: 'seasonal',
          title: 'Summer refreshment focus',
          description: 'Boost sales with light, refreshing cocktails and frozen drinks.',
          potentialSaving: 2200,
          effort: 'low',
          impact: 'medium',
          steps: [
            'Expand frozen cocktail offerings',
            'Feature light spirits and fresh ingredients',
            'Outdoor promotion if applicable',
            'Instagram-worthy presentation'
          ]
        });
      }

      // 6. Technology efficiency
      detectedOpportunities.push({
        id: 'efficiency-2',
        type: 'efficiency',
        title: 'Automate inventory counts',
        description: 'Using smart pourers for automated tracking saves 4+ hours weekly on manual counts.',
        potentialSaving: Math.round(4 * 52 * 15), // 4 hours * 52 weeks * €15/hr
        effort: 'medium',
        impact: 'high',
        steps: [
          'Deploy smart pourers on high-volume bottles',
          'Integrate with POS system',
          'Set up automated alerts',
          'Train staff on new workflow'
        ]
      });

      setOpportunities(detectedOpportunities.sort((a, b) => b.potentialSaving - a.potentialSaving));
    } catch (error) {
      console.error('Error analyzing opportunities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markImplemented = (id: string) => {
    setImplementedIds(prev => new Set([...prev, id]));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cost_saving': return PiggyBank;
      case 'margin_improvement': return TrendingUp;
      case 'training': return Users;
      case 'seasonal': return Star;
      case 'efficiency': return Zap;
      default: return Lightbulb;
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low': return 'text-green-500 bg-green-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-red-500 bg-red-500/10';
    }
  };

  const totalPotential = opportunities.reduce((sum, o) => sum + o.potentialSaving, 0);
  const implementedSavings = opportunities
    .filter(o => implementedIds.has(o.id))
    .reduce((sum, o) => sum + o.potentialSaving, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Opportunity Unlock</h2>
        </div>
        <Badge variant="outline" className="text-primary">
          {opportunities.length} opportunities
        </Badge>
      </div>

      {/* Savings Summary */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Potential Savings</p>
              <p className="text-3xl font-bold text-primary">€{totalPotential.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">per year</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Unlocked</p>
              <p className="text-2xl font-bold text-green-500">€{implementedSavings.toLocaleString()}</p>
            </div>
          </div>
          <Progress value={(implementedSavings / totalPotential) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {Math.round((implementedSavings / totalPotential) * 100)}% of opportunities implemented
          </p>
        </CardContent>
      </Card>

      {/* Opportunities List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            Cost Saving Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[350px]">
            <div className="p-3 space-y-3">
              {opportunities.map(opp => {
                const Icon = getTypeIcon(opp.type);
                const isImplemented = implementedIds.has(opp.id);
                
                return (
                  <div
                    key={opp.id}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isImplemented 
                        ? 'border-green-500/30 bg-green-500/5 opacity-70' 
                        : 'border-border bg-card hover:bg-muted/50'
                    }`}
                    onClick={() => !isImplemented && setSelectedOpp(opp)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isImplemented ? 'bg-green-500/20' : 'bg-primary/10'
                      }`}>
                        {isImplemented ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <Icon className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`font-medium ${isImplemented ? 'line-through' : ''}`}>
                            {opp.title}
                          </p>
                          <span className="text-primary font-bold">
                            €{opp.potentialSaving.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {opp.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge className={getEffortColor(opp.effort)} variant="outline">
                            {opp.effort} effort
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {opp.impact} impact
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selected Opportunity Detail */}
      {selectedOpp && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Implementation Plan
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedOpp(null)}>
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{selectedOpp.title}</p>
              <span className="text-lg font-bold text-primary">
                €{selectedOpp.potentialSaving.toLocaleString()}/yr
              </span>
            </div>
            
            {selectedOpp.steps && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Steps to implement:</p>
                {selectedOpp.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    {step}
                  </div>
                ))}
              </div>
            )}

            <Button 
              className="w-full gap-2" 
              onClick={() => {
                markImplemented(selectedOpp.id);
                setSelectedOpp(null);
              }}
            >
              <Check className="w-4 h-4" />
              Mark as Implemented
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
