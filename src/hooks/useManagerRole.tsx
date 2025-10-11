import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Non-managerial positions (bartenders and mixologists)
const NON_MANAGERIAL_TITLES = ['bartender', 'mixologist'];

export const useManagerRole = () => {
  const { user, profile } = useAuth();
  const [isManager, setIsManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkManagerRole = async () => {
      if (!user) {
        setIsManager(false);
        setIsLoading(false);
        return;
      }

      // Check if user is a founder - founders have access to everything
      const { data: founderRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'founder')
        .single();

      if (founderRole) {
        setIsManager(true);
        setIsLoading(false);
        return;
      }

      // Check if user has explicit manager role
      const { data: managerRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'manager')
        .single();

      if (managerRole) {
        setIsManager(true);
        setIsLoading(false);
        return;
      }

      // Check if user's professional title is managerial (not bartender/mixologist)
      if (profile?.professional_title) {
        const isNonManagerial = NON_MANAGERIAL_TITLES.includes(
          profile.professional_title.toLowerCase()
        );
        setIsManager(!isNonManagerial);
      } else {
        setIsManager(false);
      }

      setIsLoading(false);
    };

    checkManagerRole();
  }, [user, profile]);

  return { isManager, isLoading };
};