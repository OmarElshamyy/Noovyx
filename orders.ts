import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { getPublicProducts } from "./productService";
import type { GuestOrderTrackingResult, OrderInquiryInput, OrderSubmitResult } from "./types";

const MAX_TEXT_LENGTHS = {
  customerName: 80,
  contact: 120,
  address: 240,
  notes: 500,
};

const MAX_ITEMS = 20;
const MAX_QUANTITY = 10;
const MAX_SUBTOTAL = 100000;

function cleanText(value: string, maxLength: number) {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export async function normalizeAndVerifyOrderInquiry(
  order: OrderInquiryInput,
): Promise<OrderInquiryInput> {
  const catalog = await getPublicProducts();
  const catalogById = new Map(catalog.map((p) => [p.id, p]));

  // Aggregate duplicate (productId, variantId) lines so stock limits cannot be bypassed
  const aggregated = new Map<
    string,
    { productId: string; variantId?: string; quantity: number; clientUnitPrice: number }
  >();

  for (const rawItem of order.items.slice(0, MAX_ITEMS)) {
    const productId = cleanText(rawItem.productId, 80);
    const variantId = rawItem.variantId ? cleanText(rawItem.variantId, 80) : undefined;
    if (!productId) continue;

    const rawQty = Number(rawItem.quantity);
    if (!Number.isFinite(rawQty) || rawQty < 1) {
      throw new Error("Item quantity must be at least 1.");
    }

    const key = `${productId}::${variantId || ""}`;
    const quantity = Math.min(Math.max(Math.trunc(rawQty), 1), MAX_QUANTITY);
    const prev = aggregated.get(key);
    const totalQty = (prev?.quantity || 0) + quantity;
    if (totalQty > MAX_QUANTITY) {
      throw new Error(`Maximum quantity per product is ${MAX_QUANTITY}.`);
    }

    aggregated.set(key, {
      productId,
      variantId,
      quantity: totalQty,
      clientUnitPrice: Number(rawItem.unitPrice),
    });
  }

  const verifiedItems: OrderInquiryInput["items"] = [];
  for (const { productId, variantId, quantity, clientUnitPrice } of aggregated.values()) {
    const canonical = catalogById.get(productId);
    if (!canonical || !canonical.isActive) {
      throw new Error(`Product "${productId}" is no longer available.`);
    }

    const variant = variantId
      ? canonical.variants?.find((v) => v.id === variantId && v.isActive)
      : undefined;

    if (canonical.hasVariants && !variant) {
      throw new Error(`Please select a valid variant for "${canonical.name}".`);
    }

    const availableStock = variant ? variant.stockQuantity : canonical.stockQuantity;
    const isAvailable = variant ? variant.inStock : canonical.inStock;

    if (!isAvailable || availableStock < quantity) {
      throw new Error(`"${canonical.name}" does not have sufficient stock.`);
    }

    const canonicalPrice = Math.round(Number(variant?.priceOverride ?? canonical.price));
    if (!Number.isFinite(canonicalPrice) || canonicalPrice <= 0) {
      throw new Error(`Invalid catalog price for "${canonical.name}".`);
    }

    if (Number.isFinite(clientUnitPrice) && Math.round(clientUnitPrice) !== canonicalPrice) {
      throw new Error("Price mismatch detected. Please refresh the page and try again.");
    }

    verifiedItems.push({
      productId: canonical.id,
      variantId: variant?.id,
      name: cleanText(canonical.name, 120),
      quantity,
      unitPrice: canonicalPrice,
    });
  }

  const subtotal = verifiedItems.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0,
  );

  if (Number.isFinite(order.subtotal) && Math.round(order.subtotal) !== subtotal) {
    throw new Error("Cart subtotal mismatch detected. Please review your cart and try again.");
  }

  return {
    customerName: cleanText(order.customerName, MAX_TEXT_LENGTHS.customerName),
    contact: cleanText(order.contact, MAX_TEXT_LENGTHS.contact),
    governorate: order.governorate ? cleanText(order.governorate, 80) : undefined,
    address: cleanText(order.address, MAX_TEXT_LENGTHS.address),
    notes: cleanText(order.notes, MAX_TEXT_LENGTHS.notes),
    couponCode: order.couponCode ? cleanText(order.couponCode, 40).toUpperCase() : undefined,
    idempotencyKey: order.idempotencyKey ? cleanText(order.idempotencyKey, 120) : undefined,
    items: verifiedItems,
    subtotal,
  };
}

function assertValidOrder(order: OrderInquiryInput) {
  if (!order.customerName || order.customerName.length < 2 || !order.contact || !order.address) {
    throw new Error("Please add your name, contact, and delivery city/address.");
  }

  const digitsOnly = order.contact.replace(/\D/g, "");
  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    throw new Error("Please enter a valid phone number (8 to 15 digits).");
  }

  if (order.items.length === 0) {
    throw new Error("Add at least one product before sending an inquiry.");
  }

  if (
    !Number.isInteger(order.subtotal) ||
    order.subtotal <= 0 ||
    order.subtotal > MAX_SUBTOTAL
  ) {
    throw new Error("The cart total is invalid. Please review your cart and try again.");
  }
}

export async function submitOrderInquiryDetailed(
  order: OrderInquiryInput,
): Promise<OrderSubmitResult> {
  const safeOrder = await normalizeAndVerifyOrderInquiry(order);
  assertValidOrder(safeOrder);

  if (typeof window !== "undefined") {
    const idempotencyKey =
      safeOrder.idempotencyKey ||
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `ord-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...safeOrder,
        idempotencyKey,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as Partial<OrderSubmitResult> & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error || "Could not submit order request.");
    }

    if (payload.orderId) {
      return {
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        guestLookupToken: payload.guestLookupToken,
        subtotal: payload.subtotal ?? safeOrder.subtotal,
        shippingFee: payload.shippingFee ?? null,
        codFee: payload.codFee ?? null,
        discountAmount: payload.discountAmount ?? null,
        grandTotal: payload.grandTotal ?? null,
        idempotentReplay: Boolean(payload.idempotentReplay),
        items: payload.items ?? safeOrder.items,
      };
    }
  }

  if (!db) {
    throw new Error("No backend database is configured.");
  }

  const inquiry = await addDoc(collection(db, "orders"), {
    customerName: safeOrder.customerName,
    contact: safeOrder.contact,
    address: safeOrder.address,
    notes: safeOrder.notes,
    items: safeOrder.items.map(({ productId, name, quantity, unitPrice }) => ({
      productId,
      name,
      quantity,
      unitPrice,
    })),
    subtotal: safeOrder.subtotal,
    status: "new",
    createdAt: serverTimestamp(),
  });

  return {
    orderId: inquiry.id,
    subtotal: safeOrder.subtotal,
    items: safeOrder.items,
  };
}

export async function submitOrderInquiry(order: OrderInquiryInput): Promise<string> {
  const res = await submitOrderInquiryDetailed(order);
  return res.orderNumber || res.orderId;
}

export async function trackGuestOrder(
  orderNumber: string,
  trackingToken: string,
): Promise<GuestOrderTrackingResult> {
  const response = await fetch("/api/orders/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderNumber: orderNumber.trim(),
      trackingToken: trackingToken.trim(),
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    order?: GuestOrderTrackingResult;
    error?: string;
  };

  if (!response.ok || !data.order) {
    throw new Error(data.error || "Order not found or tracking token is invalid.");
  }

  return data.order;
}
