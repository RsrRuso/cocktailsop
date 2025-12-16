import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

    const syncSession = async () => {
      try {
        // Refresh tokens if needed (important after the app was backgrounded/closed)
        await supabase.auth.refreshSession();
      } catch {
        // Ignore refresh errors; we'll fall back to the current stored session
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch profile in background (don't block) - deferred to prevent deadlock
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
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, isLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
