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
import { createClient } from "@supabase/supabase-js";
import { db } from "./firebase";
import { getSupabaseBrowserClient } from "./lib/supabase/client";
import { getDataBackendMode, getSupabasePublishableKey, getSupabaseUrl } from "./lib/supabase/env";
import { products as seedProducts } from "./products";
import { sanitizeImageSrc } from "./storefrontConfig";
import type { Product, ProductCategory, ProductVariant } from "./types";

const PRODUCT_COLLECTION = "products";
const STOREFRONT_SETTINGS_DOC = "storefront";
const MAX_PRODUCT_QUERY_LIMIT = 200;

export const CATALOG_STORAGE_KEY = "noovyx_catalog_state_v2";
const SUPABASE_HYDRATION_CACHE_KEY = "noovyx_supabase_products_cache_v1";

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

const CATEGORY_LABEL_TO_ID: Record<ProductCategory, string> = {
  IEMs: "iems",
  Wireless: "wireless",
  Cables: "cables",
  "Ear tips": "ear-tips",
  Cases: "cases",
  DACs: "dacs",
};

const CATEGORY_ID_TO_LABEL: Record<string, ProductCategory> = {
  iems: "IEMs",
  wireless: "Wireless",
  cables: "Cables",
  "ear-tips": "Ear tips",
  cases: "Cases",
  dacs: "DACs",
};

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanNumber(value: unknown, fallback = 0) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function categoryToId(category: ProductCategory): string {
  return CATEGORY_LABEL_TO_ID[category] || "iems";
}

function categoryFromRow(categoryId: unknown, label?: unknown): ProductCategory {
  if (typeof label === "string" && allowedCategories.includes(label as ProductCategory)) {
    return label as ProductCategory;
  }
  const key = typeof categoryId === "string" ? categoryId.trim().toLowerCase() : "";
  return CATEGORY_ID_TO_LABEL[key] || "IEMs";
}

function getSupabaseReadClient() {
  if (typeof window !== "undefined") {
    return getSupabaseBrowserClient();
  }
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

function mapSupabaseProductRow(row: Record<string, unknown>): Product {
  const rawImages = Array.isArray(row.product_images) ? row.product_images : [];
  const sortedUrls = [...rawImages]
    .sort((a, b) => Number((a as Record<string, unknown>).position ?? 0) - Number((b as Record<string, unknown>).position ?? 0))
    .map((img) => sanitizeImageSrc(cleanText((img as Record<string, unknown>).url)))
    .filter(Boolean)
    .slice(0, 8);

  const rawVariants = Array.isArray(row.product_variants) ? row.product_variants : [];
  const variants: ProductVariant[] = [...rawVariants]
    .sort((a, b) => Number((a as Record<string, unknown>).position ?? 0) - Number((b as Record<string, unknown>).position ?? 0))
    .map((v) => {
      const vr = v as Record<string, unknown>;
      const vStock = Math.max(0, Math.trunc(cleanNumber(vr.stock_quantity, 0)));
      return {
        id: cleanText(vr.id),
        productId: cleanText(vr.product_id, cleanText(row.id)),
        sku: cleanText(vr.sku) || undefined,
        title: cleanText(vr.title),
        options: (vr.options && typeof vr.options === "object" ? vr.options : {}) as Record<string, string>,
        priceOverride: vr.price_override !== null && vr.price_override !== undefined ? cleanNumber(vr.price_override) : null,
        stockQuantity: vStock,
        inStock: typeof vr.in_stock === "boolean" ? vr.in_stock : vStock > 0,
        isActive: vr.is_active !== false,
        position: Math.trunc(cleanNumber(vr.position, 0)),
      };
    });

  const stockQuantity = Math.max(0, Math.trunc(cleanNumber(row.stock_quantity, 0)));
  const categoryObj = row.categories as Record<string, unknown> | null | undefined;
  const category = categoryFromRow(row.category_id, categoryObj?.label);

  return {
    id: cleanText(row.id),
    slug: cleanText(row.slug, cleanText(row.id)),
    name: cleanText(row.name, "Untitled product"),
    category,
    price: Math.max(0, cleanNumber(row.price, 0)),
    compareAtPrice:
      row.compare_at_price !== null && row.compare_at_price !== undefined
        ? cleanNumber(row.compare_at_price)
        : null,
    image: cleanText(row.image, "KZ").slice(0, 4).toUpperCase(),
    imageUrl: sortedUrls[0] || "",
    imageUrls: sortedUrls,
    description: cleanText(row.description),
    specs: Array.isArray(row.specs)
      ? row.specs.map((s) => cleanText(s)).filter(Boolean).slice(0, 8)
      : [],
    inStock: typeof row.in_stock === "boolean" ? row.in_stock : stockQuantity > 0,
    stockQuantity,
    lowStockThreshold: Math.max(0, Math.trunc(cleanNumber(row.low_stock_threshold, 3))),
    isActive: row.is_active !== false,
    isArchived: Boolean(row.is_archived),
    hasVariants: Boolean(row.has_variants),
    variants: variants.length > 0 ? variants : undefined,
    featured: Boolean(row.featured),
  };
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

  for (const seed of seedProducts) {
    map.set(seed.id, { ...seed });
  }

  for (const fp of firestoreProducts) {
    const existing = map.get(fp.id);
    map.set(fp.id, existing ? { ...existing, ...fp } : fp);
  }

  for (const [id, overrideData] of Object.entries(catalogState.overrides)) {
    const existing = map.get(id);
    const mergedRaw = existing
      ? ({ ...existing, ...overrideData } as Record<string, unknown>)
      : overrideData;
    map.set(id, productFromData(id, mergedRaw));
  }

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
 * Synchronous cached public products for initial client hydration before async fetch resolves.
 */
export function getCachedPublicProducts(): Product[] {
  const mode = getDataBackendMode();
  if (mode === "supabase" && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(SUPABASE_HYDRATION_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Product[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((p) => p.isActive === true && !p.isArchived);
        }
      }
    } catch {
      // Fallback to seed snapshot during initial cold load
    }
    return seedProducts.filter((p) => p.isActive === true);
  }

  const localState = getLocalCatalogState();
  return buildMergedCatalog([], localState).filter((product) => product.isActive === true);
}

/**
 * Loads all active public products for the storefront homepage.
 * In Supabase mode, PostgreSQL is the single authoritative source of truth.
 */
export async function getPublicProducts(): Promise<Product[]> {
  const mode = getDataBackendMode();

  if (mode === "supabase" || mode === "hybrid") {
    const supabase = getSupabaseReadClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, slug, name, category_id, price, compare_at_price, image, description, specs, has_variants, stock_quantity, low_stock_threshold, in_stock, is_active, is_archived, featured, sort_order, categories(label), product_images(url, position), product_variants(id, product_id, sku, title, options, price_override, stock_quantity, in_stock, is_active, position)",
        )
        .eq("is_active", true)
        .eq("is_archived", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(MAX_PRODUCT_QUERY_LIMIT);

      if (!error && Array.isArray(data)) {
        const mapped = data.map((row) => mapSupabaseProductRow(row as unknown as Record<string, unknown>));
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(SUPABASE_HYDRATION_CACHE_KEY, JSON.stringify(mapped));
          } catch {}
        }
        return mapped;
      }
      if (mode === "supabase" && error) {
        throw new Error(`Failed to load products from Supabase: ${error.message}`);
      }
    }
    if (mode === "supabase") {
      return seedProducts.filter((p) => p.isActive === true);
    }
  }

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
 * Loads all non-archived products (both Active and Hidden) for the Admin Panel.
 */
export async function getAdminProducts(): Promise<Product[]> {
  const mode = getDataBackendMode();

  if (mode === "supabase" || mode === "hybrid") {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, slug, name, category_id, price, compare_at_price, image, description, specs, has_variants, stock_quantity, low_stock_threshold, in_stock, is_active, is_archived, featured, sort_order, categories(label), product_images(url, position), product_variants(id, product_id, sku, title, options, price_override, stock_quantity, in_stock, is_active, position)",
        )
        .eq("is_archived", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(MAX_PRODUCT_QUERY_LIMIT);

      if (error) {
        throw new Error(`Failed to load admin catalog from Supabase: ${error.message}`);
      }
      if (Array.isArray(data)) {
        return data.map((row) => mapSupabaseProductRow(row as unknown as Record<string, unknown>));
      }
    }
    if (mode === "supabase") {
      throw new Error("Supabase client is not configured.");
    }
  }

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
  void persistToLocalServer(combinedState, firestoreProducts);

  return buildMergedCatalog(firestoreProducts, combinedState);
}

/**
 * Saves a product cleanly. In Supabase mode:
 * - Writes catalog attributes to public.products and gallery URLs to public.product_images.
 * - Routes stock changes through transactional admin_adjust_stock RPC (recording stock_movements).
 */
export async function saveProduct(product: Product): Promise<void> {
  const productId = (product.id || product.slug).trim();
  if (!productId) {
    throw new Error("Product ID is required.");
  }

  const mode = getDataBackendMode();

  if (mode === "supabase" || mode === "hybrid") {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const plain = productToPlainObject({
      ...product,
      id: productId,
      slug: product.slug || productId,
    });
    const desiredStock = Math.max(0, Math.trunc(Number(plain.stockQuantity) || 0));
    const categoryId = categoryToId(plain.category as ProductCategory);

    const { data: existing } = await supabase
      .from("products")
      .select("id, stock_quantity, has_variants")
      .eq("id", productId)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase
        .from("products")
        .update({
          slug: plain.slug,
          name: plain.name,
          category_id: categoryId,
          price: plain.price,
          compare_at_price: product.compareAtPrice ?? null,
          image: plain.image,
          description: plain.description,
          specs: plain.specs,
          low_stock_threshold: plain.lowStockThreshold,
          is_active: plain.isActive,
          featured: plain.featured,
        })
        .eq("id", productId);

      if (updateErr) {
        throw new Error(`Failed to update product in Supabase: ${updateErr.message}`);
      }

      if (!existing.has_variants && existing.stock_quantity !== desiredStock) {
        const { error: stockErr } = await supabase.rpc("admin_adjust_stock", {
          p_product_id: productId,
          p_variant_id: null,
          p_new_stock: desiredStock,
          p_delta: null,
          p_note: "Admin catalog product save",
        });
        if (stockErr) {
          throw new Error(`Failed to record stock movement: ${stockErr.message}`);
        }
      }
    } else {
      const { error: insertErr } = await supabase.from("products").insert({
        id: productId,
        slug: plain.slug,
        name: plain.name,
        category_id: categoryId,
        price: plain.price,
        compare_at_price: product.compareAtPrice ?? null,
        image: plain.image,
        description: plain.description,
        specs: plain.specs,
        stock_quantity: 0,
        low_stock_threshold: plain.lowStockThreshold,
        is_active: plain.isActive,
        is_archived: false,
        featured: plain.featured,
      });

      if (insertErr) {
        throw new Error(`Failed to create product in Supabase: ${insertErr.message}`);
      }

      if (desiredStock > 0) {
        const { error: stockErr } = await supabase.rpc("admin_adjust_stock", {
          p_product_id: productId,
          p_variant_id: null,
          p_new_stock: desiredStock,
          p_delta: null,
          p_note: "Initial stock on product creation",
        });
        if (stockErr) {
          throw new Error(`Product created, but initial stock movement failed: ${stockErr.message}`);
        }
      }
    }

    // Sync gallery images cleanly
    const urls = (plain.imageUrls as string[]) || [];
    const { error: delImgErr } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", productId);

    if (delImgErr) {
      throw new Error(`Failed to sync product gallery images: ${delImgErr.message}`);
    }

    if (urls.length > 0) {
      const imageRows = urls.map((url, idx) => ({
        product_id: productId,
        url,
        position: idx,
      }));
      const { error: insImgErr } = await supabase.from("product_images").insert(imageRows);
      if (insImgErr) {
        throw new Error(`Failed to insert product gallery images: ${insImgErr.message}`);
      }
    }

    if (typeof window !== "undefined") {
      fetch("/api/revalidate", { method: "POST" }).catch(() => {});
    }

    if (mode === "supabase") {
      return;
    }
  }

  // Legacy Firebase path (preserved when NEXT_PUBLIC_DATA_BACKEND === "firebase" or "hybrid")
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

export async function saveProductsBatch(productsList: Product[]): Promise<void> {
  const mode = getDataBackendMode();

  if (mode === "supabase" || mode === "hybrid") {
    for (const prod of productsList) {
      await saveProduct(prod);
    }
    if (mode === "supabase") {
      return;
    }
  }

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

  const mode = getDataBackendMode();

  if (mode === "supabase" || mode === "hybrid") {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    // Soft-archive if historical orders/movements reference this product (preserves referential history)
    const [{ count: orderRefCount }, { count: moveRefCount }] = await Promise.all([
      supabase.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", cleanId),
      supabase.from("stock_movements").select("id", { count: "exact", head: true }).eq("product_id", cleanId),
    ]);

    if ((orderRefCount ?? 0) > 0 || (moveRefCount ?? 0) > 0) {
      const { error } = await supabase
        .from("products")
        .update({ is_archived: true, is_active: false })
        .eq("id", cleanId);
      if (error) {
        throw new Error(`Failed to archive product: ${error.message}`);
      }
    } else {
      const { error } = await supabase.from("products").delete().eq("id", cleanId);
      if (error) {
        throw new Error(`Failed to delete product: ${error.message}`);
      }
    }

    if (typeof window !== "undefined") {
      fetch("/api/revalidate", { method: "POST" }).catch(() => {});
    }

    if (mode === "supabase") {
      return;
    }
  }

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
