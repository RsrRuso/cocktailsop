import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AICreditsContextType {
  requestsUsed: number;
  requestsLimit: number;
  isLoading: boolean;
  isPremium: boolean;
  refreshUsage: () => Promise<void>;
  trackRequest: (feature: string, model?: string) => Promise<boolean>;
  showUpgradePrompt: boolean;
  setShowUpgradePrompt: (show: boolean) => void;
  usagePercentage: number;
}

const AICreditsContext = createContext<AICreditsContextType | undefined>(undefined);

// Lovable AI pricing model - requests per tier
const FREE_TIER_REQUESTS = 50; // Free requests per month
const PAID_TIER_REQUESTS = 500; // Paid tier limit before overage

// Cost per request by model (in credits/tokens - for tracking)
const MODEL_COSTS: Record<string, number> = {
  'gemini-2.5-flash-lite': 0.5,  // Cheapest
  'gemini-2.5-flash': 1,         // Default - balanced
  'gemini-2.5-pro': 3,           // Premium
  'gpt-5-nano': 0.5,
  'gpt-5-mini': 1.5,
  'gpt-5': 4,
};

// Feature to model mapping
const FEATURE_MODELS: Record<string, string> = {
  'caption-generator': 'gemini-2.5-flash',
  'hashtag-suggester': 'gemini-2.5-flash-lite',
  'story-analyzer': 'gemini-2.5-flash',
  'music-matcher': 'gemini-2.5-flash-lite',
  'post-generator': 'gemini-2.5-flash',
  'comment-rewrite': 'gemini-2.5-flash-lite',
  'smart-reply': 'gemini-2.5-flash-lite',
  'matrix-chat': 'gemini-2.5-flash',
  'email-assistant': 'gemini-2.5-flash',
  'status-suggestions': 'gemini-2.5-flash-lite',
  'analytics-chat': 'gemini-2.5-flash',
};

export function AICreditsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [requestsUsed, setRequestsUsed] = useState(0);
  const [requestsLimit, setRequestsLimit] = useState(FREE_TIER_REQUESTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const usagePercentage = Math.min((requestsUsed / requestsLimit) * 100, 100);

  const refreshUsage = useCallback(async () => {
    if (!user?.id) {
      setRequestsUsed(0);
      setRequestsLimit(FREE_TIER_REQUESTS);
      setIsLoading(false);
      return;
    }

    try {
      // Get current month's usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: transactions, error } = await supabase
        .from('ai_credit_transactions')
        .select('credits_amount, transaction_type, created_at')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      if (error) throw error;

      // Calculate usage (requests made this month)
      const usage = transactions?.filter(t => t.transaction_type === 'usage')
        .reduce((acc, t) => acc + 1, 0) || 0;

      // Check for premium status (purchased credits)
      const purchased = transactions?.filter(t => 
        t.transaction_type === 'purchase' || t.transaction_type === 'bonus'
      ).reduce((acc, t) => acc + t.credits_amount, 0) || 0;

      const hasPremium = purchased > 0;
      
      setRequestsUsed(usage);
      setIsPremium(hasPremium);
      setRequestsLimit(hasPremium ? PAID_TIER_REQUESTS : FREE_TIER_REQUESTS);
    } catch (error) {
      console.error('Error fetching usage:', error);
      setRequestsUsed(0);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  const trackRequest = async (feature: string, model?: string): Promise<boolean> => {
    if (!user?.id) {
      setShowUpgradePrompt(true);
      return false;
    }

    // Check if near limit
    if (requestsUsed >= requestsLimit) {
      setShowUpgradePrompt(true);
      return false;
    }

    const usedModel = model || FEATURE_MODELS[feature] || 'gemini-2.5-flash';
    const cost = MODEL_COSTS[usedModel] || 1;

    try {
      const { error } = await supabase.from('ai_credit_transactions').insert({
        user_id: user.id,
        credits_amount: cost,
        transaction_type: 'usage',
        feature_used: feature,
        description: `AI request: ${feature} (${usedModel})`,
      });

      if (error) throw error;

      setRequestsUsed(prev => prev + 1);
      
      // Warn when approaching limit
      if (requestsUsed + 1 >= requestsLimit * 0.8) {
        console.log('Approaching AI usage limit');
      }
      
      return true;
    } catch (error) {
      console.error('Error tracking request:', error);
      return true; // Allow request even if tracking fails
    }
  };

  return (
    <AICreditsContext.Provider
      value={{
        requestsUsed,
        requestsLimit,
        isLoading,
        isPremium,
        refreshUsage,
        trackRequest,
        showUpgradePrompt,
        setShowUpgradePrompt,
        usagePercentage,
      }}
    >
      {children}
    </AICreditsContext.Provider>
  );
}

export function useAICredits() {
  const context = useContext(AICreditsContext);
  if (context === undefined) {
    throw new Error('useAICredits must be used within an AICreditsProvider');
  }
  return context;
}

export { FEATURE_MODELS, MODEL_COSTS };
