import { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { InAppNotification } from '@/components/InAppNotification';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface InAppNotificationContextType {
  showNotification: (
    title: string,
    message: string,
    type?: 'message' | 'like' | 'comment' | 'follow' | 'new_user' | 'transaction' | 'receiving' | 'default',
    onClick?: () => void
  ) => void;
}

const InAppNotificationContext = createContext<InAppNotificationContextType | undefined>(undefined);

export const InAppNotificationProvider = ({ children }: { children: ReactNode }) => {
  const { currentNotification, showNotification, closeNotification } = useInAppNotifications();
  const { user } = useAuth();

  // Setup global realtime subscriptions for inventory transactions
  useEffect(() => {
    if (!user) return;

    const transferChannel = supabase
      .channel('global-transfers')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_transfers'
        },
        (payload) => {
          showNotification(
            '📦 New Transfer',
            'Inventory transfer initiated',
            'transaction',
            () => window.location.href = '/inventory-transactions'
          );
        }
      )
      .subscribe();

    const inventoryChannel = supabase
      .channel('global-inventory')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory'
        },
        (payload) => {
          showNotification(
            '✅ New Receiving',
            'Inventory received successfully',
            'receiving',
            () => window.location.href = '/inventory-transactions'
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transferChannel);
      supabase.removeChannel(inventoryChannel);
    };
  }, [user, showNotification]);

  const contextValue = useMemo(() => ({ showNotification }), [showNotification]);

  return (
    <InAppNotificationContext.Provider value={contextValue}>
      {children}
      <InAppNotification 
        notification={currentNotification} 
        onClose={closeNotification}
      />
    </InAppNotificationContext.Provider>
  );
};

export const useInAppNotificationContext = () => {
  const context = useContext(InAppNotificationContext);
  if (context === undefined) {
    throw new Error('useInAppNotificationContext must be used within InAppNotificationProvider');
  }
  return context;
};
