import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFifoWorkspace } from './useFifoWorkspace';

export const usePendingFifoAccessRequests = () => {
  const { user } = useAuth();
  const { currentWorkspace, workspaces } = useFifoWorkspace();
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCount = async () => {
    if (!user) {
      setCount(0);
      setIsLoading(false);
      return;
    }

    try {
      // Get all FIFO workspaces owned by user
      const ownedWorkspaceIds = workspaces
        .filter(w => w.owner_id === user.id)
        .map(w => w.id);

      if (ownedWorkspaceIds.length === 0) {
        setCount(0);
        setIsLoading(false);
        return;
      }

      // Count pending requests across all owned workspaces
      const { count: requestCount, error } = await supabase
        .from('access_requests')
        .select('*', { count: 'exact', head: true })
        .in('workspace_id', ownedWorkspaceIds)
        .eq('status', 'pending');

      if (error) throw error;

      setCount(requestCount || 0);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();

    // Set up realtime subscription for access requests
    const channel = supabase
      .channel('fifo-access-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'access_requests',
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, workspaces]);

  return { count, isLoading, refetch: fetchCount };
};
