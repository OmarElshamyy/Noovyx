import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

/**
 * Creates a per-request server Supabase client backed by Next.js 15 async cookies().
 * Uses the getAll / setAll cookie interface required by @supabase/ssr.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot mutate cookies directly; middleware handles token refresh.
        }
      },
    },
  });
}

/**
 * Verifies the caller via auth.getUser() (never trusting getSession() on the server)
 * and checks protected app_metadata for administrator status.
 */
export async function getAuthenticatedServerUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { supabase: null, user: null, isAdmin: false };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, isAdmin: false };
  }

  const appMeta = (user.app_metadata || {}) as Record<string, unknown>;
  const isAdmin = appMeta.role === "admin" || appMeta.is_admin === true;

  return { supabase, user, isAdmin };
}
