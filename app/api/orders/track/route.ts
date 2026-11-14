import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../lib/supabase/admin";
import { isSupabaseAdminConfigured } from "../../../../lib/supabase/env";

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

/**
 * Architectural Correction #6:
 * Secure Guest Order Retrieval via cryptographic lookup token + order number.
 * Uses POST body so tracking tokens never leak into server access logs or Referer headers,
 * applies database-backed rate limiting, and returns strictly masked PII.
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Guest order tracking requires Supabase backend configuration." },
      { status: 503 },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Tracking service unavailable." }, { status: 503 });
  }

  const ip = getClientIp(req);
  const { data: rlRows, error: rlErr } = await supabaseAdmin.rpc(
    "check_and_increment_rate_limit",
    {
      p_key: `track:${ip}`,
      p_window_seconds: 300,
      p_max_requests: 15,
    },
  );
  const rl = Array.isArray(rlRows) ? rlRows[0] : rlRows;
  if (!rlErr && rl && rl.allowed === false) {
    return NextResponse.json(
      { error: "Too many tracking attempts. Please wait a few minutes." },
      { status: 429, headers: { "Retry-After": String(rl.retry_after_sec || 60) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
  const trackingToken = typeof body.trackingToken === "string" ? body.trackingToken.trim() : "";

  if (!orderNumber || trackingToken.length < 16 || trackingToken.length > 256) {
    return NextResponse.json(
      { error: "Please provide both your Order Number (e.g. NX-1001) and Tracking Key." },
      { status: 400 },
    );
  }

  const tokenHash = crypto.createHash("sha256").update(trackingToken).digest("hex");

  const { data, error } = await supabaseAdmin.rpc("get_guest_order", {
    p_order_number: orderNumber,
    p_guest_token_hash: tokenHash,
  });

  if (error || !data) {
    return NextResponse.json(
      { error: "No matching order was found for that Order Number and Tracking Key." },
      { status: 404 },
    );
  }

  return NextResponse.json({ order: data }, { status: 200 });
}
