import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

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

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        setProfile(data);
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

      try {
        await supabase.auth.refreshSession();
      } catch {
        // Ignore refresh errors
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setProfile(null);
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

    // Web: refresh session when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Native (Capacitor): refresh session when app resumes
    let removeAppListener: (() => void) | undefined;
    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const handler = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            syncSession();
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
      removeAppListener?.();
    };
  }, [isPendingPasswordReset]);

  return (
    <AuthContext.Provider value={{ user, session, profile, isLoading, isPendingPasswordReset, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
