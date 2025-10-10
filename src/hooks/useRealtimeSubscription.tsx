import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionOptions {
  channel: string;
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onUpdate: () => void;
  debounceMs?: number;
}

export const useRealtimeSubscription = ({
  channel,
  table,
  filter,
  event = '*',
  onUpdate,
  debounceMs = 1000,
}: SubscriptionOptions) => {
  const debounceRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const debouncedUpdate = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (isMountedRef.current) onUpdate();
      }, debounceMs);
    };

    const subscriptionConfig: any = {
      event,
      schema: 'public',
      table,
    };

    if (filter) {
      subscriptionConfig.filter = filter;
    }

    const realtimeChannel = supabase
      .channel(channel)
      .on('postgres_changes', subscriptionConfig, debouncedUpdate)
      .subscribe();

    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(realtimeChannel);
    };
  }, [channel, table, filter, event, debounceMs]);
};
