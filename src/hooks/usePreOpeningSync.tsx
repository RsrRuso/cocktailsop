import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PreOpeningMetrics {
  budget: {
    total: number;
    spent: number;
    remaining: number;
    variance: number;
    byCategory: Record<string, number>;
  };
  financial: {
    totalRevenue: number;
    totalOrders: number;
    avgCheck: number;
    foodRevenue: number;
    beverageRevenue: number;
    discounts: number;
    comps: number;
  };
  recruitment: {
    totalPositions: number;
    filled: number;
    pending: number;
    fillRate: number;
    byDepartment: Record<string, { needed: number; filled: number }>;
  };
  training: {
    totalPrograms: number;
    completed: number;
    inProgress: number;
    completionRate: number;
  };
  inventory: {
    totalItems: number;
    activeBottles: number;
    lowStock: number;
    totalValue: number;
    byCategory: Record<string, number>;
  };
  marketing: {
    totalCampaigns: number;
    active: number;
    scheduled: number;
    totalBudget: number;
  };
  utilities: {
    totalSetup: number;
    connected: number;
    pending: number;
  };
  insurance: {
    totalPolicies: number;
    active: number;
    expiringSoon: number;
  };
  uniforms: {
    totalOrders: number;
    delivered: number;
    pending: number;
  };
  health: {
    totalAudits: number;
    passed: number;
    issues: number;
  };
  softOpening: {
    daysUntil: number;
    readinessScore: number;
    blockers: string[];
  };
  variance: {
    totalVariance: number;
    variancePercent: number;
    itemsWithVariance: number;
  };
  overallReadiness: number;
  dependencies: Dependency[];
  alerts: Alert[];
}

export interface Dependency {
  from: string;
  to: string;
  type: 'blocks' | 'affects' | 'requires';
  status: 'ok' | 'warning' | 'critical';
  message: string;
}

export interface Alert {
  id: string;
  module: string;
  type: 'warning' | 'critical' | 'info';
  action?: string;
  message: string;
}

export const usePreOpeningSync = () => {
  const { user } = useAuth();

  // Fetch all pre-opening data
  const { data: budgets = [], refetch: refetchBudgets } = useQuery({
    queryKey: ["sync-budgets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("pre_opening_budgets").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Lab Ops Financial Data - Actual Sales (fetches all user-accessible sales via RLS)
  const { data: labOpsSales = [], refetch: refetchLabOpsSales } = useQuery({
    queryKey: ["sync-labops-sales", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      // RLS will automatically filter to outlets user has access to
      const { data, error } = await supabase
        .from("lab_ops_sales")
        .select("*")
        .gte("sold_at", thirtyDaysAgo)
        .order("sold_at", { ascending: false })
        .limit(500);
      if (error) console.error("Lab ops sales fetch error:", error);
      return data || [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Lab Ops Inventory - Bottles
  const { data: labOpsBottles = [], refetch: refetchLabOpsBottles } = useQuery({
    queryKey: ["sync-labops-bottles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("lab_ops_bottles").select("*");
      return data || [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Lab Ops Inventory Items
  const { data: labOpsInventoryItems = [], refetch: refetchLabOpsInventory } = useQuery({
    queryKey: ["sync-labops-inventory-items", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("lab_ops_inventory_items").select("*");
      return data || [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Lab Ops Variance
  const { data: labOpsVariance = [], refetch: refetchLabOpsVariance } = useQuery({
    queryKey: ["sync-labops-variance", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("lab_ops_bar_variance").select("*").order("period_end", { ascending: false }).limit(30);
      return data || [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: recruitment = [], refetch: refetchRecruitment } = useQuery({
    queryKey: ["sync-recruitment", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("recruitment_positions").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: training = [], refetch: refetchTraining } = useQuery({
    queryKey: ["sync-training", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("training_programs").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: inventory = [], refetch: refetchInventory } = useQuery({
    queryKey: ["sync-inventory", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("opening_inventory").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: marketing = [], refetch: refetchMarketing } = useQuery({
    queryKey: ["sync-marketing", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("marketing_campaigns").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: insurance = [], refetch: refetchInsurance } = useQuery({
    queryKey: ["sync-insurance", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("insurance_policies").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: softOpening = [], refetch: refetchSoftOpening } = useQuery({
    queryKey: ["sync-soft-opening", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("soft_opening_events").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Calculate synchronized metrics
  const metrics = useMemo<PreOpeningMetrics>(() => {
    // Budget calculations
    const budgetTotal = budgets.reduce((sum, b) => sum + Number(b.estimated_amount || 0), 0);
    const budgetSpent = budgets.reduce((sum, b) => sum + Number(b.actual_amount || 0), 0);
    const budgetByCategory: Record<string, number> = {};
    budgets.forEach(b => {
      budgetByCategory[b.category || 'Other'] = (budgetByCategory[b.category || 'Other'] || 0) + Number(b.actual_amount || 0);
    });

    // Lab Ops Financial calculations (from actual sales)
    const totalRevenue = labOpsSales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);
    const totalOrders = labOpsSales.length;
    const avgCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const foodRevenue = 0; // No food tracking in lab_ops_sales
    const beverageRevenue = totalRevenue; // All sales are beverage
    const discounts = 0;
    const comps = 0;

    // Lab Ops Inventory calculations
    const activeBottles = labOpsBottles.filter(b => b.status === 'active').length;
    const lowStockBottles = labOpsBottles.filter(b => {
      const currentLevel = Number(b.current_level_ml || 0);
      const bottleSize = Number(b.bottle_size_ml || 750);
      return currentLevel < bottleSize * 0.2; // Less than 20% remaining
    }).length;
    const inventoryByCategory: Record<string, number> = {};
    labOpsBottles.forEach(b => {
      const cat = b.spirit_type || 'Other';
      inventoryByCategory[cat] = (inventoryByCategory[cat] || 0) + 1;
    });
    const totalInventoryValue = labOpsBottles.reduce((sum, b) => sum + Number(b.current_level_ml || 0), 0);

    // Lab Ops Variance calculations
    const totalVarianceCost = labOpsVariance.reduce((sum, v) => sum + Math.abs(Number(v.variance_cost || 0)), 0);
    const avgVariancePercent = labOpsVariance.length > 0 
      ? labOpsVariance.reduce((sum, v) => sum + Math.abs(Number(v.variance_percent || 0)), 0) / labOpsVariance.length 
      : 0;
    const itemsWithVariance = labOpsVariance.filter(v => Math.abs(Number(v.variance_percent || 0)) > 5).length;

    // Recruitment calculations
    const totalPositions = recruitment.reduce((sum, r) => sum + (r.positions_needed || 0), 0);
    const filledPositions = recruitment.reduce((sum, r) => sum + (r.positions_filled || 0), 0);
    const byDepartment: Record<string, { needed: number; filled: number }> = {};
    recruitment.forEach(r => {
      const dept = r.department || 'Other';
      if (!byDepartment[dept]) byDepartment[dept] = { needed: 0, filled: 0 };
      byDepartment[dept].needed += r.positions_needed || 0;
      byDepartment[dept].filled += r.positions_filled || 0;
    });

    // Training calculations (using is_mandatory as a proxy for completion)
    const completedTraining = training.filter(t => t.is_mandatory === false).length;
    const inProgressTraining = training.filter(t => t.is_mandatory === true).length;

    // Marketing calculations
    const activeCampaigns = marketing.filter(m => m.status === 'active').length;
    const scheduledCampaigns = marketing.filter(m => m.status === 'scheduled').length;
    const marketingBudget = marketing.reduce((sum, m) => sum + Number(m.budget || 0), 0);

    // Insurance calculations
    const activeInsurance = insurance.filter(i => i.status === 'active').length;
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = insurance.filter(i => {
      if (!i.expiry_date) return false;
      const expiry = new Date(i.expiry_date);
      return expiry <= thirtyDaysLater && expiry >= today;
    }).length;

    // Soft Opening calculations
    const nextEvent = softOpening.find(s => s.event_date && new Date(s.event_date) >= today);
    const daysUntil = nextEvent && nextEvent.event_date 
      ? Math.ceil((new Date(nextEvent.event_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) 
      : -1;

    // Calculate dependencies
    const dependencies: Dependency[] = [];
    const alerts: Alert[] = [];

    // Budget affects everything
    if (budgetTotal > 0 && budgetSpent > budgetTotal * 0.9) {
      alerts.push({ id: 'budget-critical', module: 'Budget', type: 'critical', message: 'Budget 90%+ spent - affects all operations' });
      dependencies.push({ from: 'Budget', to: 'All', type: 'affects', status: 'critical', message: 'Over budget' });
    }

    // Lab Ops variance alerts
    if (avgVariancePercent > 10) {
      alerts.push({ id: 'variance-critical', module: 'Financial', type: 'critical', message: `High variance: ${avgVariancePercent.toFixed(1)}% average` });
    }

    // Low stock alerts
    if (lowStockBottles > 0) {
      alerts.push({ id: 'low-stock', module: 'Inventory', type: 'warning', message: `${lowStockBottles} bottles low on stock` });
    }

    // Recruitment → Training dependency
    if (totalPositions > 0 && filledPositions < totalPositions * 0.5) {
      dependencies.push({ from: 'Recruitment', to: 'Training', type: 'blocks', status: 'warning', message: 'Need more hires before training' });
      alerts.push({ id: 'recruitment-low', module: 'Recruitment', type: 'warning', message: `Only ${filledPositions}/${totalPositions} positions filled` });
    }

    // Training → Soft Opening dependency
    if (training.length > 0 && completedTraining < training.length * 0.8) {
      dependencies.push({ from: 'Training', to: 'Soft Opening', type: 'blocks', status: 'warning', message: 'Training not complete' });
    }

    // Inventory → Soft Opening dependency
    if (labOpsBottles.length > 0 && lowStockBottles > labOpsBottles.length * 0.3) {
      dependencies.push({ from: 'Inventory', to: 'Operations', type: 'affects', status: 'warning', message: 'Inventory running low' });
    }

    // Insurance required for opening
    if (insurance.length === 0) {
      dependencies.push({ from: 'Insurance', to: 'Soft Opening', type: 'blocks', status: 'critical', message: 'No insurance policies set up' });
      alerts.push({ id: 'no-insurance', module: 'Insurance', type: 'critical', message: 'Insurance required before opening' });
    }

    // Marketing → Soft Opening synergy
    if (marketing.length > 0 && activeCampaigns > 0) {
      dependencies.push({ from: 'Marketing', to: 'Soft Opening', type: 'affects', status: 'ok', message: 'Marketing campaigns active' });
    }

    // Financial → Budget dependency
    if (totalRevenue > 0) {
      dependencies.push({ from: 'Financial', to: 'Budget', type: 'affects', status: 'ok', message: 'Revenue tracking active' });
    }

    // Calculate overall readiness score
    const scores = [
      budgets.length > 0 ? Math.min(100, budgetTotal > 0 ? ((budgetTotal - budgetSpent) / budgetTotal) * 100 : 0) : 0,
      totalPositions > 0 ? (filledPositions / totalPositions) * 100 : 0,
      training.length > 0 ? (completedTraining / training.length) * 100 : 0,
      labOpsBottles.length > 0 ? ((labOpsBottles.length - lowStockBottles) / labOpsBottles.length) * 100 : 0,
      insurance.length > 0 ? (activeInsurance / insurance.length) * 100 : 0,
    ].filter(s => s > 0);

    const overallReadiness = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Blockers for soft opening
    const blockers: string[] = [];
    if (totalPositions > 0 && filledPositions < totalPositions * 0.8) blockers.push('Staffing below 80%');
    if (training.length > 0 && completedTraining < training.length * 0.8) blockers.push('Training incomplete');
    if (labOpsBottles.length > 0 && lowStockBottles > labOpsBottles.length * 0.2) blockers.push('Low inventory stock');
    if (insurance.length > 0 && activeInsurance < insurance.length) blockers.push('Insurance incomplete');
    if (avgVariancePercent > 15) blockers.push('High variance issues');

    return {
      budget: {
        total: budgetTotal,
        spent: budgetSpent,
        remaining: budgetTotal - budgetSpent,
        variance: budgetSpent - budgetTotal,
        byCategory: budgetByCategory,
      },
      financial: {
        totalRevenue,
        totalOrders,
        avgCheck,
        foodRevenue,
        beverageRevenue,
        discounts,
        comps,
      },
      recruitment: {
        totalPositions,
        filled: filledPositions,
        pending: totalPositions - filledPositions,
        fillRate: totalPositions > 0 ? (filledPositions / totalPositions) * 100 : 0,
        byDepartment,
      },
      training: {
        totalPrograms: training.length,
        completed: completedTraining,
        inProgress: inProgressTraining,
        completionRate: training.length > 0 ? (completedTraining / training.length) * 100 : 0,
      },
      inventory: {
        totalItems: labOpsBottles.length + labOpsInventoryItems.length,
        activeBottles,
        lowStock: lowStockBottles,
        totalValue: totalInventoryValue,
        byCategory: inventoryByCategory,
      },
      marketing: {
        totalCampaigns: marketing.length,
        active: activeCampaigns,
        scheduled: scheduledCampaigns,
        totalBudget: marketingBudget,
      },
      utilities: {
        totalSetup: 0,
        connected: 0,
        pending: 0,
      },
      insurance: {
        totalPolicies: insurance.length,
        active: activeInsurance,
        expiringSoon,
      },
      uniforms: {
        totalOrders: 0,
        delivered: 0,
        pending: 0,
      },
      health: {
        totalAudits: 0,
        passed: 0,
        issues: 0,
      },
      softOpening: {
        daysUntil,
        readinessScore: overallReadiness,
        blockers,
      },
      variance: {
        totalVariance: totalVarianceCost,
        variancePercent: avgVariancePercent,
        itemsWithVariance,
      },
      overallReadiness,
      dependencies,
      alerts,
    };
  }, [budgets, recruitment, training, inventory, marketing, insurance, softOpening, labOpsSales, labOpsBottles, labOpsInventoryItems, labOpsVariance]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refetchBudgets(),
      refetchRecruitment(),
      refetchTraining(),
      refetchInventory(),
      refetchMarketing(),
      refetchInsurance(),
      refetchSoftOpening(),
      refetchLabOpsSales(),
      refetchLabOpsBottles(),
      refetchLabOpsInventory(),
      refetchLabOpsVariance(),
    ]);
  }, [refetchBudgets, refetchRecruitment, refetchTraining, refetchInventory, refetchMarketing, refetchInsurance, refetchSoftOpening, refetchLabOpsSales, refetchLabOpsBottles, refetchLabOpsInventory, refetchLabOpsVariance]);

  return {
    metrics,
    refreshAll,
    rawData: {
      budgets,
      recruitment,
      training,
      inventory,
      marketing,
      insurance,
      softOpening,
      labOpsSales,
      labOpsBottles,
      labOpsInventoryItems,
      labOpsVariance,
    },
  };
};
