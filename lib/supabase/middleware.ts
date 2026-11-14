import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

/**
 * Refreshes expired Supabase Auth session cookies in Next.js middleware using getAll / setAll.
 */
export async function updateSupabaseSession(
  request: NextRequest,
  response: NextResponse,
): Promise<{ response: NextResponse; user: { id: string; app_metadata?: Record<string, unknown> } | null }> {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    return { response, user: null };
  }

  let currentResponse = response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        const prevHeaders = currentResponse.headers;
        currentResponse = NextResponse.next({ request });
        prevHeaders.forEach((val, key) => {
          currentResponse.headers.set(key, val);
        });
        for (const { name, value, options } of cookiesToSet) {
          currentResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    response: currentResponse,
    user: user ? { id: user.id, app_metadata: user.app_metadata as Record<string, unknown> } : null,
  };
}
