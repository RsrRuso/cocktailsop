import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AICreditsContextType {
  credits: number;
  isLoading: boolean;
  isPremium: boolean;
  refreshCredits: () => Promise<void>;
  useCredits: (amount: number, feature: string) => Promise<boolean>;
  showUpgradePrompt: boolean;
  setShowUpgradePrompt: (show: boolean) => void;
}

const AICreditsContext = createContext<AICreditsContextType | undefined>(undefined);

const FREE_DAILY_CREDITS = 10;
const CREDIT_COSTS: Record<string, number> = {
  'caption-generator': 1,
  'hashtag-suggester': 1,
  'story-analyzer': 2,
  'music-matcher': 1,
  'post-generator': 2,
  'comment-rewrite': 1,
  'smart-reply': 1,
  'matrix-chat': 1,
  'email-assistant': 2,
  'status-suggestions': 1,
};

export function AICreditsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [credits, setCredits] = useState(FREE_DAILY_CREDITS);
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const refreshCredits = useCallback(async () => {
    if (!user?.id) {
      setCredits(FREE_DAILY_CREDITS);
      setIsLoading(false);
      return;
    }

    try {
      // Check for existing credit balance
      const { data: transactions, error } = await supabase
        .from('ai_credit_transactions')
        .select('credits_amount, transaction_type')
        .eq('user_id', user.id);

      if (error) throw error;

      // Calculate balance from transactions
      const balance = transactions?.reduce((acc, t) => {
        return t.transaction_type === 'purchase' || t.transaction_type === 'bonus'
          ? acc + t.credits_amount
          : acc - t.credits_amount;
      }, FREE_DAILY_CREDITS) || FREE_DAILY_CREDITS;

      setCredits(Math.max(0, balance));
      setIsPremium(balance > FREE_DAILY_CREDITS * 5);
    } catch (error) {
      console.error('Error fetching credits:', error);
      setCredits(FREE_DAILY_CREDITS);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  const useCredits = async (amount: number, feature: string): Promise<boolean> => {
    if (!user?.id) {
      setShowUpgradePrompt(true);
      return false;
    }

    if (credits < amount) {
      setShowUpgradePrompt(true);
      return false;
    }

    try {
      const { error } = await supabase.from('ai_credit_transactions').insert({
        user_id: user.id,
        credits_amount: amount,
        transaction_type: 'usage',
        feature_used: feature,
        description: `Used ${amount} credit(s) for ${feature}`,
      });

      if (error) throw error;

      setCredits(prev => Math.max(0, prev - amount));
      return true;
    } catch (error) {
      console.error('Error using credits:', error);
      return false;
    }
  };

  return (
    <AICreditsContext.Provider
      value={{
        credits,
        isLoading,
        isPremium,
        refreshCredits,
        useCredits,
        showUpgradePrompt,
        setShowUpgradePrompt,
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

export { CREDIT_COSTS };
