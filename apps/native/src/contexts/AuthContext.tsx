import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function isInvalidRefreshTokenError(err: unknown) {
    const msg = (err as any)?.message as string | undefined;
    if (!msg) return false;
    const m = msg.toLowerCase();
    return (
      m.includes('invalid refresh token') ||
      m.includes('refresh token not found') ||
      m.includes('refresh_token_not_found') ||
      m.includes('jwt expired') // sometimes manifests this way after long inactivity
    );
  }

  async function signOutLocal() {
    // Local sign out is safe even if network is flaky / token refresh failed.
    try {
      // supabase-js v2 supports scope; keep backwards compatible if types differ.
      await (supabase.auth as any).signOut({ scope: 'local' });
    } catch {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setUser(null);
    }
  }

  async function refreshSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error && isInvalidRefreshTokenError(error)) {
      await signOutLocal();
      return;
    }
    setSession(data.session ?? null);
    setUser(data.session?.user ?? null);
  }

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error && isInvalidRefreshTokenError(error)) {
          await signOutLocal();
          return;
        }
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;
      // When refresh fails (common in Expo Go after switching anon key/project), recover by clearing local session.
      if ((event as unknown as string) === 'TOKEN_REFRESH_FAILED') {
        void signOutLocal();
        return;
      }
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      refreshSession,
      signOut: async () => {
        await signOutLocal();
      },
    }),
    [user, session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

