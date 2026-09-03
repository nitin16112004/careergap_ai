import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { authService } from "../../services/auth.service";
import type { AuthProfile } from "../../types/auth";
import { AuthContext } from "../../hooks/use-auth";

export const AuthProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const result = await authService.me();
      setProfile(result.profile);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const applySession = (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (!nextSession) setProfile(null);
      else window.setTimeout(() => { void loadProfile(); }, 0);
    };

    void supabase.auth.getSession().then(({ data }) => applySession(data.session)).finally(() => {
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => applySession(nextSession));
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshAuth = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await authService.logout();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(() => ({ session, user, profile, loading, refreshAuth, signOut }), [loading, profile, refreshAuth, session, signOut, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
