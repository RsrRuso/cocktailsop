import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useManagerRole } from './useManagerRole';

export const useInventoryAccess = () => {
  const { user } = useAuth();
  const { isManager } = useManagerRole();
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      // Managers always have access
      if (isManager) {
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      // Check if user has approved access request
      try {
        const { data, error } = await supabase
          .from('access_requests')
          .select('status')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw error;
        }

        setHasAccess(!!data);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [user, isManager]);

  return { hasAccess, isLoading };
};
