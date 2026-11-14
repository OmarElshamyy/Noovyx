/**
 * Centralized Supabase environment helpers supporting current publishable / server-side
 * secret key conventions (sb_publishable_* / sb_secret_*) as well as local CLI /
 * legacy anon / service_role key names.
 */

export type DataBackendMode = "supabase" | "hybrid" | "firebase";

export function getSupabaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  if (!raw) return "";
  // Guard against copying the REST/Auth API endpoint URL (e.g. .../rest/v1) into NEXT_PUBLIC_SUPABASE_URL
  return raw
    .replace(/\/+(rest|auth|storage|realtime|functions|graphql)\/v\d+.*$/i, "")
    .replace(/\/+$/, "");
}

export function getSupabasePublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();
}

export function getSupabaseSecretKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("SECURITY VIOLATION: Attempted to read SUPABASE_SECRET_KEY in browser context.");
  }
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function isSupabaseAdminConfigured(): boolean {
  if (typeof window !== "undefined") return false;
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}

export function getDataBackendMode(): DataBackendMode {
  const raw = (process.env.NEXT_PUBLIC_DATA_BACKEND || "").trim().toLowerCase();
  if (raw === "firebase" || raw === "hybrid" || raw === "supabase") {
    return raw;
  }
  // Default to supabase when configured, otherwise preserve existing firebase runtime
  return isSupabaseConfigured() ? "supabase" : "firebase";
}
