import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

let browserClient: SupabaseClient | null = null;

/**
 * Singleton browser Supabase client using @supabase/ssr cookie session persistence.
 * Safe to call in client components; returns null if Supabase env vars are not yet set.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    return null;
  }
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    return null;
  }
  if (!browserClient) {
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
}
