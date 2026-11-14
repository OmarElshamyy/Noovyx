import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { getSupabaseAdminClient } from "../../../lib/supabase/admin";
import { getDataBackendMode, isSupabaseAdminConfigured } from "../../../lib/supabase/env";
import { getAuthenticatedServerUser } from "../../../lib/supabase/server";
import { getPublicProducts } from "../../../productService";
import type { OrderInquiryInput } from "../../../types";

const MAX_TEXT_LENGTHS = {
  customerName: 80,
  contact: 120,
  address: 240,
  notes: 500,
};

const MAX_ITEMS = 20;
const MAX_QUANTITY = 10;
const MAX_SUBTOTAL = 100000;

// In-memory fallback rate limiter only used when Supabase DB rate limiter is unavailable
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const ipRequestLog = new Map<string, number[]>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

function checkInMemoryRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = (ipRequestLog.get(ip) || []).filter((ts) => ts > cutoff);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldest = recent[0] || now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000));
    ipRequestLog.set(ip, recent);
    return { allowed: false, retryAfterSec };
  }

  recent.push(now);
  ipRequestLog.set(ip, recent);
  return { allowed: true, retryAfterSec: 0 };
}

function maskPii(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "***";
  return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
}

function logSecurityEvent(
  event: string,
  details: Record<string, unknown>,
  level: "info" | "warn" | "error" = "warn",
) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    type: "SECURITY_AUDIT",
    event,
    ...details,
  });
  if (level === "error") {
    console.error(entry);
  } else if (level === "warn") {
    console.warn(entry);
  } else {
    console.info(entry);
  }
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const mode = getDataBackendMode();
  const supabaseAdmin =
    (mode === "supabase" || mode === "hybrid") && isSupabaseAdminConfigured()
      ? getSupabaseAdminClient()
      : null;

  // Persistent database rate limit when Supabase is active; in-memory fallback otherwise
  if (supabaseAdmin) {
    const { data: rlRows, error: rlErr } = await supabaseAdmin.rpc(
      "check_and_increment_rate_limit",
      {
        p_key: `order:${ip}`,
        p_window_seconds: 600,
        p_max_requests: 5,
      },
    );
    const rl = Array.isArray(rlRows) ? rlRows[0] : rlRows;
    if (!rlErr && rl && rl.allowed === false) {
      logSecurityEvent("ORDER_RATE_LIMIT_EXCEEDED", { ip });
      return NextResponse.json(
        { error: "Too many order requests. Please wait a few minutes before trying again." },
        { status: 429, headers: { "Retry-After": String(rl.retry_after_sec || 60) } },
      );
    }
  } else {
    const rateCheck = checkInMemoryRateLimit(ip);
    if (!rateCheck.allowed) {
      logSecurityEvent("ORDER_RATE_LIMIT_EXCEEDED", { ip });
      return NextResponse.json(
        { error: "Too many order requests. Please wait a few minutes before trying again." },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfterSec) } },
      );
    }
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Invalid content type." }, { status: 415 });
  }

  let body: Record<string, unknown>;
  try {
    const rawText = await req.text();
    if (rawText.length > 32768) {
      logSecurityEvent("ORDER_PAYLOAD_TOO_LARGE", { ip, size: rawText.length });
      return NextResponse.json({ error: "Request payload too large." }, { status: 413 });
    }
    body = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed JSON body." }, { status: 400 });
  }

  // Honeypot check against automated bots
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    logSecurityEvent("BOT_HONEYPOT_TRIGGERED", { ip });
    return NextResponse.json({ error: "Order validation failed." }, { status: 400 });
  }

  // Reject mass-assignment of privileged fields
  const forbiddenKeys = [
    "status",
    "role",
    "isAdmin",
    "admin",
    "createdAt",
    "discount",
    "currency",
    "id",
    "userId",
    "user_id",
    "guestTokenHash",
    "guest_token_hash",
  ];
  for (const key of forbiddenKeys) {
    if (key in body) {
      logSecurityEvent("MASS_ASSIGNMENT_ATTEMPT", { ip, field: key });
      return NextResponse.json(
        { error: `Forbidden field "${key}" in order request.` },
        { status: 400 },
      );
    }
  }

  const customerName = cleanText(body.customerName, MAX_TEXT_LENGTHS.customerName);
  const contact = cleanText(body.contact, MAX_TEXT_LENGTHS.contact);
  const governorate = cleanText(body.governorate, 80);
  const address = cleanText(body.address, MAX_TEXT_LENGTHS.address);
  const notes = cleanText(body.notes, MAX_TEXT_LENGTHS.notes);
  const couponCode = cleanText(body.couponCode, 40).toUpperCase();
  const idempotencyKey = cleanText(body.idempotencyKey, 120);

  if (!customerName || customerName.length < 2 || !contact || !address || address.length < 3) {
    return NextResponse.json(
      { error: "Please add a valid name, contact phone, and delivery city/address." },
      { status: 400 },
    );
  }

  const digitsOnly = contact.replace(/\D/g, "");
  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    return NextResponse.json(
      { error: "Please enter a valid phone number (8 to 15 digits)." },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_ITEMS) {
    return NextResponse.json(
      { error: "Order must contain between 1 and 20 items." },
      { status: 400 },
    );
  }

  const catalog = await getPublicProducts();
  const catalogById = new Map(catalog.map((p) => [p.id, p]));

  const aggregated = new Map<
    string,
    { productId: string; variantId?: string; quantity: number; clientUnitPrice: number }
  >();

  for (const rawItem of body.items) {
    if (!rawItem || typeof rawItem !== "object") {
      return NextResponse.json({ error: "Invalid order item format." }, { status: 400 });
    }
    const itemObj = rawItem as Record<string, unknown>;
    const productId = cleanText(itemObj.productId, 80);
    const variantId = cleanText(itemObj.variantId, 80) || undefined;
    const rawQty = Number(itemObj.quantity);
    const clientUnitPrice = Number(itemObj.unitPrice);

    if (!productId || !Number.isInteger(rawQty) || rawQty < 1 || rawQty > MAX_QUANTITY) {
      logSecurityEvent("INVALID_ITEM_QUANTITY", { ip, productId, rawQty });
      return NextResponse.json(
        { error: "Invalid product ID or item quantity (must be an integer between 1 and 10)." },
        { status: 400 },
      );
    }

    const key = `${productId}::${variantId || ""}`;
    const existing = aggregated.get(key);
    const nextQty = (existing?.quantity || 0) + rawQty;
    if (nextQty > MAX_QUANTITY) {
      return NextResponse.json(
        { error: `Maximum quantity per product is ${MAX_QUANTITY}.` },
        { status: 400 },
      );
    }
    aggregated.set(key, { productId, variantId, quantity: nextQty, clientUnitPrice });
  }

  const verifiedItems: OrderInquiryInput["items"] = [];
  let serverSubtotal = 0;

  for (const { productId, variantId, quantity, clientUnitPrice } of aggregated.values()) {
    const product = catalogById.get(productId);
    if (!product || !product.isActive) {
      logSecurityEvent("UNKNOWN_OR_INACTIVE_PRODUCT_ORDER", { ip, productId });
      return NextResponse.json(
        { error: `Product "${productId}" is unavailable or does not exist.` },
        { status: 400 },
      );
    }

    const variant = variantId
      ? product.variants?.find((v) => v.id === variantId && v.isActive)
      : undefined;

    if (product.hasVariants && !variant) {
      return NextResponse.json(
        { error: `Please select an option for "${product.name}".` },
        { status: 400 },
      );
    }

    const availableStock = variant ? variant.stockQuantity : product.stockQuantity;
    const isInStock = variant ? variant.inStock : product.inStock;

    if (!isInStock || availableStock < quantity) {
      return NextResponse.json(
        { error: `"${product.name}" does not have enough stock for quantity ${quantity}.` },
        { status: 409 },
      );
    }

    const canonicalUnitPrice = Math.round(Number(variant?.priceOverride ?? product.price));
    if (!Number.isFinite(canonicalUnitPrice) || canonicalUnitPrice <= 0) {
      return NextResponse.json({ error: "Invalid catalog product price." }, { status: 500 });
    }

    if (Number.isFinite(clientUnitPrice) && Math.round(clientUnitPrice) !== canonicalUnitPrice) {
      logSecurityEvent("PRICE_TAMPERING_DETECTED", {
        ip,
        productId,
        clientUnitPrice,
        canonicalUnitPrice,
        contactMasked: maskPii(contact),
      });
      return NextResponse.json(
        { error: "Price mismatch detected. Please refresh your cart and try again." },
        { status: 422 },
      );
    }

    verifiedItems.push({
      productId: product.id,
      variantId: variant?.id,
      name: cleanText(product.name, 120),
      quantity,
      unitPrice: canonicalUnitPrice,
    });

    serverSubtotal += quantity * canonicalUnitPrice;
  }

  const clientSubtotal = Number(body.subtotal);
  if (Number.isFinite(clientSubtotal) && Math.round(clientSubtotal) !== serverSubtotal) {
    logSecurityEvent("SUBTOTAL_TAMPERING_DETECTED", {
      ip,
      clientSubtotal,
      serverSubtotal,
      contactMasked: maskPii(contact),
    });
    return NextResponse.json(
      { error: "Cart subtotal mismatch detected. Please review your cart and try again." },
      { status: 422 },
    );
  }

  if (serverSubtotal <= 0 || serverSubtotal > MAX_SUBTOTAL) {
    return NextResponse.json(
      { error: `Order total must be between EGP 1 and EGP ${MAX_SUBTOTAL.toLocaleString()}.` },
      { status: 400 },
    );
  }

  // Primary Supabase transactional RPC path
  if (supabaseAdmin && (mode === "supabase" || mode === "hybrid")) {
    try {
      const { user } = await getAuthenticatedServerUser().catch(() => ({
        supabase: null,
        user: null,
        isAdmin: false,
      }));

      // Generate a 256-bit random guest lookup secret; only its SHA-256 hash is stored in Postgres
      const guestLookupToken = crypto.randomBytes(32).toString("base64url");
      const guestTokenHash = crypto.createHash("sha256").update(guestLookupToken).digest("hex");

      const { data: rpcRows, error: rpcErr } = await supabaseAdmin.rpc("place_order", {
        p_payload: {
          userId: user?.id ?? null,
          idempotencyKey: idempotencyKey || null,
          guestTokenHash,
          customerName,
          contact,
          governorate: governorate || address.split(" - ")[0] || null,
          address,
          notes,
          couponCode: couponCode || null,
          items: verifiedItems.map((it) => ({
            productId: it.productId,
            variantId: it.variantId || null,
            quantity: it.quantity,
          })),
        },
      });

      if (rpcErr) {
        const msg = rpcErr.message || "Order failed.";
        const status = /insufficient stock/i.test(msg) ? 409 : /unavailable|coupon|invalid/i.test(msg) ? 400 : 500;
        logSecurityEvent("SUPABASE_PLACE_ORDER_REJECTED", { ip, reason: msg });
        return NextResponse.json({ error: msg }, { status });
      }

      const row = (Array.isArray(rpcRows) ? rpcRows[0] : rpcRows) as Record<string, unknown>;
      const orderId = String(row.out_order_id);
      const orderNumber = String(row.out_order_number);
      const isReplay = Boolean(row.out_idempotent_replay);

      try {
        revalidatePath("/");
      } catch {}

      logSecurityEvent(
        "ORDER_CREATED",
        {
          backend: "supabase",
          orderId,
          orderNumber,
          itemCount: verifiedItems.length,
          subtotal: Number(row.out_subtotal),
          grandTotal: Number(row.out_grand_total),
          idempotentReplay: isReplay,
          contactMasked: maskPii(contact),
        },
        "info",
      );

      return NextResponse.json(
        {
          orderId,
          orderNumber,
          guestLookupToken: isReplay ? undefined : guestLookupToken,
          subtotal: Number(row.out_subtotal),
          shippingFee: Number(row.out_shipping_fee),
          codFee: Number(row.out_cod_fee),
          discountAmount: Number(row.out_discount_amount),
          grandTotal: Number(row.out_grand_total),
          idempotentReplay: isReplay,
          items: verifiedItems,
        },
        { status: isReplay ? 200 : 201 },
      );
    } catch (err) {
      logSecurityEvent(
        "ORDER_PERSISTENCE_ERROR",
        { ip, backend: "supabase", reason: err instanceof Error ? err.message : "Unknown error" },
        "error",
      );
      return NextResponse.json(
        { error: "Could not save order at this time. Please try again." },
        { status: 500 },
      );
    }
  }

  // Legacy Firebase path (only when NEXT_PUBLIC_DATA_BACKEND === 'firebase' or Supabase not yet configured)
  if (!db) {
    return NextResponse.json(
      { error: "Database backend is not configured. Check your Supabase or Firebase environment variables." },
      { status: 503 },
    );
  }

  try {
    const verifiedOrder: OrderInquiryInput = {
      customerName,
      contact,
      address,
      notes,
      items: verifiedItems.map(({ productId, name, quantity, unitPrice }) => ({
        productId,
        name,
        quantity,
        unitPrice,
      })),
      subtotal: serverSubtotal,
    };

    const inquiry = await addDoc(collection(db, "orders"), {
      ...verifiedOrder,
      status: "new",
      createdAt: serverTimestamp(),
    });

    logSecurityEvent(
      "ORDER_CREATED",
      {
        backend: "firebase",
        orderId: inquiry.id,
        itemCount: verifiedItems.length,
        subtotal: serverSubtotal,
        contactMasked: maskPii(contact),
      },
      "info",
    );

    return NextResponse.json(
      {
        orderId: inquiry.id,
        subtotal: serverSubtotal,
        items: verifiedItems,
      },
      { status: 201 },
    );
  } catch (err) {
    logSecurityEvent(
      "ORDER_PERSISTENCE_ERROR",
      {
        ip,
        backend: "firebase",
        reason: err instanceof Error ? err.message : "Unknown error",
      },
      "error",
    );
    return NextResponse.json(
      { error: "Could not save order at this time. Please try again." },
      { status: 500 },
    );
  }
}
