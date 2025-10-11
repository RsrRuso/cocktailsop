import { createContext, useContext, ReactNode } from 'react';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { InAppNotification } from '@/components/InAppNotification';

interface InAppNotificationContextType {
  showNotification: (
    title: string,
    message: string,
    type?: 'message' | 'like' | 'comment' | 'follow' | 'default'
  ) => void;
}

const InAppNotificationContext = createContext<InAppNotificationContextType | undefined>(undefined);

export const InAppNotificationProvider = ({ children }: { children: ReactNode }) => {
  const { currentNotification, showNotification, closeNotification } = useInAppNotifications();

  return (
    <InAppNotificationContext.Provider value={{ showNotification }}>
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
