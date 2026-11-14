import {
  deleteDoc,
  doc,
  getDocs,
  collection,
  limit,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { getSupabaseBrowserClient } from "./lib/supabase/client";
import { getDataBackendMode } from "./lib/supabase/env";
import type { AdminOrder, OrderStatus, StockMovementRecord } from "./types";

const ORDER_COLLECTION = "orders";
const MAX_ORDER_QUERY_LIMIT = 200;

const ORDER_STATUSES: OrderStatus[] = ["new", "confirmed", "fulfilled", "cancelled"];

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function readCreatedAt(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value) {
    const possibleTimestamp = value as { toDate: () => Date };
    return possibleTimestamp.toDate();
  }

  return null;
}

function orderFromData(id: string, data: Record<string, unknown>): AdminOrder {
  const status = cleanText(data.status);

  return {
    id,
    customerName: cleanText(data.customerName),
    contact: cleanText(data.contact),
    address: cleanText(data.address),
    notes: cleanText(data.notes),
    items: Array.isArray(data.items)
      ? data.items
          .map((item) => {
            if (!item || typeof item !== "object") {
              return null;
            }

            const itemData = item as Record<string, unknown>;
            return {
              productId: cleanText(itemData.productId),
              name: cleanText(itemData.name),
              quantity: Math.max(1, Math.trunc(cleanNumber(itemData.quantity, 1))),
              unitPrice: Math.max(0, cleanNumber(itemData.unitPrice)),
            };
          })
          .filter((item): item is AdminOrder["items"][number] => item !== null)
      : [],
    subtotal: Math.max(0, cleanNumber(data.subtotal)),
    status: ORDER_STATUSES.includes(status as OrderStatus)
      ? (status as OrderStatus)
      : "new",
    createdAt: readCreatedAt(data.createdAt),
  };
}

function mapSupabaseOrderRow(row: Record<string, unknown>): AdminOrder {
  const status = cleanText(row.status);
  const rawItems = Array.isArray(row.order_items) ? row.order_items : [];

  return {
    id: cleanText(row.id),
    orderNumber: cleanText(row.order_number) || undefined,
    customerName: cleanText(row.customer_name),
    contact: cleanText(row.contact),
    governorate: cleanText(row.governorate) || undefined,
    address: cleanText(row.address),
    notes: cleanText(row.notes),
    couponCode: cleanText(row.coupon_code) || undefined,
    subtotal: Math.max(0, Number(row.subtotal) || 0),
    shippingFee: nullableNumber(row.shipping_fee),
    codFee: nullableNumber(row.cod_fee),
    discountAmount: nullableNumber(row.discount_amount),
    grandTotal: nullableNumber(row.grand_total),
    isLegacyImport: Boolean(row.is_legacy_import),
    legacyUnrecoverableFields: Array.isArray(row.legacy_unrecoverable_fields)
      ? row.legacy_unrecoverable_fields.map((f) => String(f))
      : [],
    status: ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : "new",
    createdAt: row.created_at ? new Date(String(row.created_at)) : null,
    items: rawItems.map((it) => {
      const item = it as Record<string, unknown>;
      return {
        productId: cleanText(item.product_id),
        variantId: cleanText(item.variant_id) || undefined,
        variantTitle: cleanText(item.variant_title) || undefined,
        name: cleanText(item.name),
        quantity: Math.max(1, Math.trunc(Number(item.quantity) || 1)),
        unitPrice: Math.max(0, Number(item.unit_price) || 0),
      };
    }),
  };
}

export async function getAdminOrders(): Promise<AdminOrder[]> {
  const mode = getDataBackendMode();

  if (mode === "supabase" || mode === "hybrid") {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, customer_name, contact, governorate, address, notes, coupon_code, status, subtotal, shipping_fee, cod_fee, discount_amount, grand_total, is_legacy_import, legacy_unrecoverable_fields, created_at, order_items(product_id, variant_id, variant_title, name, unit_price, quantity)",
        )
        .order("created_at", { ascending: false })
        .limit(MAX_ORDER_QUERY_LIMIT);

      if (error) {
        throw new Error(`Failed to fetch orders from Supabase: ${error.message}`);
      }

      if (Array.isArray(data)) {
        return data.map((row) => mapSupabaseOrderRow(row as unknown as Record<string, unknown>));
      }
    }
    if (mode === "supabase") {
      throw new Error("Supabase is not configured.");
    }
  }

  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  const snapshot = await getDocs(
    query(collection(db, ORDER_COLLECTION), limit(MAX_ORDER_QUERY_LIMIT)),
  );

  return snapshot.docs
    .map((orderDoc) => orderFromData(orderDoc.id, orderDoc.data()))
    .sort((left, right) => {
      const leftTime = left.createdAt?.getTime() ?? 0;
      const rightTime = right.createdAt?.getTime() ?? 0;
      return rightTime - leftTime;
    });
}

export async function getCustomerOrders(): Promise<AdminOrder[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, contact, governorate, address, notes, coupon_code, status, subtotal, shipping_fee, cod_fee, discount_amount, grand_total, is_legacy_import, legacy_unrecoverable_fields, created_at, order_items(product_id, variant_id, variant_title, name, unit_price, quantity)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !Array.isArray(data)) {
    return [];
  }
  return data.map((row) => mapSupabaseOrderRow(row as unknown as Record<string, unknown>));
}

export async function getStockMovements(productId?: string): Promise<StockMovementRecord[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  let q = supabase
    .from("stock_movements")
    .select("id, product_id, variant_id, quantity_delta, balance_after, movement_type, reference_type, reference_id, actor_label, note, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (productId) {
    q = q.eq("product_id", productId);
  }

  const { data, error } = await q;
  if (error || !Array.isArray(data)) return [];

  return data.map((row) => ({
    id: Number(row.id),
    productId: String(row.product_id),
    variantId: row.variant_id ? String(row.variant_id) : null,
    quantityDelta: Number(row.quantity_delta),
    balanceAfter: Number(row.balance_after),
    movementType: row.movement_type as StockMovementRecord["movementType"],
    referenceType: row.reference_type ? String(row.reference_type) : null,
    referenceId: row.reference_id ? String(row.reference_id) : null,
    actorLabel: row.actor_label ? String(row.actor_label) : null,
    note: row.note ? String(row.note) : null,
    createdAt: String(row.created_at),
  }));
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string,
): Promise<void> {
  if (!ORDER_STATUSES.includes(status)) {
    throw new Error("Invalid order status.");
  }

  const mode = getDataBackendMode();

  if (mode === "supabase" || mode === "hybrid") {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error } = await supabase.rpc("set_order_status", {
      p_order_id: orderId,
      p_new_status: status,
      p_note: note ?? null,
    });

    if (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }

    if (mode === "supabase") {
      return;
    }
  }

  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  await updateDoc(doc(db, ORDER_COLLECTION, orderId), { status });
}

/**
 * Architectural Correction #2:
 * Direct deletion of historical orders is disabled in Supabase to preserve financial & audit history.
 */
export async function deleteOrder(orderId: string): Promise<void> {
  const mode = getDataBackendMode();
  if (mode === "supabase" || mode === "hybrid") {
    throw new Error(
      "Direct deletion of historical orders is disabled to preserve financial & audit integrity. Set status to 'cancelled' instead.",
    );
  }

  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  await deleteDoc(doc(db, ORDER_COLLECTION, orderId));
}
