import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProactiveSuggestion {
  id: string;
  type: 'inventory' | 'batch' | 'schedule' | 'social' | 'career' | 'general';
  icon: string;
  title: string;
  message: string;
  action?: {
    label: string;
    route: string;
  };
  priority: 'low' | 'medium' | 'high';
  daysAgo?: number;
}

export function useMatrixProactiveSuggestions() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const newSuggestions: ProactiveSuggestion[] = [];

      // Check inventory activity
      const { data: inventoryActivity } = await supabase
        .from('inventory_activity_log')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!inventoryActivity?.length) {
        newSuggestions.push({
          id: 'no-inventory',
          type: 'inventory',
          icon: '📦',
          title: 'Start tracking inventory',
          message: "You haven't logged any inventory yet. Set up your first store and start tracking!",
          action: { label: 'Open Inventory', route: '/inventory-manager' },
          priority: 'medium'
        });
      } else {
        const lastActivity = new Date(inventoryActivity[0].created_at);
        const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000));
        
        if (daysSinceActivity >= 3) {
          newSuggestions.push({
            id: 'inventory-inactive',
            type: 'inventory',
            icon: '⚠️',
            title: 'Inventory check needed',
            message: `You haven't logged inventory in ${daysSinceActivity} days. Keep your stock accurate!`,
            action: { label: 'Log Inventory', route: '/inventory-manager' },
            priority: 'high',
            daysAgo: daysSinceActivity
          });
        }
      }

      // Check batch production activity
      const { data: batchActivity } = await supabase
        .from('batch_productions')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!batchActivity?.length) {
        newSuggestions.push({
          id: 'no-batch',
          type: 'batch',
          icon: '🧪',
          title: 'Try batch production',
          message: "Scale your recipes efficiently with our batch calculator. Perfect for prep!",
          action: { label: 'Batch Calculator', route: '/batch-calculator' },
          priority: 'low'
        });
      } else {
        const lastBatch = new Date(batchActivity[0].created_at);
        const daysSinceBatch = Math.floor((now.getTime() - lastBatch.getTime()) / (24 * 60 * 60 * 1000));
        
        if (daysSinceBatch >= 5) {
          newSuggestions.push({
            id: 'batch-inactive',
            type: 'batch',
            icon: '🍸',
            title: 'Time for batch prep?',
            message: `Last batch production was ${daysSinceBatch} days ago. Need to prep for service?`,
            action: { label: 'Create Batch', route: '/batch-calculator' },
            priority: 'medium',
            daysAgo: daysSinceBatch
          });
        }
      }

      // Check social engagement
      const { data: recentPosts } = await supabase
        .from('posts')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!recentPosts?.length) {
        newSuggestions.push({
          id: 'no-posts',
          type: 'social',
          icon: '📸',
          title: 'Share your work!',
          message: "Show off your cocktails and creations. Build your professional portfolio!",
          action: { label: 'Create Post', route: '/create' },
          priority: 'low'
        });
      } else {
        const lastPost = new Date(recentPosts[0].created_at);
        const daysSincePost = Math.floor((now.getTime() - lastPost.getTime()) / (24 * 60 * 60 * 1000));
        
        if (daysSincePost >= 7) {
          newSuggestions.push({
            id: 'social-inactive',
            type: 'social',
            icon: '✨',
            title: 'Your followers miss you!',
            message: `Haven't posted in ${daysSincePost} days. Share what you've been working on!`,
            action: { label: 'Share Content', route: '/create' },
            priority: 'low',
            daysAgo: daysSincePost
          });
        }
      }

      // Check staff schedule (if manager)
      const { data: schedules } = await supabase
        .from('staff_schedules')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (schedules?.length) {
        const lastSchedule = new Date(schedules[0].created_at);
        const daysSinceSchedule = Math.floor((now.getTime() - lastSchedule.getTime()) / (24 * 60 * 60 * 1000));
        
        if (daysSinceSchedule >= 6) {
          newSuggestions.push({
            id: 'schedule-update',
            type: 'schedule',
            icon: '📅',
            title: 'Update staff schedule',
            message: `Schedule is ${daysSinceSchedule} days old. Time to plan the upcoming week?`,
            action: { label: 'Schedule Staff', route: '/staff-scheduling' },
            priority: 'high',
            daysAgo: daysSinceSchedule
          });
        }
      }

      // Check career profile completeness
      const { data: careerProfile } = await supabase
        .from('career_profiles')
        .select('skills, certifications, career_goals')
        .eq('user_id', user.id)
        .single();

      if (!careerProfile) {
        newSuggestions.push({
          id: 'no-career',
          type: 'career',
          icon: '🎯',
          title: 'Set up your career profile',
          message: "Define your skills and goals for personalized career recommendations!",
          action: { label: 'Career Profile', route: '/matrix-ai' },
          priority: 'medium'
        });
      } else if (!careerProfile.skills?.length || !careerProfile.career_goals?.length) {
        newSuggestions.push({
          id: 'incomplete-career',
          type: 'career',
          icon: '📈',
          title: 'Complete your career profile',
          message: "Add your skills and goals to unlock personalized career insights!",
          action: { label: 'Update Profile', route: '/matrix-ai' },
          priority: 'low'
        });
      }

      // Check certifications expiring soon
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const { data: expiringCerts } = await supabase
        .from('certifications')
        .select('title, expiry_date')
        .eq('user_id', user.id)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', thirtyDaysFromNow.toISOString())
        .gte('expiry_date', now.toISOString());

      if (expiringCerts?.length) {
        newSuggestions.push({
          id: 'cert-expiring',
          type: 'career',
          icon: '🏆',
          title: 'Certification expiring soon!',
          message: `Your "${expiringCerts[0].title}" expires soon. Plan for renewal!`,
          action: { label: 'View Certifications', route: '/profile' },
          priority: 'high'
        });
      }

      // Check low stock items
      const { count: lowStockCount, error: lowStockError } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .lte('quantity', 5)
        .gt('quantity', 0);

      if (!lowStockError && lowStockCount && lowStockCount > 0) {
        newSuggestions.push({
          id: 'low-stock',
          type: 'inventory',
          icon: '📉',
          title: 'Low stock alert',
          message: `You have items running low on stock. Check and reorder!`,
          action: { label: 'View Low Stock', route: '/low-stock-inventory' },
          priority: 'high'
        });
      }

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      newSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      setSuggestions(newSuggestions.slice(0, 5)); // Max 5 suggestions
    } catch (error) {
      console.error('Error fetching proactive suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  }, []);

  return { suggestions, loading, dismissSuggestion, refetch: fetchSuggestions };
}
