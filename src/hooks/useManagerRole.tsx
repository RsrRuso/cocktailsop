import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useManagerRole = () => {
  const { user } = useAuth();
  const [isManager, setIsManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkManagerRole = async () => {
      if (!user) {
        setIsManager(false);
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'manager')
        .single();

      setIsManager(!!data);
      setIsLoading(false);
    };

    checkManagerRole();
  }, [user]);

  return { isManager, isLoading };
};