import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FinancialMetrics {
  id: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  gp_percentage: number;
  beverage_cost_percentage: number;
  food_cost_percentage: number;
  labor_cost_percentage: number;
  average_check: number;
  covers: number;
}

export interface ApprovalRequest {
  id: string;
  category: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  roi_percentage: number;
  payback_months: number;
  risk_score: string;
  priority: string;
  status: string;
  ai_recommendation: string;
  created_at: string;
}

export interface StaffPerformance {
  id: string;
  staff_member_id: string;
  revenue_contribution: number;
  sales_conversion_rate: number;
  guest_impact_rating: number;
  training_completion_percentage: number;
  upselling_success_rate: number;
  overall_value_score: number;
  badges: string[];
  strengths: string[];
  weaknesses: string[];
  ai_development_plan: string;
}

export interface RiskAlert {
  id: string;
  risk_type: string;
  severity: string;
  title: string;
  description: string;
  affected_item: string;
  potential_cost_impact: number;
  recommended_action: string;
  status: string;
  created_at: string;
}

export interface Opportunity {
  id: string;
  opportunity_type: string;
  title: string;
  description: string;
  projected_savings: number;
  projected_revenue_increase: number;
  implementation_effort: string;
  status: string;
  ai_analysis: string;
}

export interface InventoryPrediction {
  id: string;
  item_name: string;
  current_stock: number;
  predicted_shortage_date: string;
  reorder_recommendation: string;
  excess_stock_warning: boolean;
  waste_risk_value: number;
  ai_suggestion: string;
}

export const useGMCommand = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [inventoryPredictions, setInventoryPredictions] = useState<InventoryPrediction[]>([]);

  const fetchAllData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    
    try {
      const [metricsRes, approvalsRes, staffRes, risksRes, oppsRes, inventoryRes] = await Promise.all([
        supabase.from('gm_financial_metrics').select('*').eq('user_id', user.id).order('period_end', { ascending: false }),
        supabase.from('gm_approval_requests').select('*').or(`user_id.eq.${user.id},requested_by.eq.${user.id}`).order('created_at', { ascending: false }),
        supabase.from('gm_staff_performance').select('*').eq('user_id', user.id).order('overall_value_score', { ascending: false }),
        supabase.from('gm_risk_alerts').select('*').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('gm_opportunities').select('*').eq('user_id', user.id).order('projected_savings', { ascending: false }),
        supabase.from('gm_inventory_predictions').select('*').eq('user_id', user.id).order('predicted_shortage_date', { ascending: true })
      ]);

      if (metricsRes.data) setFinancialMetrics(metricsRes.data as FinancialMetrics[]);
      if (approvalsRes.data) setApprovalRequests(approvalsRes.data as ApprovalRequest[]);
      if (staffRes.data) setStaffPerformance(staffRes.data as StaffPerformance[]);
      if (risksRes.data) setRiskAlerts(risksRes.data as RiskAlert[]);
      if (oppsRes.data) setOpportunities(oppsRes.data as Opportunity[]);
      if (inventoryRes.data) setInventoryPredictions(inventoryRes.data as InventoryPrediction[]);
    } catch (error) {
      console.error('Error fetching GM Command data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadDemoData = useCallback(async () => {
    if (!user?.id) {
      toast.error('Please log in first');
      return;
    }
    
    setLoading(true);
    
    try {
      const today = new Date();
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const periodEnd = today.toISOString().split('T')[0];

      // Insert demo financial metrics
      await supabase.from('gm_financial_metrics').insert({
        user_id: user.id,
        period_start: periodStart,
        period_end: periodEnd,
        total_revenue: 285000,
        total_cost: 142500,
        gross_profit: 142500,
        gp_percentage: 50,
        beverage_cost_percentage: 22,
        food_cost_percentage: 32,
        labor_cost_percentage: 28,
        average_check: 185,
        covers: 1540
      });

      // Insert demo approval requests
      const approvals = [
        {
          user_id: user.id,
          requested_by: user.id,
          category: 'equipment',
          title: 'Bar Ice Freezer Upgrade',
          description: 'Replace aging ice machine with commercial-grade unit for consistent ice quality',
          amount: 4920,
          currency: 'AED',
          roi_percentage: 18,
          payback_months: 8,
          risk_score: 'low',
          priority: 'high',
          status: 'pending',
          ai_recommendation: 'Recommend approval. Current unit causing service delays. ROI achievable within 8 months through reduced waste and faster service.'
        },
        {
          user_id: user.id,
          requested_by: user.id,
          category: 'staffing',
          title: 'Senior Bartender Promotion - Rana',
          description: 'Promote Rana to Senior Bartender position based on exceptional performance metrics',
          amount: 2500,
          currency: 'AED',
          roi_percentage: 24,
          payback_months: 4,
          risk_score: 'low',
          priority: 'normal',
          status: 'pending',
          ai_recommendation: 'Strong candidate. Top 10% performer with 94% training completion. Projected team productivity increase of 12%.'
        },
        {
          user_id: user.id,
          requested_by: user.id,
          category: 'supplier',
          title: 'Switch Vermouth Supplier',
          description: 'Change from current Italian vermouth to Spanish alternative due to supply chain issues',
          amount: -19000,
          currency: 'AED',
          roi_percentage: 15,
          payback_months: 1,
          risk_score: 'medium',
          priority: 'urgent',
          status: 'pending',
          ai_recommendation: 'Potential annual savings of AED 19,000. Recommend taste testing before full switch. Consider customer perception risk.'
        }
      ];
      
      await supabase.from('gm_approval_requests').insert(approvals);

      // Insert demo staff performance
      const staffData = [
        {
          user_id: user.id,
          staff_member_id: user.id,
          period_start: periodStart,
          period_end: periodEnd,
          revenue_contribution: 42300,
          sales_conversion_rate: 78,
          guest_impact_rating: 4.8,
          training_completion_percentage: 94,
          upselling_success_rate: 32,
          overall_value_score: 92,
          badges: ['Rising Talent', 'Master of Classic Ritual'],
          strengths: ['Japanese Highball technique', 'Customer rapport', 'Speed of service'],
          weaknesses: ['Barrel profile cocktails', 'Wine service'],
          ai_development_plan: 'Recommend barrel-aged cocktail training module. Estimated GP uplift 11-13% in zone hours 20:00-23:00.'
        }
      ];
      
      await supabase.from('gm_staff_performance').insert(staffData);

      // Insert demo risk alerts
      const risks = [
        {
          user_id: user.id,
          risk_type: 'supplier_dependency',
          severity: 'high',
          title: 'Italian Vermouth Shortage Expected',
          description: 'Supply chain disruption predicted for next cycle based on global logistics data',
          affected_item: 'Carpano Antica Formula',
          potential_cost_impact: 15000,
          recommended_action: 'Source alternative supplier or substitute product immediately',
          status: 'active'
        },
        {
          user_id: user.id,
          risk_type: 'waste_risk',
          severity: 'medium',
          title: 'Fresh Juice Expiration Alert',
          description: 'Basil syrup and citrus prep approaching expiration in 7 days',
          affected_item: 'Basil Syrup, Lime Juice',
          potential_cost_impact: 9200,
          recommended_action: 'Create promotional basil cocktail or freeze excess syrup',
          status: 'active'
        },
        {
          user_id: user.id,
          risk_type: 'negative_gp',
          severity: 'medium',
          title: 'Signature Negroni GP Decline',
          description: 'Gross profit dropped from 54% to 39% due to ingredient cost increases',
          affected_item: 'Signature Negroni',
          potential_cost_impact: 8500,
          recommended_action: 'Review pricing or substitute vermouth brand',
          status: 'active'
        }
      ];
      
      await supabase.from('gm_risk_alerts').insert(risks);

      // Insert demo opportunities
      const opps = [
        {
          user_id: user.id,
          opportunity_type: 'cost_savings',
          title: 'Spirit Brand Optimization',
          description: 'Swap premium well brands to house-selected alternatives with equivalent quality',
          projected_savings: 19000,
          projected_revenue_increase: 0,
          implementation_effort: 'low',
          status: 'identified',
          ai_analysis: 'Blind taste testing shows 87% customer acceptance. Potential monthly savings of AED 19,000 with minimal quality perception impact.'
        },
        {
          user_id: user.id,
          opportunity_type: 'revenue_growth',
          title: 'Seasonal Flight Tasting Menu',
          description: 'Introduce curated tasting flights for seasonal spirits with premium markup',
          projected_savings: 0,
          projected_revenue_increase: 57000,
          implementation_effort: 'medium',
          status: 'identified',
          ai_analysis: 'Projected +AED 57 increased check average per guest. Staff training required (2 hours). ROI within first month.'
        },
        {
          user_id: user.id,
          opportunity_type: 'zero_waste',
          title: 'Basil Syrup → Basil Highball',
          description: 'Convert expiring basil syrup into featured zero-waste cocktail',
          projected_savings: 8300,
          projected_revenue_increase: 12500,
          implementation_effort: 'low',
          status: 'identified',
          ai_analysis: 'Use remaining basil syrup to create Basil Highball special. Projected GP of AED 8,300 from saved waste plus AED 12,500 new revenue.'
        }
      ];
      
      await supabase.from('gm_opportunities').insert(opps);

      // Insert demo inventory predictions
      const predictions = [
        {
          user_id: user.id,
          item_name: 'Carpano Antica Formula',
          current_stock: 4,
          predicted_shortage_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          reorder_recommendation: 'Order 12 bottles immediately',
          excess_stock_warning: false,
          waste_risk_value: 0,
          ai_suggestion: 'Critical stock level. Current usage: 3 bottles/week. Lead time: 10 days.'
        },
        {
          user_id: user.id,
          item_name: 'Fever-Tree Tonic',
          current_stock: 48,
          predicted_shortage_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          reorder_recommendation: 'Reorder in 7 days',
          excess_stock_warning: false,
          waste_risk_value: 0,
          ai_suggestion: 'Healthy stock level. Standard reorder schedule applies.'
        },
        {
          user_id: user.id,
          item_name: 'Maraschino Cherries',
          current_stock: 24,
          predicted_shortage_date: null,
          reorder_recommendation: 'Consider reducing order quantity',
          excess_stock_warning: true,
          waste_risk_value: 1200,
          ai_suggestion: 'Excess stock detected. Current usage slower than projected. Risk of expiration: AED 1,200.'
        }
      ];
      
      await supabase.from('gm_inventory_predictions').insert(predictions);

      toast.success('Demo data loaded successfully!');
      await fetchAllData();
    } catch (error) {
      console.error('Error loading demo data:', error);
      toast.error('Failed to load demo data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchAllData]);

  const clearDemoData = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      await Promise.all([
        supabase.from('gm_financial_metrics').delete().eq('user_id', user.id),
        supabase.from('gm_approval_requests').delete().eq('user_id', user.id),
        supabase.from('gm_staff_performance').delete().eq('user_id', user.id),
        supabase.from('gm_risk_alerts').delete().eq('user_id', user.id),
        supabase.from('gm_opportunities').delete().eq('user_id', user.id),
        supabase.from('gm_inventory_predictions').delete().eq('user_id', user.id)
      ]);
      
      setFinancialMetrics([]);
      setApprovalRequests([]);
      setStaffPerformance([]);
      setRiskAlerts([]);
      setOpportunities([]);
      setInventoryPredictions([]);
      
      toast.success('Demo data cleared');
    } catch (error) {
      console.error('Error clearing demo data:', error);
      toast.error('Failed to clear demo data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const updateApprovalStatus = useCallback(async (id: string, status: 'approved' | 'rejected' | 'revision_requested', reason?: string) => {
    if (!user?.id) return;
    
    try {
      const updateData: Record<string, unknown> = {
        status,
        approved_by: status === 'approved' ? user.id : null,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
        rejection_reason: status === 'rejected' ? reason : null,
        updated_at: new Date().toISOString()
      };
      
      await supabase.from('gm_approval_requests').update(updateData).eq('id', id);
      toast.success(`Request ${status}`);
      await fetchAllData();
    } catch (error) {
      console.error('Error updating approval:', error);
      toast.error('Failed to update approval');
    }
  }, [user?.id, fetchAllData]);

  const resolveRiskAlert = useCallback(async (id: string) => {
    if (!user?.id) return;
    
    try {
      await supabase.from('gm_risk_alerts').update({
        status: 'resolved',
        resolved_at: new Date().toISOString()
      }).eq('id', id);
      
      toast.success('Risk resolved');
      await fetchAllData();
    } catch (error) {
      console.error('Error resolving risk:', error);
      toast.error('Failed to resolve risk');
    }
  }, [user?.id, fetchAllData]);

  const implementOpportunity = useCallback(async (id: string) => {
    if (!user?.id) return;
    
    try {
      await supabase.from('gm_opportunities').update({
        status: 'in_progress'
      }).eq('id', id);
      
      toast.success('Opportunity implementation started');
      await fetchAllData();
    } catch (error) {
      console.error('Error implementing opportunity:', error);
      toast.error('Failed to start implementation');
    }
  }, [user?.id, fetchAllData]);

  return {
    loading,
    financialMetrics,
    approvalRequests,
    staffPerformance,
    riskAlerts,
    opportunities,
    inventoryPredictions,
    fetchAllData,
    loadDemoData,
    clearDemoData,
    updateApprovalStatus,
    resolveRiskAlert,
    implementOpportunity
  };
};
