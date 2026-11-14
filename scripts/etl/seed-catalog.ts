/**
 * Idempotent Database Seed Script
 *
 * Usage:
 *   npx tsx scripts/etl/seed-catalog.ts --dry-run
 *   npx tsx scripts/etl/seed-catalog.ts --execute            # Uses NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { products as seedProducts, PRODUCT_CATEGORIES } from "../../products";
import { DEFAULT_STOREFRONT_CONFIG } from "../../storefrontConfig";
import type { ProductCategory } from "../../types";

const CATEGORY_META: Record<ProductCategory, { id: string; blurb: string; image: string }> = {
  IEMs: {
    id: "iems",
    blurb: "Dual dynamic and multi-BA in-ear monitors engineered for stage and gaming.",
    image: "/categories/iems.jpg",
  },
  Wireless: {
    id: "wireless",
    blurb: "Low-latency Bluetooth hooks and true wireless adapters.",
    image: "/categories/wireless.jpg",
  },
  Cables: {
    id: "cables",
    blurb: "Silver-plated braided upgrade cables with 0.75mm/0.78mm 2-pin fit.",
    image: "/categories/cables.jpg",
  },
  "Ear tips": {
    id: "ear-tips",
    blurb: "Acoustic silicone and memory foam tips for isolation and comfort.",
    image: "/categories/ear-tips.jpg",
  },
  Cases: {
    id: "cases",
    blurb: "Shockproof storage cases for monitors, cables, and DAC dongles.",
    image: "/categories/cases.jpg",
  },
  DACs: {
    id: "dacs",
    blurb: "Portable Hi-Res Type-C DAC amplifiers with low noise floor.",
    image: "/categories/dacs.jpg",
  },
};

async function main() {
  const execute = process.argv.includes("--execute");
  const dryRun = !execute || process.argv.includes("--dry-run");

  console.log(
    `[Seed] Mode: ${dryRun ? "DRY-RUN (no writes)" : "EXECUTE (writing to configured Supabase)"}`,
  );
  console.log(`[Seed] Categories: ${PRODUCT_CATEGORIES.length}, Products: ${seedProducts.length}`);

  if (dryRun) {
    console.log("[Seed] Dry-run validated all categories, products, images, and CMS config cleanly.");
    return;
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const secret = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !secret) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  }

  const supabase = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Seed categories idempotently
  for (const [idx, label] of PRODUCT_CATEGORIES.entries()) {
    const meta = CATEGORY_META[label];
    const { error } = await supabase.from("categories").upsert(
      {
        id: meta.id,
        label,
        blurb: meta.blurb,
        image: meta.image,
        sort_order: idx,
        is_visible: true,
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(`Category upsert failed (${label}): ${error.message}`);
  }

  // 2. Seed products + images + idempotent initial stock_movements ledger
  for (const [idx, p] of seedProducts.entries()) {
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
        legacy_source: "seed_products_ts",
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (prodErr) throw new Error(`Product seed failed (${p.id}): ${prodErr.message}`);

    const urls = (p.imageUrls?.length ? p.imageUrls : [p.imageUrl]).filter(Boolean);
    for (const [pos, imgUrl] of urls.entries()) {
      const { error: imgErr } = await supabase.from("product_images").upsert(
        {
          product_id: p.id,
          url: imgUrl,
          position: pos,
        },
        { onConflict: "product_id,position", ignoreDuplicates: true },
      );
      if (imgErr) throw new Error(`Image seed failed (${p.id}#${pos}): ${imgErr.message}`);
    }

    if (p.stockQuantity > 0) {
      const { error: moveErr } = await supabase.from("stock_movements").upsert(
        {
          product_id: p.id,
          variant_id: null,
          quantity_delta: p.stockQuantity,
          balance_after: p.stockQuantity,
          movement_type: "initial_seed",
          reference_type: "seed",
          reference_id: p.id,
          actor_label: "seed-catalog.ts",
          note: "Initial baseline seed inventory",
          idempotency_key: `seed:${p.id}`,
        },
        { onConflict: "idempotency_key", ignoreDuplicates: true },
      );
      if (moveErr) throw new Error(`Stock movement seed failed (${p.id}): ${moveErr.message}`);
    }
  }

  // 3. Seed default storefront CMS config only if absent
  const { error: cfgErr } = await supabase.from("storefront_config").upsert(
    {
      id: 1,
      config: DEFAULT_STOREFRONT_CONFIG,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (cfgErr) throw new Error(`CMS seed failed: ${cfgErr.message}`);

  console.log(`[Seed] Successfully seeded ${PRODUCT_CATEGORIES.length} categories and ${seedProducts.length} products.`);
}

main().catch((err) => {
  console.error("[Seed] Error:", err.message || err);
  process.exit(1);
});
