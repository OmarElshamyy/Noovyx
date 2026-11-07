import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  collection,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { products as seedProducts } from "./products";
import { sanitizeImageSrc } from "./storefrontConfig";
import type { Product, ProductCategory } from "./types";

const PRODUCT_COLLECTION = "products";
const STOREFRONT_SETTINGS_DOC = "storefront";
const MAX_PRODUCT_QUERY_LIMIT = 200;

export const CATALOG_STORAGE_KEY = "noovyx_catalog_state_v2";

export interface CatalogState {
  overrides: Record<string, Record<string, unknown>>;
  deletedIds: string[];
  updatedAt: number;
}

const allowedCategories: ProductCategory[] = [
  "IEMs",
  "Wireless",
  "Cables",
  "Ear tips",
  "Cases",
  "DACs",
];

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanNumber(value: unknown, fallback = 0) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function productFromData(id: string, data: Record<string, unknown>): Product {
  const category = cleanText(data.category);
  const stockQuantity = Math.max(0, Math.trunc(cleanNumber(data.stockQuantity, 15)));
  const imageUrl = sanitizeImageSrc(cleanText(data.imageUrl));
  const imageUrls = Array.isArray(data.imageUrls)
    ? data.imageUrls.map((url) => sanitizeImageSrc(cleanText(url))).filter(Boolean).slice(0, 8)
    : [];

  return {
    id,
    slug: cleanText(data.slug, id).slice(0, 100),
    name: cleanText(data.name, "Untitled product").slice(0, 160),
    category: allowedCategories.includes(category as ProductCategory)
      ? (category as ProductCategory)
      : "IEMs",
    price: Math.max(0, Math.round(cleanNumber(data.price, 0))),
    image: cleanText(data.image, "KZ").slice(0, 4).toUpperCase(),
    imageUrl,
    imageUrls: imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [],
    description: cleanText(data.description).slice(0, 2000),
    specs: Array.isArray(data.specs)
      ? data.specs.map((spec) => cleanText(spec).slice(0, 200)).filter(Boolean).slice(0, 8)
      : [],
    inStock: stockQuantity > 0,
    stockQuantity,
    lowStockThreshold: Math.max(0, Math.trunc(cleanNumber(data.lowStockThreshold, 3))),
    isActive: typeof data.isActive === "boolean" ? data.isActive : true,
    featured: typeof data.featured === "boolean" ? data.featured : false,
  };
}

function productToPlainObject(product: Product): Record<string, unknown> {
  const stockQuantity = Math.max(0, Math.trunc(Number(product.stockQuantity) || 0));
  const safeImageUrl = sanitizeImageSrc((product.imageUrl || "").trim());
  const safeImageUrls = (Array.isArray(product.imageUrls) ? product.imageUrls : [])
    .map((url) => sanitizeImageSrc(String(url).trim()))
    .filter(Boolean)
    .slice(0, 8);

  return {
    id: (product.id || product.slug).trim().slice(0, 100),
    slug: (product.slug || product.id).trim().slice(0, 100),
    name: product.name.trim().slice(0, 160),
    category: allowedCategories.includes(product.category) ? product.category : "IEMs",
    price: Math.max(0, Math.round(Number(product.price) || 0)),
    image: (product.image || "KZ").trim().slice(0, 4).toUpperCase(),
    imageUrl: safeImageUrl,
    imageUrls: safeImageUrls.length > 0 ? safeImageUrls : safeImageUrl ? [safeImageUrl] : [],
    description: (product.description || "").trim().slice(0, 2000),
    specs: (Array.isArray(product.specs) ? product.specs : [])
      .map((spec) => String(spec).trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, 8),
    inStock: stockQuantity > 0,
    stockQuantity,
    lowStockThreshold: Math.max(0, Math.trunc(Number(product.lowStockThreshold) || 3)),
    isActive: Boolean(product.isActive),
    featured: Boolean(product.featured),
  };
}

function productToFirestore(product: Product) {
  const plain = productToPlainObject(product);
  const { id: _unusedId, ...rest } = plain;
  void _unusedId;
  return {
    ...rest,
    updatedAt: serverTimestamp(),
  };
}

function normalizeCatalogState(raw: unknown): CatalogState {
  if (!raw || typeof raw !== "object") {
    return { overrides: {}, deletedIds: [], updatedAt: 0 };
  }
  const obj = raw as Record<string, unknown>;
  const overrides: Record<string, Record<string, unknown>> = {};
  if (obj.overrides && typeof obj.overrides === "object") {
    for (const [k, v] of Object.entries(obj.overrides as Record<string, unknown>)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      if (v && typeof v === "object") {
        overrides[k] = v as Record<string, unknown>;
      }
    }
  }
  const deletedIds = Array.isArray(obj.deletedIds)
    ? obj.deletedIds.map((id) => String(id).trim()).filter(Boolean)
    : [];
  const updatedAt = typeof obj.updatedAt === "number" ? obj.updatedAt : 0;
  return { overrides, deletedIds, updatedAt };
}

export function getLocalCatalogState(): CatalogState {
  if (typeof window === "undefined") {
    return { overrides: {}, deletedIds: [], updatedAt: 0 };
  }
  try {
    const raw =
      localStorage.getItem(CATALOG_STORAGE_KEY) ||
      localStorage.getItem("noovyx_catalog_state_v1");
    if (!raw) return { overrides: {}, deletedIds: [], updatedAt: 0 };
    return normalizeCatalogState(JSON.parse(raw));
  } catch {
    return { overrides: {}, deletedIds: [], updatedAt: 0 };
  }
}

function setLocalCatalogState(state: CatalogState): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(CATALOG_STORAGE_KEY, serialized);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: CATALOG_STORAGE_KEY,
        newValue: serialized,
      }),
    );
  } catch {
    // Ignore storage quota errors
  }
}

function mergeTwoCatalogStates(a: CatalogState, b: CatalogState): CatalogState {
  const primary = b.updatedAt >= a.updatedAt ? b : a;
  const secondary = b.updatedAt >= a.updatedAt ? a : b;

  const mergedOverrides: Record<string, Record<string, unknown>> = {
    ...secondary.overrides,
    ...primary.overrides,
  };
  const deletedSet = new Set<string>([
    ...secondary.deletedIds.filter((id) => !(id in primary.overrides)),
    ...primary.deletedIds,
  ]);
  for (const delId of deletedSet) {
    delete mergedOverrides[delId];
  }

  return {
    overrides: mergedOverrides,
    deletedIds: Array.from(deletedSet),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}

function buildMergedCatalog(
  firestoreProducts: Product[],
  catalogState: CatalogState,
): Product[] {
  const map = new Map<string, Product>();

  // 1. Seed products from products.ts form the baseline catalog
  for (const seed of seedProducts) {
    map.set(seed.id, { ...seed });
  }

  // 2. Overlay all products fetched from Firestore "products" collection (both isActive: true and isActive: false)
  for (const fp of firestoreProducts) {
    const existing = map.get(fp.id);
    map.set(fp.id, existing ? { ...existing, ...fp } : fp);
  }

  // 3. Overlay catalogState.overrides (from /api/local-catalog and localStorage)
  for (const [id, overrideData] of Object.entries(catalogState.overrides)) {
    const existing = map.get(id);
    const mergedRaw = existing
      ? ({ ...existing, ...overrideData } as Record<string, unknown>)
      : overrideData;
    map.set(id, productFromData(id, mergedRaw));
  }

  // 4. Remove any deleted products
  for (const delId of catalogState.deletedIds) {
    map.delete(delId);
  }

  map.delete("noovyx-cms-config-v2");
  map.delete("__noovyx_cms_config__");
  return Array.from(map.values()).filter(
    (p) =>
      p.id !== "noovyx-cms-config-v2" &&
      p.slug !== "noovyx-cms-config-v2" &&
      p.id !== "__noovyx_cms_config__" &&
      p.slug !== "__noovyx_cms_config__",
  );
}

async function fetchLocalServerCatalogState(): Promise<CatalogState> {
  if (typeof window === "undefined") {
    return { overrides: {}, deletedIds: [], updatedAt: 0 };
  }
  try {
    const res = await fetch("/api/local-catalog", { cache: "no-store" });
    if (!res.ok) return { overrides: {}, deletedIds: [], updatedAt: 0 };
    const data = (await res.json()) as { catalogState?: unknown };
    return normalizeCatalogState(data.catalogState);
  } catch {
    return { overrides: {}, deletedIds: [], updatedAt: 0 };
  }
}

async function persistToLocalServer(
  state: CatalogState,
  firestoreProducts: Product[] = [],
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const fullCatalog = buildMergedCatalog(firestoreProducts, state);
    await fetch("/api/local-catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        catalogState: state,
        fullCatalog,
      }),
    });
  } catch {
    // Ignore network errors
  }
}

async function fetchAllFirestoreProducts(): Promise<Product[]> {
  if (!db) return [];
  try {
    const allSnap = await getDocs(
      query(collection(db, PRODUCT_COLLECTION), limit(MAX_PRODUCT_QUERY_LIMIT)),
    );
    return allSnap.docs
      .filter((d) => d.id !== "noovyx-cms-config-v2" && d.id !== "__noovyx_cms_config__")
      .map((productDoc) => productFromData(productDoc.id, productDoc.data()));
  } catch {
    try {
      const activeSnap = await getDocs(
        query(
          collection(db, PRODUCT_COLLECTION),
          where("isActive", "==", true),
          limit(MAX_PRODUCT_QUERY_LIMIT),
        ),
      );
      return activeSnap.docs
        .filter((d) => d.id !== "noovyx-cms-config-v2" && d.id !== "__noovyx_cms_config__")
        .map((productDoc) => productFromData(productDoc.id, productDoc.data()));
    } catch {
      return [];
    }
  }
}

/**
 * Synchronous cached public products for initial render.
 */
export function getCachedPublicProducts(): Product[] {
  const localState = getLocalCatalogState();
  return buildMergedCatalog([], localState).filter((product) => product.isActive === true);
}

/**
 * Loads all active public products for the storefront homepage.
 * Combines:
 * 1. seedProducts (from products.ts, updated locally by /api/local-catalog)
 * 2. Firestore "products" collection (both active and hidden docs)
 * 3. /api/local-catalog server state + browser localStorage
 */
export async function getPublicProducts(): Promise<Product[]> {
  const localState = getLocalCatalogState();
  const [serverState, firestoreProducts] = await Promise.all([
    fetchLocalServerCatalogState(),
    fetchAllFirestoreProducts(),
  ]);

  const combinedState = mergeTwoCatalogStates(localState, serverState);
  if (combinedState.updatedAt > localState.updatedAt) {
    setLocalCatalogState(combinedState);
  }

  return buildMergedCatalog(firestoreProducts, combinedState).filter(
    (product) => product.isActive === true,
  );
}

/**
 * Loads all products (both Active and Hidden) for the Admin Panel.
 */
export async function getAdminProducts(): Promise<Product[]> {
  const localState = getLocalCatalogState();
  const [serverState, firestoreProducts] = await Promise.all([
    fetchLocalServerCatalogState(),
    fetchAllFirestoreProducts(),
  ]);

  let remoteState: CatalogState = { overrides: {}, deletedIds: [], updatedAt: 0 };
  if (db) {
    try {
      const snap = await getDoc(doc(db, "settings", STOREFRONT_SETTINGS_DOC));
      if (snap.exists()) {
        remoteState = normalizeCatalogState(snap.data().catalogState);
      }
    } catch {
      // Ignore if restricted
    }
  }

  const combinedState = mergeTwoCatalogStates(
    mergeTwoCatalogStates(localState, serverState),
    remoteState,
  );
  setLocalCatalogState(combinedState);

  // Sync to local server file (products.ts & local-catalog-state.json) automatically
  void persistToLocalServer(combinedState, firestoreProducts);

  return buildMergedCatalog(firestoreProducts, combinedState);
}

/**
 * Saves a product (including its isActive visibility and featured status) to:
 * 1. localStorage (instant cross-tab update)
 * 2. Local server (/api/local-catalog -> updates local-catalog-state.json & products.ts)
 * 3. Firestore products/{productId} & settings/storefront
 */
export async function saveProduct(product: Product): Promise<void> {
  const productId = (product.id || product.slug).trim();
  if (!productId) {
    throw new Error("Product ID is required.");
  }

  const plainProduct = productToPlainObject({
    ...product,
    id: productId,
    slug: product.slug || productId,
  });

  const localState = getLocalCatalogState();
  const serverState = await fetchLocalServerCatalogState();
  const baseState = mergeTwoCatalogStates(localState, serverState);

  const nextState: CatalogState = {
    overrides: {
      ...baseState.overrides,
      [productId]: plainProduct,
    },
    deletedIds: baseState.deletedIds.filter((id) => id !== productId),
    updatedAt: Date.now(),
  };

  setLocalCatalogState(nextState);
  await persistToLocalServer(nextState);

  if (db) {
    const firestoreDb = db;
    await Promise.allSettled([
      (async () => {
        const ref = doc(firestoreDb, PRODUCT_COLLECTION, productId);
        const payload = {
          ...productToFirestore({
            ...product,
            id: productId,
            slug: product.slug || productId,
          }),
          createdAt: serverTimestamp(),
        };
        try {
          await setDoc(ref, payload);
        } catch {
          await setDoc(ref, { ...payload, id: productId }, { merge: true });
        }
      })(),
      setDoc(
        doc(db, "settings", STOREFRONT_SETTINGS_DOC),
        {
          catalogState: nextState,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      ),
    ]);
  }
}

/**
 * Batch-saves multiple products at once (used by Sync Catalog or Bulk Hide/Show).
 */
export async function saveProductsBatch(productsList: Product[]): Promise<void> {
  const localState = getLocalCatalogState();
  const serverState = await fetchLocalServerCatalogState();
  const baseState = mergeTwoCatalogStates(localState, serverState);

  const nextOverrides = { ...baseState.overrides };
  const restoredIds = new Set<string>();

  for (const prod of productsList) {
    const pid = (prod.id || prod.slug).trim();
    if (!pid) continue;
    nextOverrides[pid] = productToPlainObject({ ...prod, id: pid, slug: prod.slug || pid });
    restoredIds.add(pid);
  }

  const nextState: CatalogState = {
    overrides: nextOverrides,
    deletedIds: baseState.deletedIds.filter((id) => !restoredIds.has(id)),
    updatedAt: Date.now(),
  };

  setLocalCatalogState(nextState);
  await persistToLocalServer(nextState);

  if (db) {
    const firestoreDb = db;
    await Promise.allSettled([
      ...productsList.map((prod) => {
        const pid = (prod.id || prod.slug).trim();
        if (!pid) return Promise.resolve();
        return (async () => {
          const ref = doc(firestoreDb, PRODUCT_COLLECTION, pid);
          const payload = {
            ...productToFirestore({
              ...prod,
              id: pid,
              slug: prod.slug || pid,
            }),
            createdAt: serverTimestamp(),
          };
          try {
            await setDoc(ref, payload);
          } catch {
            await setDoc(ref, { ...payload, id: pid }, { merge: true });
          }
        })();
      }),
      setDoc(
        doc(db, "settings", STOREFRONT_SETTINGS_DOC),
        {
          catalogState: nextState,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      ),
    ]);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  const cleanId = productId.trim();
  if (!cleanId) return;

  const localState = getLocalCatalogState();
  const serverState = await fetchLocalServerCatalogState();
  const baseState = mergeTwoCatalogStates(localState, serverState);

  const nextOverrides = { ...baseState.overrides };
  delete nextOverrides[cleanId];

  const nextDeleted = Array.from(new Set([...baseState.deletedIds, cleanId]));
  const nextState: CatalogState = {
    overrides: nextOverrides,
    deletedIds: nextDeleted,
    updatedAt: Date.now(),
  };

  setLocalCatalogState(nextState);
  await persistToLocalServer(nextState);

  if (db) {
    await Promise.allSettled([
      deleteDoc(doc(db, PRODUCT_COLLECTION, cleanId)),
      setDoc(
        doc(db, "settings", STOREFRONT_SETTINGS_DOC),
        {
          catalogState: nextState,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      ),
    ]);
  }
}
