import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActiveStatus {
  user_id: string;
  hasStatus: boolean;
}

export const useActiveStatuses = () => {
  const [activeStatuses, setActiveStatuses] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    fetchActiveStatuses();

    const channel = supabase
      .channel("active_statuses")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_status",
        },
        () => {
          fetchActiveStatuses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActiveStatuses = async () => {
    const { data } = await supabase
      .from("user_status")
      .select("user_id")
      .gt("expires_at", new Date().toISOString());

    if (data) {
      const statusMap = new Map<string, boolean>();
      data.forEach((status) => {
        statusMap.set(status.user_id, true);
      });
      setActiveStatuses(statusMap);
    }
  };

  const hasStatus = (userId: string) => activeStatuses.get(userId) || false;

  return { hasStatus };
};
