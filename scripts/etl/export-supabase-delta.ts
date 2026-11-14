/**
 * Architectural Correction #7:
 * Post-Cutover Rollback Delta Drain Script
 *
 * Captures every order, order_item, stock_movement, profile, and CMS revision created
 * in Supabase AFTER production cutover (--since=<ISO-8601>) so an emergency rollback to
 * Firebase never orphans customer orders or financial records placed during the Supabase window.
 *
 * Usage:
 *   npx tsx scripts/etl/export-supabase-delta.ts --since=2026-11-15T00:00:00Z
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./load-env";

function readArg(prefix: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

async function main() {
  loadLocalEnv();
  const dryRun = process.argv.includes("--dry-run");
  const since = readArg("--since=") || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  if (dryRun) {
    console.log(`[Delta Export] DRY-RUN validated (since=${since}).`);
    console.log(
      "[Delta Export] When executed with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY, exports: orders (with order_items + order_events), stock_movements, profiles, storefront_config_revisions.",
    );
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

  const [ordersRes, movementsRes, profilesRes, configRevsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("*, order_items(*), order_events(*)")
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
    supabase
      .from("stock_movements")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, email, full_name, phone, default_governorate, default_address, role, created_at")
      .gte("created_at", since),
    supabase
      .from("storefront_config_revisions")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (movementsRes.error) throw movementsRes.error;
  if (profilesRes.error) throw profilesRes.error;
  if (configRevsRes.error) throw configRevsRes.error;

  const outDir = join(resolve(process.cwd()), "backups");
  mkdirSync(outDir, { recursive: true });
  const filePath = join(outDir, `supabase-postcutover-delta-${Date.now()}.json`);

  writeFileSync(
    filePath,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        since,
        counts: {
          orders: ordersRes.data?.length || 0,
          stockMovements: movementsRes.data?.length || 0,
          profiles: profilesRes.data?.length || 0,
          cmsRevisions: configRevsRes.data?.length || 0,
        },
        orders: ordersRes.data || [],
        stockMovements: movementsRes.data || [],
        profiles: profilesRes.data || [],
        cmsRevisions: configRevsRes.data || [],
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`[Delta Export] Saved ${ordersRes.data?.length || 0} post-cutover orders to ${filePath}`);
}

main().catch((err) => {
  console.error("[Delta Export] Failed:", err);
  process.exit(1);
});
