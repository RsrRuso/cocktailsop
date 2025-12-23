import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useTrackPresence } from '@/components/OnlineStatusIndicator';
import { getCache, setCache } from '@/lib/indexedDBCache';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  isLoading: boolean;
  isPendingPasswordReset: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isPendingPasswordReset: false,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Helper to check if current URL has password recovery params
const isPasswordRecoveryUrl = () => {
  const hash = window.location.hash;
  if (!hash) return false;
  const hashParams = new URLSearchParams(hash.substring(1));
  return hashParams.get('type') === 'recovery' || 
         (hashParams.get('access_token') && window.location.pathname.includes('password-reset'));
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPendingPasswordReset, setIsPendingPasswordReset] = useState(false);
  
  // Prevent concurrent refresh calls
  const isRefreshingRef = useRef(false);
  const lastRefreshRef = useRef(0);
  const MIN_REFRESH_INTERVAL = 5000; // Minimum 5 seconds between refreshes

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
        // Persist for instant avatar/cover next app start
        setCache('profiles', userId, data).catch(() => {
          // ignore cache failures (private mode, quotas, etc.)
        });

        // Preload critical images
        if (data.avatar_url) {
          const img = new Image();
          img.src = data.avatar_url;
        }
        if (data.cover_url) {
          const img = new Image();
          img.src = data.cover_url;
        }
      }
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Check if this is a password recovery URL on mount
    if (isPasswordRecoveryUrl()) {
      setIsPendingPasswordReset(true);
    }

    const syncSession = async () => {
      // Don't sync session if user is in password recovery mode
      if (isPasswordRecoveryUrl()) {
        return;
      }

      // Prevent concurrent refreshes and rate limit
      const now = Date.now();
      if (isRefreshingRef.current || (now - lastRefreshRef.current < MIN_REFRESH_INTERVAL)) {
        return;
      }

      isRefreshingRef.current = true;
      lastRefreshRef.current = now;

      try {
        // Just get the current session - don't force refresh unless expired
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session) {
          // Only refresh if token is close to expiring (within 5 minutes)
          const expiresAt = session.expires_at;
          const fiveMinutesFromNow = Math.floor(Date.now() / 1000) + 300;
          
          if (expiresAt && expiresAt < fiveMinutesFromNow) {
            // Token is expiring soon, refresh it
            const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
            if (refreshedSession && isMounted) {
              setSession(refreshedSession);
              setUser(refreshedSession.user);
            }
          } else {
            // Token is still valid, just use it
            setSession(session);
            setUser(session.user);
          }
        }
      } catch (err) {
        console.error('Session sync error:', err);
        // Don't clear session on error - preserve existing state
      } finally {
        isRefreshingRef.current = false;
      }
    };

    // Set up auth state listener FIRST (prevents missing events during init)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      // Handle PASSWORD_RECOVERY event - don't treat as logged in
      if (event === 'PASSWORD_RECOVERY') {
        setIsPendingPasswordReset(true);
        // Don't set user/session - they must reset password first
        return;
      }

      // If we're on a recovery URL, don't treat session as valid login
      if (isPasswordRecoveryUrl()) {
        setIsPendingPasswordReset(true);
        return;
      }

      // Password was successfully reset - clear the flag
      if (event === 'USER_UPDATED' && isPendingPasswordReset) {
        setIsPendingPasswordReset(false);
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setProfile(null);
      }
    });

    // Initial session check
    const initAuth = async () => {
      try {
        // Skip normal auth if this is a password recovery URL
        if (isPasswordRecoveryUrl()) {
          setIsPendingPasswordReset(true);
          setIsLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Load cached profile instantly, then refresh from network
          try {
            const cached = await getCache('profiles', session.user.id);
            if (cached && isMounted) setProfile(cached);
          } catch {
            // ignore cache failures
          }

          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Web: sync session when tab becomes visible (with debounce)
    let visibilityTimeout: NodeJS.Timeout;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Debounce visibility changes to prevent rapid calls
        clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(syncSession, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Native (Capacitor): sync session when app resumes (with debounce)
    let removeAppListener: (() => void) | undefined;
    let appStateTimeout: NodeJS.Timeout;
    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const handler = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            // Debounce app state changes
            clearTimeout(appStateTimeout);
            appStateTimeout = setTimeout(syncSession, 500);
          }
        });
        removeAppListener = () => handler.remove();
      } catch {
        // Not running in a native container (or plugin unavailable)
      }
    })();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(visibilityTimeout);
      clearTimeout(appStateTimeout);
      removeAppListener?.();
    };
  }, [isPendingPasswordReset]);

  // Track user presence on platform when signed in
  useTrackPresence(user?.id ?? null);

  return (
    <AuthContext.Provider value={{ user, session, profile, isLoading, isPendingPasswordReset, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
