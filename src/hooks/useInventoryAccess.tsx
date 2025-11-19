import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useManagerRole } from './useManagerRole';

export const useInventoryAccess = () => {
  const { user } = useAuth();
  const { isManager, isLoading: managerLoading } = useManagerRole();
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      // Wait for manager role to load first
      if (managerLoading) {
        return;
      }

      // Managers always have access
      if (isManager) {
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      try {
        // Check if user is a workspace member
        const { data: memberData, error: memberError } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (memberError) throw memberError;

        // If user is a workspace member, grant access
        if (memberData && memberData.length > 0) {
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

        setHasAccess(!!accessData && accessData.length > 0);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [user, isManager, managerLoading]);

  return { hasAccess, isLoading };
};
