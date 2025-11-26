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
      
      // Check if user owns any workspace
      const { data: ownedWorkspaces, error: ownerError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      if (ownerError) throw ownerError;

      console.log('Workspace owner check:', ownedWorkspaces);

      // If user owns a workspace, grant access
      if (ownedWorkspaces && ownedWorkspaces.length > 0) {
        console.log('User owns workspace, granting access');
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      // Check if user is a workspace member
      const { data: memberData, error: memberError } = await supabase
        .from('workspace_members_with_owner')
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

      // All authenticated users have access - they can create their own workspace
      console.log('Granting access to all authenticated users');
      setHasAccess(true);
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
          table: 'workspace_members_with_owner',
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
