import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { getPublicProducts } from "./productService";
import type { OrderInquiryInput } from "./types";

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

  // Aggregate duplicate productIds so stock limits cannot be bypassed via repeated line items
  const aggregated = new Map<string, { quantity: number; clientUnitPrice: number }>();

  for (const rawItem of order.items.slice(0, MAX_ITEMS)) {
    const productId = cleanText(rawItem.productId, 80);
    if (!productId) continue;

    const rawQty = Number(rawItem.quantity);
    if (!Number.isFinite(rawQty) || rawQty < 1) {
      throw new Error("Item quantity must be at least 1.");
    }

    const quantity = Math.min(Math.max(Math.trunc(rawQty), 1), MAX_QUANTITY);
    const prev = aggregated.get(productId);
    const totalQty = (prev?.quantity || 0) + quantity;
    if (totalQty > MAX_QUANTITY) {
      throw new Error(`Maximum quantity per product is ${MAX_QUANTITY}.`);
    }

    aggregated.set(productId, {
      quantity: totalQty,
      clientUnitPrice: Number(rawItem.unitPrice),
    });
  }

  const verifiedItems: OrderInquiryInput["items"] = [];
  for (const [productId, { quantity, clientUnitPrice }] of aggregated.entries()) {
    const canonical = catalogById.get(productId);
    if (!canonical || !canonical.isActive) {
      throw new Error(`Product "${productId}" is no longer available.`);
    }

    if (!canonical.inStock || canonical.stockQuantity < quantity) {
      throw new Error(`"${canonical.name}" does not have sufficient stock.`);
    }

    const canonicalPrice = Math.round(Number(canonical.price));
    if (!Number.isFinite(canonicalPrice) || canonicalPrice <= 0) {
      throw new Error(`Invalid catalog price for "${canonical.name}".`);
    }

    if (Number.isFinite(clientUnitPrice) && Math.round(clientUnitPrice) !== canonicalPrice) {
      throw new Error("Price mismatch detected. Please refresh the page and try again.");
    }

    verifiedItems.push({
      productId: canonical.id,
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
    address: cleanText(order.address, MAX_TEXT_LENGTHS.address),
    notes: cleanText(order.notes, MAX_TEXT_LENGTHS.notes),
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

export async function submitOrderInquiry(
  order: OrderInquiryInput,
): Promise<string> {
  const safeOrder = await normalizeAndVerifyOrderInquiry(order);
  assertValidOrder(safeOrder);

  // Primary path: Server-side verified & rate-limited API endpoint
  if (typeof window !== "undefined") {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeOrder),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      orderId?: string;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error || "Could not submit order request.");
    }

    if (payload.orderId) {
      return payload.orderId;
    }
  }

  if (!db) {
    throw new Error(
      "Firebase is not configured. Add your Firebase environment variables in Vercel or .env.local.",
    );
  }

  const inquiry = await addDoc(collection(db, "orders"), {
    ...safeOrder,
    status: "new",
    createdAt: serverTimestamp(),
  });

  return inquiry.id;
}
