import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePushNotifications = () => {
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  const showNotification = useCallback(async (
    title: string,
    body: string,
    options?: {
      icon?: string;
      badge?: string;
      tag?: string;
      data?: any;
      requireInteraction?: boolean;
      silent?: boolean;
    }
  ) => {
    const hasPermission = await requestPermission();
    
    if (!hasPermission) {
      return;
    }

    // Check if service worker is available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Use service worker to show notification
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: options?.icon || '/icon-192.png',
        badge: options?.badge || '/icon-192.png',
        tag: options?.tag || 'notification',
        requireInteraction: options?.requireInteraction || false,
        silent: options?.silent || false,
        data: options?.data || {}
      });
      
      // Play notification sound (not silent by default)
      if (!options?.silent) {
        try {
          const audio = new Audio('/notification.wav');
          audio.volume = 0.5;
          await audio.play();
        } catch (error) {
          // Audio play failed (user interaction required or not allowed)
        }
      }
    } else {
      // Fallback to regular notification API
      const notification = new Notification(title, {
        body,
        icon: options?.icon || '/icon-192.png',
        badge: options?.badge || '/icon-192.png',
        tag: options?.tag || 'notification',
        requireInteraction: options?.requireInteraction || false,
        silent: options?.silent || false,
        data: options?.data || {}
      });

      // Play sound for fallback notifications too
      if (!options?.silent) {
        try {
          const audio = new Audio('/notification.wav');
          audio.volume = 0.5;
          await audio.play();
        } catch (error) {
          // Audio play failed
        }
      }

      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        
        if (options?.data?.url) {
          window.location.href = options.data.url;
        }
      };
    }
  }, [requestPermission]);

  const initializeNotifications = useCallback(async () => {
    // Request permission on initialization
    const hasPermission = await requestPermission();
    
    if (hasPermission) {
      // Register service worker if not already registered
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered for notifications');
          
          // Set up notification listener
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'NOTIFICATION_CLICKED') {
              // Handle notification click
              if (event.data.url) {
                window.location.href = event.data.url;
              }
            }
          });
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    }
  }, [requestPermission]);

  useEffect(() => {
    // Initialize notifications when component mounts
    initializeNotifications();
  }, [initializeNotifications]);

  return {
    showNotification,
    requestPermission,
    hasPermission: typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission === 'granted' 
      : false
  };
};
