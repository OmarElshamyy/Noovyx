export const ADMIN_GATE_COOKIE = "__nvx_admin_gate";
export const ADMIN_GATE_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function getSecretKey(): string {
  return (process.env.ADMIN_ACCESS_KEY || "").trim();
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return bytesToHex(new Uint8Array(sig));
}

/**
 * Constant-time string comparison via SHA-256 digests so secret length and content cannot be leaked via timing.
 */
export async function timingSafeEqualString(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const viewA = new Uint8Array(hashA);
  const viewB = new Uint8Array(hashB);
  let diff = a.length ^ b.length;
  for (let i = 0; i < viewA.length; i++) {
    diff |= viewA[i] ^ viewB[i];
  }
  return diff === 0;
}

export async function verifyAdminAccessKey(candidate: string): Promise<boolean> {
  const secret = getSecretKey();
  if (!secret || secret.length < 8) {
    return false;
  }
  return timingSafeEqualString(candidate.trim(), secret);
}

export async function createAdminGateToken(now = Date.now()): Promise<string> {
  const secret = getSecretKey();
  if (!secret) {
    throw new Error("ADMIN_ACCESS_KEY is not configured on the server.");
  }
  const expiresAt = now + ADMIN_GATE_TTL_MS;
  const payload = `v1:${expiresAt}`;
  const signature = await hmacSha256Hex(secret, payload);
  return `${expiresAt}.${signature}`;
}

export async function verifyAdminGateToken(
  token: string | undefined | null,
  now = Date.now(),
): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  const secret = getSecretKey();
  if (!secret || secret.length < 8) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [expiresAtStr, providedSig] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    return false;
  }

  const expectedSig = await hmacSha256Hex(secret, `v1:${expiresAtStr}`);
  return timingSafeEqualString(providedSig, expectedSig);
}
