/**
 * Complete Idempotent ETL Migration Script (Firebase + Local Disk + Browser Export -> Supabase)
 *
 * Usage:
 *   npx tsx scripts/etl/migrate-to-supabase.ts --dry-run [--backup-dir=backups/...] [--browser-export=backups/browser.json]
 *   npx tsx scripts/etl/migrate-to-supabase.ts --execute [--backup-dir=backups/...] [--browser-export=backups/browser.json]
 *
 * Guarantees:
 * - Dry-run by default (requires explicit --execute flag to write).
 * - Never modifies source Firebase data or backups.
 * - Filters out reserved CMS hack docs from products.
 * - Extracts Base64 data:image/* URIs and uploads cleanly to Supabase Storage.
 * - Preserves historical orders verbatim with NULL missing financials (no fabrication).
 * - Generates a timestamped Data Reconciliation Report JSON.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { PRODUCT_CATEGORIES } from "../../products";
import { reconcileAllSources } from "./reconcile-sources";
import { migrateImageUrlToStorage } from "./storage-images";
import { loadLocalEnv } from "./load-env";

const CATEGORY_META: Record<string, { id: string; blurb: string; image: string }> = {
  IEMs: { id: "iems", blurb: "In-ear monitors engineered for stage and gaming.", image: "/categories/iems.jpg" },
  Wireless: { id: "wireless", blurb: "Low-latency Bluetooth hooks and adapters.", image: "/categories/wireless.jpg" },
  Cables: { id: "cables", blurb: "Braided audiophile upgrade cables.", image: "/categories/cables.jpg" },
  "Ear tips": { id: "ear-tips", blurb: "Acoustic silicone and memory foam ear tips.", image: "/categories/ear-tips.jpg" },
  Cases: { id: "cases", blurb: "Shockproof carrying cases.", image: "/categories/cases.jpg" },
  DACs: { id: "dacs", blurb: "Portable Type-C Hi-Res DAC amplifiers.", image: "/categories/dacs.jpg" },
};

function readArg(prefix: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function findLatestBackupDir(rootDir: string): string | undefined {
  const backupsDir = join(rootDir, "backups");
  if (!existsSync(backupsDir)) return undefined;
  const dirs = readdirSync(backupsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("pre-supabase-"))
    .map((d) => d.name)
    .sort()
    .reverse();
  return dirs[0] ? join(backupsDir, dirs[0]) : undefined;
}

async function main() {
  loadLocalEnv();
  const rootDir = resolve(process.cwd());
  const execute = process.argv.includes("--execute");
  const dryRun = !execute || process.argv.includes("--dry-run");
  const backupDir = readArg("--backup-dir=") || findLatestBackupDir(rootDir);
  const browserExportPath = readArg("--browser-export=");

  let firestoreExport: Record<string, unknown> = {};
  let localDiskState: Record<string, unknown> | null = null;
  let browserExport: Record<string, unknown> | null = null;

  if (backupDir && existsSync(join(backupDir, "firestore-export.json"))) {
    firestoreExport = JSON.parse(readFileSync(join(backupDir, "firestore-export.json"), "utf8"));
  }
  if (backupDir && existsSync(join(backupDir, "local-catalog-state.json"))) {
    localDiskState = JSON.parse(readFileSync(join(backupDir, "local-catalog-state.json"), "utf8"));
  } else if (existsSync(join(rootDir, "local-catalog-state.json"))) {
    localDiskState = JSON.parse(readFileSync(join(rootDir, "local-catalog-state.json"), "utf8"));
  }
  if (browserExportPath && existsSync(browserExportPath)) {
    browserExport = JSON.parse(readFileSync(browserExportPath, "utf8"));
  }

  const dataset = reconcileAllSources({
    firestoreProducts: (firestoreExport.products as Record<string, unknown>[]) || [],
    firestoreOrders: (firestoreExport.orders as Record<string, unknown>[]) || [],
    firestoreSettings: (firestoreExport.settings as Record<string, unknown>[]) || [],
    localDiskState,
    browserExport,
  });

  console.log(`\n=== NOOVYX SUPABASE ETL (${dryRun ? "DRY-RUN" : "EXECUTE"}) ===`);
  console.log("Backup directory :", backupDir || "(none — seed + local disk only)");
  console.log("Browser export   :", browserExportPath || "(none provided)");
  console.log("Source counts    :", JSON.stringify(dataset.sourceCounts, null, 2));
  console.log("CMS winner       :", dataset.cmsWinningSource);
  console.log("Conflicts logged :", dataset.conflicts.length);

  let supabase = null;
  if (!dryRun) {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const secret = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!url || !secret) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY for --execute.");
    }
    supabase = createClient(url, secret, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  let uploadedImagesCount = 0;
  let uploadedImagesBytes = 0;

  // Execute or dry-run image extraction + DB upserts
  if (!dryRun && supabase) {
    // 1. Categories
    for (const [idx, label] of PRODUCT_CATEGORIES.entries()) {
      const meta = CATEGORY_META[label];
      const { error } = await supabase.from("categories").upsert(
        { id: meta.id, label, blurb: meta.blurb, image: meta.image, sort_order: idx, is_visible: true },
        { onConflict: "id" },
      );
      if (error) throw new Error(`Category upsert failed: ${error.message}`);
    }

    // 2. Products + Base64 Storage extraction + stock_movements
    for (const [idx, p] of dataset.products.entries()) {
      const catId = CATEGORY_META[p.category]?.id || "iems";
      const { error: prodErr } = await supabase.from("products").upsert(
        {
          id: p.id,
          slug: p.slug || p.id,
          name: p.name,
          category_id: catId,
          price: p.price,
          image: p.image || "KZ",
          description: p.description || "",
          specs: p.specs || [],
          stock_quantity: p.stockQuantity,
          low_stock_threshold: p.lowStockThreshold,
          is_active: p.isActive,
          is_archived: false,
          featured: p.featured,
          sort_order: idx,
          legacy_source: "etl_reconciled",
        },
        { onConflict: "id" },
      );
      if (prodErr) throw new Error(`Product ETL failed (${p.id}): ${prodErr.message}`);

      const urls = (p.imageUrls?.length ? p.imageUrls : [p.imageUrl]).filter(Boolean);
      for (const [pos, rawUrl] of urls.entries()) {
        const res = await migrateImageUrlToStorage(rawUrl, {
          supabase,
          bucket: "product-images",
          entitySlug: p.id,
          position: pos,
          dryRun,
        });
        if (res.extractedBase64) {
          uploadedImagesCount++;
          uploadedImagesBytes += res.byteSize;
        }
        const { error: imgErr } = await supabase.from("product_images").upsert(
          {
            product_id: p.id,
            url: res.finalUrl,
            storage_path: res.storagePath,
            position: pos,
          },
          { onConflict: "product_id,position" },
        );
        if (imgErr) throw new Error(`Product image ETL failed (${p.id}#${pos}): ${imgErr.message}`);
      }

      if (p.stockQuantity > 0) {
        const { data: existingMovement } = await supabase
          .from("stock_movements")
          .select("id")
          .eq("product_id", p.id)
          .in("idempotency_key", [`migration_seed:${p.id}`, `etl_init:${p.id}`])
          .limit(1)
          .maybeSingle();

        if (!existingMovement) {
          await supabase.from("stock_movements").upsert(
            {
              product_id: p.id,
              variant_id: null,
              quantity_delta: p.stockQuantity,
              balance_after: p.stockQuantity,
              movement_type: "migration_import",
              reference_type: "etl",
              reference_id: p.id,
              actor_label: "migrate-to-supabase.ts",
              note: "Initial reconciled inventory at Supabase migration",
              idempotency_key: `etl_init:${p.id}`,
            },
            { onConflict: "idempotency_key", ignoreDuplicates: true },
          );
        }
      }
    }

    // 3. CMS Config (skip write if identical to avoid unnecessary version bumps)
    const { data: currentCfgRow } = await supabase
      .from("storefront_config")
      .select("config")
      .eq("id", 1)
      .maybeSingle();

    if (JSON.stringify(currentCfgRow?.config ?? null) !== JSON.stringify(dataset.cmsConfig)) {
      const { error: cfgErr } = await supabase.from("storefront_config").upsert(
        { id: 1, config: dataset.cmsConfig },
        { onConflict: "id" },
      );
      if (cfgErr) throw new Error(`CMS ETL failed: ${cfgErr.message}`);
    }

    // 4. Historical Orders (Idempotent via legacy_source_id, NULL missing financials preserved!)
    for (const ord of dataset.orders) {
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("legacy_source_id", ord.id)
        .maybeSingle();

      if (existing) continue;

      const { data: insertedOrder, error: ordErr } = await supabase
        .from("orders")
        .insert({
          customer_name: ord.customerName,
          contact: ord.contact,
          address: ord.address,
          notes: ord.notes,
          status: ord.status,
          subtotal: ord.subtotal,
          shipping_fee: null,
          cod_fee: null,
          discount_amount: null,
          grand_total: null,
          is_legacy_import: true,
          legacy_source: ord.legacySource,
          legacy_source_id: ord.id,
          legacy_raw_payload: ord.legacyRawPayload,
          legacy_unrecoverable_fields: ord.legacyUnrecoverableFields,
          created_at: ord.createdAtIso,
        })
        .select("id")
        .single();

      if (ordErr || !insertedOrder) {
        throw new Error(`Legacy order ETL failed (${ord.id}): ${ordErr?.message}`);
      }

      if (ord.items.length > 0) {
        const { error: oiErr } = await supabase.from("order_items").insert(
          ord.items.map((it) => ({
            order_id: insertedOrder.id,
            product_id: it.productId,
            name: it.name,
            unit_price: it.unitPrice,
            quantity: it.quantity,
          })),
        );
        if (oiErr) throw new Error(`Legacy order items failed (${ord.id}): ${oiErr.message}`);
      }

      await supabase.from("order_events").insert({
        order_id: insertedOrder.id,
        from_status: null,
        to_status: ord.status,
        actor_label: "etl_firestore_import",
        note: `Imported legacy Firestore order ${ord.id}`,
        created_at: ord.createdAtIso,
      });
    }
  } else {
    // Dry-run simulation of Base64 extractions
    for (const p of dataset.products) {
      const urls = (p.imageUrls?.length ? p.imageUrls : [p.imageUrl]).filter(Boolean);
      for (const [pos, rawUrl] of urls.entries()) {
        const res = await migrateImageUrlToStorage(rawUrl, {
          supabase: null,
          bucket: "product-images",
          entitySlug: p.id,
          position: pos,
          dryRun: true,
        });
        if (res.extractedBase64) {
          uploadedImagesCount++;
          uploadedImagesBytes += res.byteSize;
        }
      }
    }
  }

  // Write machine-readable reconciliation report
  const reportPayload = JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      mode: dryRun ? "dry-run" : "execute",
      ...dataset.sourceCounts,
      cmsWinningSource: dataset.cmsWinningSource,
      base64ImagesSimulatedOrUploaded: uploadedImagesCount,
      base64TotalBytes: uploadedImagesBytes,
      conflictsCount: dataset.conflicts.length,
      conflicts: dataset.conflicts,
    },
    null,
    2,
  );
  const fileName = `reconciliation-report-${dryRun ? "dryrun" : "execute"}-${Date.now()}.json`;
  const reportsDir = join(rootDir, "backups");
  let reportPath = join(reportsDir, fileName);
  try {
    mkdirSync(reportsDir, { recursive: true });
    writeFileSync(reportPath, reportPayload, "utf8");
  } catch (writeErr) {
    reportPath = join(tmpdir(), fileName);
    writeFileSync(reportPath, reportPayload, "utf8");
    console.warn(`[ETL] Note: Could not write report to backups/ (${(writeErr as Error).message}); wrote to ${reportPath}`);
  }

  console.log(`\n[ETL] ${dryRun ? "Dry-run" : "Migration"} complete. Report saved to: ${reportPath}`);
}

main().catch((err) => {
  console.error("[ETL] Fatal error:", err);
  process.exit(1);
});
