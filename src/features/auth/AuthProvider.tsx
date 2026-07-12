import type { PropsWithChildren } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { ProfileRole, UserProfile } from "../../types/auth";

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { hasSupabaseEnv, supabase } from "../../lib/supabase/client";
import { getCurrentUserProfile } from "./authClient";

type AuthContextValue = {
  isConfigured: boolean;
  isLoading: boolean;
  profile: UserProfile | null;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  role: ProfileRole | null;
  session: Session | null;
  user: User | null;
};

const initialAuthContext: AuthContextValue = {
  isConfigured: hasSupabaseEnv,
  isLoading: hasSupabaseEnv,
  profile: null,
  profileError: null,
  refreshProfile: async () => undefined,
  role: null,
  session: null,
  user: null,
};

export const AuthContext = createContext<AuthContextValue>(initialAuthContext);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(hasSupabaseEnv);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const sessionUserIdRef = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await getCurrentUserProfile(userId);

    if (sessionUserIdRef.current !== userId) {
      return;
    }

    if (error) {
      setProfile((currentProfile) =>
        currentProfile?.id === userId ? currentProfile : null,
      );
      setProfileError(error.message);
      return;
    }

    setProfile(data);
    setProfileError(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentUserId = sessionUserIdRef.current;

    if (!currentUserId) {
      setProfile(null);
      setProfileError(null);
      return;
    }

    await loadProfile(currentUserId);
  }, [loadProfile]);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const client = supabase;
    let isMounted = true;

    const syncAuthState = async (nextSession: Session | null, showLoading = true) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      sessionUserIdRef.current = nextSession?.user.id ?? null;

      if (!nextSession?.user) {
        setProfile(null);
        setProfileError(null);
        setIsLoading(false);
        return;
      }

      // Solo mostrar loading en el inicio o en sign-in/sign-out.
      // TOKEN_REFRESHED es silencioso — no reemplazar contenido visible.
      if (showLoading) {
        setIsLoading(true);
      }

      if (!isMounted) {
        return;
      }

      await loadProfile(nextSession.user.id);
      setIsLoading(false);
    };

    const loadSession = async () => {
      const { data, error } = await client.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setProfile(null);
        setProfileError(error.message);
        setIsLoading(false);
        return;
      }

      await syncAuthState(data.session);
    };

    void loadSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      // TOKEN_REFRESHED ocurre silenciosamente en segundo plano.
      // No prender isLoading para evitar el flash de carga al volver a la pestaña.
      const isSilentRefresh = event === "TOKEN_REFRESHED";
      void syncAuthState(nextSession, !isSilentRefresh);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value: AuthContextValue = useMemo(
    () => ({
      isConfigured: hasSupabaseEnv,
      isLoading,
      profile,
      profileError,
      refreshProfile,
      role: profile?.role ?? null,
      session,
      user: session?.user ?? null,
    }),
    [isLoading, profile, profileError, refreshProfile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
