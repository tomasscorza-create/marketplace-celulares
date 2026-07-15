import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const supabaseProjectRef = import.meta.env.VITE_SUPABASE_PROJECT_REF?.trim();
const isRemoteBackendEnabled = import.meta.env.VITE_ENABLE_REMOTE_BACKEND === "true";
const isLocalBackendEnabled = import.meta.env.VITE_ENABLE_LOCAL_BACKEND === "true";

function getSupabaseProjectRefFromUrl(url: string | undefined) {
  if (!url) {
    return null;
  }

  const match = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/i.exec(url);

  return match?.[1] ?? null;
}

const urlProjectRef = getSupabaseProjectRefFromUrl(supabaseUrl);
const hasMatchingProjectRef = Boolean(
  supabaseProjectRef && urlProjectRef && supabaseProjectRef === urlProjectRef,
);
const isLocalSupabaseUrl = Boolean(
  supabaseUrl &&
    /^http:\/\/(127\.0\.0\.1|localhost):54321\/?$/i.test(supabaseUrl),
);

const hasRemoteBackendEnv = Boolean(
  isRemoteBackendEnabled && supabaseUrl && supabaseAnonKey && hasMatchingProjectRef,
);
const hasLocalBackendEnv = Boolean(
  isLocalBackendEnabled && supabaseUrl && supabaseAnonKey && isLocalSupabaseUrl,
);

export const hasSupabaseEnv = hasRemoteBackendEnv || hasLocalBackendEnv;

export function getSupabasePublicConfig() {
  if (!hasSupabaseEnv || !supabaseUrl || !supabaseAnonKey) return null;

  return {
    anonKey: supabaseAnonKey,
    url: supabaseUrl.replace(/\/$/, ""),
  };
}

export const supabase = hasSupabaseEnv
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      [
        "Backend remoto bloqueado.",
        "Para conectar una base local define VITE_ENABLE_LOCAL_BACKEND=true,",
        "VITE_SUPABASE_URL=http://127.0.0.1:54321 y VITE_SUPABASE_ANON_KEY.",
        "Para conectar una base nueva remota define VITE_ENABLE_REMOTE_BACKEND=true,",
        "VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY y VITE_SUPABASE_PROJECT_REF coincidente.",
        "No uses credenciales ni project refs del marketplace original.",
      ].join(" "),
    );
  }

  return supabase;
}
