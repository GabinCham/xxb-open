import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

type AuthContextValue = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; confirmationRequired: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setReady(true);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ready,
    session,
    user: session?.user ?? null,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error?.message ?? null;
    },
    async signUp(email, password) {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      return { error: error?.message ?? null, confirmationRequired: !error && !data.session };
    },
    async signOut() {
      await supabase.auth.signOut();
    },
  }), [ready, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
