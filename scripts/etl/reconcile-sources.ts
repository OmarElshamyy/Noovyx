/**
 * 4-Source Reconciliation Library (Seed + Firestore + Local Disk JSON + Browser localStorage Export)
 *
 * Implements Architectural Corrections #4 & #5:
 * - Accepts an explicit browser localStorage export file (--browser-export=<path>) because
 *   server-side ETL cannot inspect browser storage directly.
 * - Preserves historical order source data verbatim without fabricating missing shipping fees,
 *   cod fees, discounts, or grand totals.
 * - Filters out reserved CMS hack docs (noovyx-cms-config-v2, __noovyx_cms_config__) from products.
 */
import { products as seedProducts } from "../../products";
import { productFromData } from "../../productService";
import {
  DEFAULT_STOREFRONT_CONFIG,
  mergeStorefrontConfig,
  type StorefrontConfig,
} from "../../storefrontConfig";
import type { Product } from "../../types";

export interface ReconciliationConflict {
  productId: string;
  field: string;
  sources: Record<string, unknown>;
  chosenSource: string;
  chosenValue: unknown;
}

export interface LegacyOrderNormalized {
  id: string;
  legacySource: "firestore";
  customerName: string;
  contact: string;
  address: string;
  notes: string;
  status: "new" | "confirmed" | "fulfilled" | "cancelled";
  subtotal: number;
  shippingFee: null;
  codFee: null;
  discountAmount: null;
  grandTotal: null;
  isLegacyImport: true;
  legacyRawPayload: Record<string, unknown>;
  legacyUnrecoverableFields: string[];
  createdAtIso: string;
  items: {
    productId: string | null;
    productExistsInCatalog: boolean;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface ReconciledDataset {
  products: Product[];
  deletedProductIds: string[];
  cmsConfig: StorefrontConfig;
  cmsWinningSource: string;
  orders: LegacyOrderNormalized[];
  conflicts: ReconciliationConflict[];
  sourceCounts: {
    seedProducts: number;
    firestoreRawDocs: number;
    firestoreValidProducts: number;
    firestoreReservedCmsDocsSkipped: number;
    localCatalogOverrides: number;
    browserCatalogOverrides: number;
    reconciledActiveProducts: number;
    reconciledHiddenProducts: number;
    reconciledDeletedProducts: number;
    legacyOrdersTotal: number;
    legacyOrdersWithOrphanProductRef: number;
    base64ImagesDetected: number;
  };
}

const RESERVED_CMS_IDS = new Set(["noovyx-cms-config-v2", "__noovyx_cms_config__"]);
const VALID_ORDER_STATUSES = new Set(["new", "confirmed", "fulfilled", "cancelled"]);
const BASE64_RE = /^data:image\/(png|jpeg|jpg|webp|avif);base64,/i;

function decodeCmsFromProductImageUrl(raw: unknown): { config: StorefrontConfig; updatedAt: number } | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  let jsonStr = raw.trim();
  const prefix = "data:image/png;base64,";
  try {
    if (jsonStr.startsWith(prefix)) {
      const b64 = jsonStr.slice(prefix.length);
      const utf8 = Buffer.from(b64, "base64").toString("utf8");
      if (utf8.trimStart().startsWith("{")) {
        jsonStr = utf8;
      } else {
        jsonStr = decodeURIComponent(escape(Buffer.from(b64, "base64").toString("binary")));
      }
    }
    if (!jsonStr.startsWith("{")) return null;
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const updatedAt = typeof parsed._updatedAt === "number" ? parsed._updatedAt : 0;
    return {
      config: mergeStorefrontConfig(parsed),
      updatedAt,
    };
  } catch {
    return null;
  }
}

export function reconcileAllSources(input: {
  firestoreProducts?: Record<string, unknown>[];
  firestoreOrders?: Record<string, unknown>[];
  firestoreSettings?: Record<string, unknown>[];
  localDiskState?: Record<string, unknown> | null;
  browserExport?: Record<string, unknown> | null;
}): ReconciledDataset {
  const firestoreRaw = input.firestoreProducts || [];
  const firestoreOrdersRaw = input.firestoreOrders || [];
  const firestoreSettings = input.firestoreSettings || [];
  const localDisk = input.localDiskState || null;
  const browserEntries =
    (input.browserExport?.entries as Record<string, unknown> | undefined) ||
    input.browserExport ||
    null;

  // 1. Collect reserved CMS docs & filter real Firestore products
  let reservedCmsSkipped = 0;
  let cmsFromFirestoreProductDoc: { config: StorefrontConfig; updatedAt: number } | null = null;
  const firestoreProductsList: Product[] = [];

  for (const doc of firestoreRaw) {
    const id = String(doc.id || doc.slug || "").trim();
    if (!id) continue;
    if (RESERVED_CMS_IDS.has(id)) {
      reservedCmsSkipped++;
      const decoded = decodeCmsFromProductImageUrl(doc.imageUrl);
      if (decoded && (!cmsFromFirestoreProductDoc || decoded.updatedAt > cmsFromFirestoreProductDoc.updatedAt)) {
        cmsFromFirestoreProductDoc = decoded;
      }
      continue;
    }
    firestoreProductsList.push(productFromData(id, doc));
  }

  // 2. Parse local disk and browser localStorage catalog states
  const localCatalogRaw = (localDisk?.catalogState as Record<string, unknown> | undefined) || {};
  const localOverrides =
    (localCatalogRaw.overrides as Record<string, Record<string, unknown>> | undefined) || {};
  const localDeleted = Array.isArray(localCatalogRaw.deletedIds)
    ? localCatalogRaw.deletedIds.map((x) => String(x))
    : [];
  const localUpdatedAt = Number(localCatalogRaw.updatedAt || localDisk?.updatedAt || 0);

  const browserCatRaw =
    (browserEntries?.noovyx_catalog_state_v2 as Record<string, unknown> | undefined) ||
    (browserEntries?.noovyx_catalog_state_v1 as Record<string, unknown> | undefined) ||
    {};
  const browserOverrides =
    (browserCatRaw.overrides as Record<string, Record<string, unknown>> | undefined) || {};
  const browserDeleted = Array.isArray(browserCatRaw.deletedIds)
    ? browserCatRaw.deletedIds.map((x) => String(x))
    : [];
  const browserUpdatedAt = Number(browserCatRaw.updatedAt || 0);

  // Remote catalogState embedded inside settings/storefront
  const settingsDoc = firestoreSettings.find((s) => s.id === "storefront");
  const remoteCatalogRaw =
    (settingsDoc?.catalogState as Record<string, unknown> | undefined) || {};
  const remoteOverrides =
    (remoteCatalogRaw.overrides as Record<string, Record<string, unknown>> | undefined) || {};
  const remoteDeleted = Array.isArray(remoteCatalogRaw.deletedIds)
    ? remoteCatalogRaw.deletedIds.map((x) => String(x))
    : [];
  const remoteUpdatedAt = Number(remoteCatalogRaw.updatedAt || 0);

  // Order override layers chronologically (oldest -> newest wins cleanly)
  const layers = [
    { name: "firestore_settings_catalogState", overrides: remoteOverrides, deleted: remoteDeleted, ts: remoteUpdatedAt },
    { name: "local_disk_state", overrides: localOverrides, deleted: localDeleted, ts: localUpdatedAt },
    { name: "browser_localStorage_export", overrides: browserOverrides, deleted: browserDeleted, ts: browserUpdatedAt },
  ].sort((a, b) => a.ts - b.ts);

  // 3. Reconcile Products cleanly and record conflicts
  const map = new Map<string, Product>();
  const conflicts: ReconciliationConflict[] = [];
  const originById = new Map<string, string>();

  for (const sp of seedProducts) {
    map.set(sp.id, { ...sp });
    originById.set(sp.id, "seed_products_ts");
  }

  for (const fp of firestoreProductsList) {
    const prev = map.get(fp.id);
    if (prev && (prev.price !== fp.price || prev.isActive !== fp.isActive || prev.stockQuantity !== fp.stockQuantity)) {
      conflicts.push({
        productId: fp.id,
        field: "product_state",
        sources: {
          seed: { price: prev.price, stock: prev.stockQuantity, isActive: prev.isActive },
          firestore: { price: fp.price, stock: fp.stockQuantity, isActive: fp.isActive },
        },
        chosenSource: "firestore_products_collection",
        chosenValue: { price: fp.price, stock: fp.stockQuantity, isActive: fp.isActive },
      });
    }
    map.set(fp.id, prev ? { ...prev, ...fp } : fp);
    originById.set(fp.id, "firestore_products_collection");
  }

  const deletedSet = new Set<string>();
  for (const layer of layers) {
    for (const delId of layer.deleted) {
      if (!RESERVED_CMS_IDS.has(delId)) {
        deletedSet.add(delId);
        map.delete(delId);
      }
    }
    for (const [id, ov] of Object.entries(layer.overrides)) {
      if (RESERVED_CMS_IDS.has(id) || id === "__proto__" || id === "constructor" || id === "prototype") continue;
      deletedSet.delete(id);
      const prev = map.get(id);
      const nextProd = productFromData(id, prev ? ({ ...prev, ...ov } as Record<string, unknown>) : ov);
      if (prev && (prev.price !== nextProd.price || prev.isActive !== nextProd.isActive || prev.stockQuantity !== nextProd.stockQuantity)) {
        conflicts.push({
          productId: id,
          field: "override_layer",
          sources: {
            [originById.get(id) || "previous"]: { price: prev.price, stock: prev.stockQuantity, isActive: prev.isActive },
            [layer.name]: { price: nextProd.price, stock: nextProd.stockQuantity, isActive: nextProd.isActive, ts: layer.ts },
          },
          chosenSource: layer.name,
          chosenValue: { price: nextProd.price, stock: nextProd.stockQuantity, isActive: nextProd.isActive },
        });
      }
      map.set(id, nextProd);
      originById.set(id, layer.name);
    }
  }

  const products = Array.from(map.values());
  const finalProductIds = new Set(products.map((p) => p.id));

  // Count Base64 images requiring Storage extraction
  let base64ImagesDetected = 0;
  for (const p of products) {
    const urls = p.imageUrls?.length ? p.imageUrls : [p.imageUrl];
    for (const u of urls) {
      if (u && BASE64_RE.test(u)) base64ImagesDetected++;
    }
  }

  // 4. Reconcile Storefront CMS config cleanly
  const cmsCandidates: { source: string; ts: number; config: StorefrontConfig }[] = [
    { source: "default_storefront_config", ts: 0, config: DEFAULT_STOREFRONT_CONFIG },
  ];
  if (settingsDoc?.cmsConfig && typeof settingsDoc.cmsConfig === "object") {
    const ts = settingsDoc.updatedAt ? Date.parse(String(settingsDoc.updatedAt)) || 1 : 1;
    cmsCandidates.push({
      source: "firestore_settings_storefront",
      ts,
      config: mergeStorefrontConfig(settingsDoc.cmsConfig as Record<string, unknown>),
    });
  }
  if (cmsFromFirestoreProductDoc) {
    cmsCandidates.push({
      source: "firestore_products_cms_doc",
      ts: cmsFromFirestoreProductDoc.updatedAt || 2,
      config: cmsFromFirestoreProductDoc.config,
    });
  }
  if (localDisk?.cmsConfig && typeof localDisk.cmsConfig === "object") {
    cmsCandidates.push({
      source: "local_disk_cms_config",
      ts: Number(localDisk.cmsUpdatedAt || localDisk.updatedAt || 3),
      config: mergeStorefrontConfig(localDisk.cmsConfig as Record<string, unknown>),
    });
  }
  const browserCmsRaw =
    (browserEntries?.noovyx_storefront_cms_config_v2 as Record<string, unknown> | undefined) ||
    (browserEntries?.kz_storefront_cms_config_v1 as Record<string, unknown> | undefined);
  if (browserCmsRaw && typeof browserCmsRaw === "object") {
    const ts = Number(browserEntries?.noovyx_storefront_cms_updated_at_v2 || browserUpdatedAt || 4);
    cmsCandidates.push({
      source: "browser_localStorage_cms",
      ts,
      config: mergeStorefrontConfig(browserCmsRaw),
    });
  }
  cmsCandidates.sort((a, b) => b.ts - a.ts);
  const winningCms = cmsCandidates[0];

  // 5. Reconcile Historical Orders WITHOUT fabricating missing financial columns
  let orphanOrderCount = 0;
  const orders: LegacyOrderNormalized[] = firestoreOrdersRaw.map((raw) => {
    const id = String(raw.id || "").trim();
    const rawStatus = String(raw.status || "new").trim();
    const status = (VALID_ORDER_STATUSES.has(rawStatus) ? rawStatus : "new") as LegacyOrderNormalized["status"];
    const rawItems = Array.isArray(raw.items) ? raw.items : [];
    let hasOrphan = false;

    const items = rawItems.map((it) => {
      const obj = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
      const pid = typeof obj.productId === "string" ? obj.productId.trim() : "";
      const exists = Boolean(pid && finalProductIds.has(pid));
      if (!exists) hasOrphan = true;
      return {
        productId: exists ? pid : null,
        productExistsInCatalog: exists,
        name: String(obj.name || pid || "Legacy Product"),
        quantity: Math.max(1, Math.trunc(Number(obj.quantity) || 1)),
        unitPrice: Math.max(0, Number(obj.unitPrice) || 0),
      };
    });

    if (hasOrphan) orphanOrderCount++;

    const createdAtIso =
      typeof raw.createdAt === "string" && !Number.isNaN(Date.parse(raw.createdAt))
        ? new Date(raw.createdAt).toISOString()
        : new Date().toISOString();

    return {
      id,
      legacySource: "firestore",
      customerName: String(raw.customerName || "Unknown Customer").trim(),
      contact: String(raw.contact || "N/A").trim(),
      address: String(raw.address || "N/A").trim(),
      notes: String(raw.notes || "").trim(),
      status,
      subtotal: Math.max(0, Number(raw.subtotal) || 0),
      shippingFee: null,
      codFee: null,
      discountAmount: null,
      grandTotal: null,
      isLegacyImport: true,
      legacyRawPayload: raw,
      legacyUnrecoverableFields: [
        "shipping_fee",
        "cod_fee",
        "discount_amount",
        "grand_total",
        "governorate",
        "stock_movements_at_order_time",
      ],
      createdAtIso,
      items,
    };
  });

  return {
    products,
    deletedProductIds: Array.from(deletedSet),
    cmsConfig: winningCms.config,
    cmsWinningSource: winningCms.source,
    orders,
    conflicts,
    sourceCounts: {
      seedProducts: seedProducts.length,
      firestoreRawDocs: firestoreRaw.length,
      firestoreValidProducts: firestoreProductsList.length,
      firestoreReservedCmsDocsSkipped: reservedCmsSkipped,
      localCatalogOverrides: Object.keys(localOverrides).length,
      browserCatalogOverrides: Object.keys(browserOverrides).length,
      reconciledActiveProducts: products.filter((p) => p.isActive).length,
      reconciledHiddenProducts: products.filter((p) => !p.isActive).length,
      reconciledDeletedProducts: deletedSet.size,
      legacyOrdersTotal: orders.length,
      legacyOrdersWithOrphanProductRef: orphanOrderCount,
      base64ImagesDetected,
    },
  };
}
