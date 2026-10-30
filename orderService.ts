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
import type { AdminOrder, OrderStatus } from "./types";

const ORDER_COLLECTION = "orders";
const MAX_ORDER_QUERY_LIMIT = 200;

const ORDER_STATUSES: OrderStatus[] = ["new", "confirmed", "fulfilled", "cancelled"];

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

export async function getAdminOrders(): Promise<AdminOrder[]> {
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

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  if (!db) {
    throw new Error("Firebase is not configured.");
  }
  if (!ORDER_STATUSES.includes(status)) {
    throw new Error("Invalid order status.");
  }

  await updateDoc(doc(db, ORDER_COLLECTION, orderId), { status });
}

export async function deleteOrder(orderId: string): Promise<void> {
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  await deleteDoc(doc(db, ORDER_COLLECTION, orderId));
}
