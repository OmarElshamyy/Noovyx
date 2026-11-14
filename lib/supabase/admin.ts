import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "./env";

/**
 * Server-only privileged Supabase client (secret / service_role key).
 * Bypasses RLS for verified server route handlers (e.g. rate-limited place_order RPC,
 * guest order lookup, ETL migration). Never import from client components.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (typeof window !== "undefined") {
    throw new Error("SECURITY VIOLATION: getSupabaseAdminClient() must never run in the browser.");
  }

  const url = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();
  if (!url || !secretKey) {
    return null;
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
