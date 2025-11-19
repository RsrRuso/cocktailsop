import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useManagerRole } from './useManagerRole';

export const useInventoryAccess = () => {
  const { user } = useAuth();
  const { isManager, isLoading: managerLoading } = useManagerRole();
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAccess = useCallback(async () => {
    console.log('Checking inventory access for user:', user?.id);
    
    if (!user) {
      console.log('No user, denying access');
      setHasAccess(false);
      setIsLoading(false);
      return;
    }

    // Wait for manager role to load first
    if (managerLoading) {
      console.log('Manager role still loading...');
      return;
    }

    // Managers always have access
    if (isManager) {
      console.log('User is manager, granting access');
      setHasAccess(true);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Check if user is a workspace member
      const { data: memberData, error: memberError } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (memberError) throw memberError;

      console.log('Workspace member check:', memberData);

      // If user is a workspace member, grant access
      if (memberData && memberData.length > 0) {
        console.log('User is workspace member, granting access');
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      // Check if user has approved access request (legacy)
      const { data: accessData, error: accessError } = await supabase
        .from('access_requests')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .limit(1);

      if (accessError && accessError.code !== 'PGRST116') {
        throw accessError;
      }

      console.log('Access request check:', accessData);
      const granted = !!accessData && accessData.length > 0;
      console.log('Final access decision:', granted);
      setHasAccess(granted);
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  }, [user, isManager, managerLoading]);

  useEffect(() => {
    checkAccess();

    // Subscribe to workspace_members changes for real-time updates
    const channel = supabase
      .channel('workspace_members_access')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          console.log('Workspace membership changed, rechecking access');
          checkAccess();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkAccess, user?.id]);

  return { hasAccess, isLoading, refetch: checkAccess };
};
