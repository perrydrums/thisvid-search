import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { clearBrowserSiteStorage } from '../helpers/clearBrowserSiteStorage';
import { supabase } from '../helpers/supabase/client';

export type SendOtpResult = {
  error: string | null;
};

export type VerifyOtpResult = {
  error: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** Login: OTP only if account already exists (shouldCreateUser: false). */
  sendLoginOtp: (email: string) => Promise<SendOtpResult>;
  /** Register: create user if needed and send OTP (shouldCreateUser: true). */
  sendRegisterOtp: (email: string) => Promise<SendOtpResult>;
  verifyOtp: (email: string, token: string) => Promise<VerifyOtpResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const sendLoginOtp = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/search-v2` : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: false,
        ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const sendRegisterOtp = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/search-v2` : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: true,
        ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const code = token.trim().replace(/\s/g, '');
    const { error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: code,
      type: 'email',
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    if (typeof window === 'undefined') return;
    clearBrowserSiteStorage();
    window.location.reload();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loading,
      sendLoginOtp,
      sendRegisterOtp,
      verifyOtp,
      signOut,
    }),
    [session, user, loading, sendLoginOtp, sendRegisterOtp, verifyOtp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
