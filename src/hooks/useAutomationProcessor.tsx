import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Background hook that processes pending automation logs
 * and fires the corresponding webhooks automatically
 */
export const useAutomationProcessor = () => {
  const { user } = useAuth();
  const processingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!user) return;

    const processPendingAutomations = async () => {
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        // Get pending automation logs from the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { data: pendingLogs } = await supabase
          .from('automation_logs')
          .select('id, trigger_id, payload')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .gte('executed_at', fiveMinutesAgo)
          .limit(10);

        if (!pendingLogs || pendingLogs.length === 0) {
          return;
        }

        console.log(`Processing ${pendingLogs.length} pending automations`);

        // Process each pending log
        for (const log of pendingLogs) {
          try {
            // Call the trigger-automation edge function
            const { data, error } = await supabase.functions.invoke('trigger-automation', {
              body: {
                triggerId: log.trigger_id,
                payload: log.payload,
              },
            });

            if (error) {
              console.error('Error firing automation:', error);
              // Update log status to failed
              await supabase
                .from('automation_logs')
                .update({
                  status: 'failed',
                  error_message: error.message,
                })
                .eq('id', log.id);
            } else if (data?.success) {
              // Update log status to success
              await supabase
                .from('automation_logs')
                .update({
                  status: 'success',
                  response: data,
                })
                .eq('id', log.id);
            }
          } catch (err) {
            console.error('Error processing automation log:', err);
          }
        }
      } catch (error) {
        console.error('Error in automation processor:', error);
      } finally {
        processingRef.current = false;
      }
    };

    // Run immediately
    processPendingAutomations();

    // Then run every 30 seconds
    intervalRef.current = setInterval(processPendingAutomations, 30000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user]);
};