import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePendingAccessRequests = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCount(0);
      setLoading(false);
      return;
    }

    const fetchCount = async () => {
      try {
        // Get workspaces owned by the user
        const { data: workspaces } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', user.id);

        if (!workspaces || workspaces.length === 0) {
          setCount(0);
          setLoading(false);
          return;
        }

        const workspaceIds = workspaces.map(w => w.id);

        // Count pending requests for these workspaces
        const { count: pendingCount, error } = await supabase
          .from('access_requests')
          .select('*', { count: 'exact', head: true })
          .in('workspace_id', workspaceIds)
          .eq('status', 'pending');

        if (error) throw error;

        setCount(pendingCount || 0);
      } catch (error) {
        console.error('Error fetching pending requests count:', error);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();

    // Subscribe to changes
    const channel = supabase
      .channel('access_requests_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'access_requests'
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { count, loading };
};
