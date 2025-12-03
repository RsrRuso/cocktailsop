import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useGroupAdmin = (groupId: string | null) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminStatus = useCallback(async () => {
    if (!user || !groupId) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mixologist_group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        const adminStatus = data?.role === 'admin';
        console.log('Group admin check:', { groupId, userId: user.id, role: data?.role, isAdmin: adminStatus });
        setIsAdmin(adminStatus);
      }
    } catch (err) {
      console.error('Exception checking admin status:', err);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, [user, groupId]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  return { isAdmin, isLoading };
};
