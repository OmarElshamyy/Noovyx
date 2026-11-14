import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_GATE_COOKIE,
  ADMIN_GATE_TTL_MS,
  createAdminGateToken,
  verifyAdminAccessKey,
} from "../../../adminGate";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;
const failedAttemptsByIp = new Map<string, number[]>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

function getRecentFailures(ip: string): number[] {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = (failedAttemptsByIp.get(ip) || []).filter((ts) => ts > cutoff);
  failedAttemptsByIp.set(ip, recent);
  return recent;
}

function recordFailure(ip: string): number {
  const recent = getRecentFailures(ip);
  recent.push(Date.now());
  failedAttemptsByIp.set(ip, recent);
  return recent.length;
}

function logGateEvent(event: string, details: Record<string, unknown>, level: "info" | "warn" = "warn") {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    type: "SECURITY_AUDIT",
    event,
    ...details,
  });
  if (level === "warn") {
    console.warn(entry);
  } else {
    console.info(entry);
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const recentFailures = getRecentFailures(ip);

  if (recentFailures.length >= MAX_FAILED_ATTEMPTS) {
    const oldest = recentFailures[0] || Date.now();
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - Date.now()) / 1000),
    );
    logGateEvent("ADMIN_GATE_LOCKOUT", { ip, retryAfterSec });
    return NextResponse.json(
      { error: "Too many failed attempts. Access temporarily locked." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const candidateKey = typeof body.accessKey === "string" ? body.accessKey : "";
  if (!candidateKey || candidateKey.length > 256) {
    recordFailure(ip);
    return NextResponse.json({ error: "Invalid access key." }, { status: 401 });
  }

  const isValid = await verifyAdminAccessKey(candidateKey);
  if (!isValid) {
    const failCount = recordFailure(ip);
    logGateEvent("ADMIN_GATE_AUTH_FAILED", { ip, failCount });
    return NextResponse.json({ error: "Invalid access key." }, { status: 401 });
  }

  // Clear failures on success and issue signed HttpOnly gate cookie
  failedAttemptsByIp.delete(ip);
  const token = await createAdminGateToken();
  logGateEvent("ADMIN_GATE_UNLOCKED", { ip }, "info");

  const response = NextResponse.json({ ok: true, redirectTo: "/admin" }, { status: 200 });
  response.cookies.set({
    name: ADMIN_GATE_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(ADMIN_GATE_TTL_MS / 1000),
  });
  return response;
}

export async function DELETE(req: NextRequest) {
  const ip = getClientIp(req);
  logGateEvent("ADMIN_GATE_LOCKED", { ip }, "info");
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set({
    name: ADMIN_GATE_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
