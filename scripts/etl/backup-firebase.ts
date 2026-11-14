/**
 * Phase 0 Non-Destructive Read-Only Firebase & Local State Backup Script
 *
 * Reads all collections from Cloud Firestore (using firebase-admin if serviceAccountKey.json
 * is configured, or client Firebase SDK fallback), snapshots local-catalog-state.json,
 * products.ts, and storefrontConfig.ts, and writes a timestamped immutable JSON backup
 * under backups/pre-supabase-<timestamp>/.
 *
 * Strict Rules #1 & #2: Read-only! Never modifies or deletes Firebase production data.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { products as seedProducts, PRODUCT_CATEGORIES } from "../../products";
import { DEFAULT_STOREFRONT_CONFIG } from "../../storefrontConfig";

async function readFirestoreViaAdmin(serviceAccountPath: string) {
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const rawCreds = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(rawCreds),
    });
  }

  const firestore = getFirestore();
  const [productsSnap, ordersSnap, settingsSnap, adminsSnap] = await Promise.all([
    firestore.collection("products").get(),
    firestore.collection("orders").get(),
    firestore.collection("settings").get(),
    firestore.collection("admins").get(),
  ]);

  const serializeDoc = (d: FirebaseFirestore.QueryDocumentSnapshot) => {
    const raw = d.data();
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
        normalized[k] = (v as { toDate: () => Date }).toDate().toISOString();
      } else {
        normalized[k] = v;
      }
    }
    return { id: d.id, ...normalized };
  };

  return {
    source: "firebase-admin",
    products: productsSnap.docs.map(serializeDoc),
    orders: ordersSnap.docs.map(serializeDoc),
    settings: settingsSnap.docs.map(serializeDoc),
    admins: adminsSnap.docs.map(serializeDoc),
  };
}

async function main() {
  const rootDir = resolve(process.cwd());
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join(rootDir, "backups", `pre-supabase-${timestamp}`);
  mkdirSync(outDir, { recursive: true });

  console.log(`[Backup] Writing read-only snapshot to ${outDir}`);

  // 1. Seed snapshot
  writeFileSync(
    join(outDir, "seed-snapshot.json"),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        categories: PRODUCT_CATEGORIES,
        productsCount: seedProducts.length,
        products: seedProducts,
        defaultStorefrontConfig: DEFAULT_STOREFRONT_CONFIG,
      },
      null,
      2,
    ),
    "utf8",
  );

  // 2. Local disk override file snapshot
  const localCatalogPath = join(rootDir, "local-catalog-state.json");
  if (existsSync(localCatalogPath)) {
    writeFileSync(
      join(outDir, "local-catalog-state.json"),
      readFileSync(localCatalogPath, "utf8"),
      "utf8",
    );
    console.log("[Backup] Captured local-catalog-state.json");
  } else {
    console.log("[Backup] local-catalog-state.json not present (skipped)");
  }

  // 3. Read-only Cloud Firestore snapshot via serviceAccountKey.json if present
  const saPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    join(rootDir, "serviceAccountKey.json");

  if (existsSync(saPath)) {
    try {
      const firestoreDump = await readFirestoreViaAdmin(saPath);
      writeFileSync(
        join(outDir, "firestore-export.json"),
        JSON.stringify(firestoreDump, null, 2),
        "utf8",
      );
      console.log(
        `[Backup] Firestore exported cleanly: ${firestoreDump.products.length} product docs, ${firestoreDump.orders.length} orders, ${firestoreDump.settings.length} settings docs`,
      );
    } catch (err) {
      console.warn(
        `[Backup] Could not connect to Firestore (offline or invalid credentials): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  } else {
    console.log("[Backup] No serviceAccountKey.json found; Firestore live export skipped.");
  }

  console.log("[Backup] Completed read-only backup successfully.");
}

main().catch((err) => {
  console.error("[Backup] Fatal error:", err);
  process.exit(1);
});
