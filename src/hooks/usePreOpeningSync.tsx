import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
    ordered: number;
    received: number;
    pendingValue: number;
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
  message: string;
  action?: string;
}

export const usePreOpeningSync = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all pre-opening data
  const { data: budgets = [] } = useQuery({
    queryKey: ["sync-budgets"],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("pre_opening_budgets").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: recruitment = [] } = useQuery({
    queryKey: ["sync-recruitment"],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("recruitment_positions").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: training = [] } = useQuery({
    queryKey: ["sync-training"],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("training_programs").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["sync-inventory"],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("opening_inventory").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: marketing = [] } = useQuery({
    queryKey: ["sync-marketing"],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("marketing_campaigns").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: insurance = [] } = useQuery({
    queryKey: ["sync-insurance"],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("insurance_policies").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: softOpening = [] } = useQuery({
    queryKey: ["sync-soft-opening"],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("soft_opening_events").select("*").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
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

    // Inventory calculations (using order_status field)
    const orderedInventory = inventory.filter(i => i.order_status === 'ordered' || i.order_status === 'received').length;
    const receivedInventory = inventory.filter(i => i.order_status === 'received').length;
    const pendingValue = inventory
      .filter(i => i.order_status !== 'received')
      .reduce((sum, i) => sum + Number(i.unit_cost || 0) * Number(i.opening_quantity || 0), 0);

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
    if (inventory.length > 0 && receivedInventory < inventory.length * 0.9) {
      dependencies.push({ from: 'Inventory', to: 'Soft Opening', type: 'blocks', status: 'warning', message: 'Inventory not fully received' });
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

    // Calculate overall readiness score
    const scores = [
      budgets.length > 0 ? Math.min(100, budgetTotal > 0 ? ((budgetTotal - budgetSpent) / budgetTotal) * 100 : 0) : 0,
      totalPositions > 0 ? (filledPositions / totalPositions) * 100 : 0,
      training.length > 0 ? (completedTraining / training.length) * 100 : 0,
      inventory.length > 0 ? (receivedInventory / inventory.length) * 100 : 0,
      insurance.length > 0 ? (activeInsurance / insurance.length) * 100 : 0,
    ].filter(s => s > 0);

    const overallReadiness = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Blockers for soft opening
    const blockers: string[] = [];
    if (totalPositions > 0 && filledPositions < totalPositions * 0.8) blockers.push('Staffing below 80%');
    if (training.length > 0 && completedTraining < training.length * 0.8) blockers.push('Training incomplete');
    if (inventory.length > 0 && receivedInventory < inventory.length * 0.9) blockers.push('Inventory pending');
    if (insurance.length > 0 && activeInsurance < insurance.length) blockers.push('Insurance incomplete');

    return {
      budget: {
        total: budgetTotal,
        spent: budgetSpent,
        remaining: budgetTotal - budgetSpent,
        variance: budgetSpent - budgetTotal,
        byCategory: budgetByCategory,
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
        totalItems: inventory.length,
        ordered: orderedInventory,
        received: receivedInventory,
        pendingValue,
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
      overallReadiness,
      dependencies,
      alerts,
    };
  }, [budgets, recruitment, training, inventory, marketing, insurance, softOpening]);

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["sync-budgets"] });
    queryClient.invalidateQueries({ queryKey: ["sync-recruitment"] });
    queryClient.invalidateQueries({ queryKey: ["sync-training"] });
    queryClient.invalidateQueries({ queryKey: ["sync-inventory"] });
    queryClient.invalidateQueries({ queryKey: ["sync-marketing"] });
    queryClient.invalidateQueries({ queryKey: ["sync-insurance"] });
    queryClient.invalidateQueries({ queryKey: ["sync-soft-opening"] });
  }, [queryClient]);

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
    },
  };
};
