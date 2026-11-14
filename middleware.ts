import { NextRequest, NextResponse } from "next/server";
import { ADMIN_GATE_COOKIE, verifyAdminGateToken } from "./adminGate";
import { updateSupabaseSession } from "./lib/supabase/middleware";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const gateCookie = req.cookies.get(ADMIN_GATE_COOKIE)?.value;
    const isAuthorizedGate = await verifyAdminGateToken(gateCookie);

    if (!isAuthorizedGate) {
      // Stealth 404: Rewrite to Next.js not-found page with HTTP 404 status
      // so scanners, bots, and unauthorized visitors cannot detect that /admin exists.
      const notFoundUrl = req.nextUrl.clone();
      notFoundUrl.pathname = "/_not-found";
      const response = NextResponse.rewrite(notFoundUrl, { status: 404 });
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      response.headers.set("Cache-Control", "no-store, max-age=0");
      return response;
    }

    const { response } = await updateSupabaseSession(req, NextResponse.next({ request: req }));
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  }

  const { response } = await updateSupabaseSession(req, NextResponse.next({ request: req }));
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
