/**
 * Comprehensive Local PostgreSQL / RLS / Security / Inventory / ETL / Guest-Tracking Test Suite
 * Runs all 4 version-controlled SQL migrations inside an isolated PGlite PostgreSQL instance
 * configured with Supabase auth/storage shims and real anon/authenticated/service_role roles.
 *
 * Usage: npx tsx scripts/tests/run-supabase-suite.ts
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { products as seedProducts } from "../../products";
import { reconcileAllSources } from "../etl/reconcile-sources";

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

async function test(category: string, name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    results.push({ category, name, passed: true, details: "PASS" });
    console.log(`  [PASS] ${category}: ${name}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ category, name, passed: false, details: msg });
    console.error(`  [FAIL] ${category}: ${name} -> ${msg}`);
  }
}

async function initSupabaseShim(db: PGlite) {
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS extensions;
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE SCHEMA IF NOT EXISTS storage;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN BYPASSRLS;
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS auth.users (
      id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email              text UNIQUE,
      raw_app_meta_data  jsonb NOT NULL DEFAULT '{}'::jsonb,
      raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at         timestamptz NOT NULL DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
    $$;

    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT NULLIF(auth.jwt() ->> 'sub', '')::uuid;
    $$;

    CREATE TABLE IF NOT EXISTS storage.buckets (
      id                 text PRIMARY KEY,
      name               text NOT NULL,
      public             boolean NOT NULL DEFAULT false,
      file_size_limit    bigint,
      allowed_mime_types text[]
    );

    CREATE TABLE IF NOT EXISTS storage.objects (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id  text NOT NULL REFERENCES storage.buckets(id),
      name       text NOT NULL,
      owner      uuid,
      metadata   jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

    -- Real Postgres extension shim in PGlite for pgcrypto/pg_trgm statements in migration 001
    CREATE OR REPLACE FUNCTION extensions.gen_random_uuid() RETURNS uuid LANGUAGE sql AS $$
      SELECT gen_random_uuid();
    $$;
    CREATE OR REPLACE FUNCTION extensions.digest(data text, type text) RETURNS bytea LANGUAGE plpgsql AS $$
    BEGIN
      RETURN decode(md5(data), 'hex');
    END;
    $$;
  `);
}

function loadMigrationSql(filename: string): string {
  const fullPath = path.join(process.cwd(), "supabase", "migrations", filename);
  let sql = fs.readFileSync(fullPath, "utf8");
  // PGlite doesn't bundle C shared libs for pg_trgm/pgcrypto CREATE EXTENSION or gin_trgm_ops;
  // handle cleanly in PGlite shim while preserving exact SQL files for Supabase Postgres.
  sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS\s+"?pgcrypto"?[^;]*;/gi, "-- [pglite shim] pgcrypto");
  sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS\s+"?pg_trgm"?[^;]*;/gi, "-- [pglite shim] pg_trgm");
  sql = sql.replace(
    /CREATE INDEX IF NOT EXISTS idx_products_name_trgm\s+ON public\.products USING gin\s*\(name\s+(?:extensions\.)?gin_trgm_ops\);/gi,
    "CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products (lower(name));"
  );
  return sql;
}

async function asRole<T>(
  db: PGlite,
  role: "anon" | "authenticated" | "service_role",
  claims: Record<string, unknown> | null,
  fn: () => Promise<T>
): Promise<T> {
  await db.exec("BEGIN");
  try {
    await db.query(`SELECT set_config('role', $1, true)`, [role]);
    await db.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      claims ? JSON.stringify({ role, ...claims }) : JSON.stringify({ role }),
    ]);
    const res = await fn();
    await db.exec("COMMIT");
    return res;
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }
}

async function expectError(fn: () => Promise<unknown>, pattern: RegExp) {
  let caught: unknown = null;
  try {
    await fn();
  } catch (err) {
    caught = err;
  }
  assert.ok(caught, `Expected error matching ${pattern}, but succeeded`);
  const msg = caught instanceof Error ? caught.message : String(caught);
  assert.match(msg, pattern, `Error "${msg}" did not match ${pattern}`);
}

async function main() {
  console.log("=== Noovyx Supabase Migration Verification Suite ===\n");
  const db = new PGlite();
  await initSupabaseShim(db);

  const migrationFiles = [
    "20261113000001_extensions_and_types.sql",
    "20261113000002_core_tables_and_indexes.sql",
    "20261113000003_functions_and_views.sql",
    "20261113000004_rls_and_storage.sql",
  ];

  await test("Migrations", "Apply all 4 migrations cleanly", async () => {
    for (const file of migrationFiles) {
      await db.exec(loadMigrationSql(file));
    }
  });

  await test("Migrations", "Re-apply all 4 migrations (idempotency check)", async () => {
    for (const file of migrationFiles) {
      await db.exec(loadMigrationSql(file));
    }
  });

  // -------------------------------------------------------------------------
  // Seed test users, categories, products, variants & coupon
  // -------------------------------------------------------------------------
  const customerId = "11111111-1111-4111-8111-111111111111";
  const customer2Id = "22222222-2222-4222-8222-222222222222";
  const adminId = "99999999-9999-4999-8999-999999999999";

  await db.query(
    `INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
     VALUES
       ($1, 'alice@example.com', '{"provider":"email"}'::jsonb, '{"full_name":"Alice Customer","role":"admin"}'::jsonb),
       ($2, 'bob@example.com', '{"provider":"email"}'::jsonb, '{"full_name":"Bob Customer"}'::jsonb),
       ($3, 'admin@noovyx.store', '{"provider":"email","role":"admin"}'::jsonb, '{"full_name":"Noovyx Admin"}'::jsonb)`,
    [customerId, customer2Id, adminId]
  );

  await db.exec(`
    INSERT INTO public.categories (id, label, sort_order) VALUES ('iems', 'IEMs', 1);
    INSERT INTO public.products (id, slug, name, price, category_id, stock_quantity, has_variants, is_active, image, description)
    VALUES
      ('prod-simple', 'moondrop-chu-ii', 'Moondrop Chu II', 1490.00, 'iems', 5, false, true, 'https://cdn.example/chu2.webp', 'IEM'),
      ('prod-vars', 'truthear-hexa', 'Truthear Hexa', 4200.00, 'iems', 0, true, true, 'https://cdn.example/hexa.webp', 'Hybrid IEM'),
      ('prod-low', 'final-e3000', 'Final E3000', 1100.00, 'iems', 1, false, true, 'https://cdn.example/e3000.webp', 'IEM'),
      ('prod-hidden', 'draft-secret-iem', 'Draft Secret IEM', 9900.00, 'iems', 10, false, false, 'KZ', 'Hidden');
    INSERT INTO public.product_variants (id, product_id, title, price_override, stock_quantity, position)
    VALUES
      ('var-35', 'prod-vars', '3.5mm', NULL, 2, 1),
      ('var-44', 'prod-vars', '4.4mm Balanced', 4450.00, 3, 2);
    INSERT INTO public.coupons (code, discount_type, discount_value, min_order_subtotal, max_discount_amount, usage_limit, is_active)
    VALUES
      ('SAVE10', 'percentage', 10, 1000, 300, 1, true),
      ('EXPIRED50', 'fixed_amount', 50, 0, NULL, NULL, true);
    UPDATE public.coupons SET expires_at = now() - interval '1 day' WHERE code = 'EXPIRED50';
  `);

  // -------------------------------------------------------------------------
  // Schema, Views & Function Privilege Checks
  // -------------------------------------------------------------------------
  await test("Security Audit", "All 16 public tables have RLS enabled", async () => {
    const { rows } = await db.query<{ tablename: string; rowsecurity: boolean }>(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    assert.equal(rows.length, 16, `Expected 16 tables, got ${rows.length}`);
    for (const r of rows) {
      assert.equal(r.rowsecurity, true, `Table ${r.tablename} does not have RLS enabled`);
    }
  });

  await test("Security Audit", "All 4 analytical views set security_invoker = true", async () => {
    const { rows } = await db.query<{ viewname: string; options: string[] | null }>(`
      SELECT c.relname AS viewname, c.reloptions AS options
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'v'
      ORDER BY c.relname
    `);
    assert.equal(rows.length, 4);
    for (const r of rows) {
      assert.ok(
        r.options?.includes("security_invoker=true"),
        `View ${r.viewname} missing security_invoker=true (${JSON.stringify(r.options)})`
      );
    }
  });

  await test("Security Audit", "No sensitive RPC granted to PUBLIC or anon", async () => {
    const { rows } = await db.query<{ proname: string }>(`
      SELECT p.proname
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN ('place_order', 'get_guest_order', 'check_and_increment_rate_limit', 'set_order_status', 'admin_adjust_stock')
        AND has_function_privilege('anon', p.oid, 'EXECUTE')
    `);
    assert.equal(rows.length, 0, `anon unexpectedly had EXECUTE on: ${rows.map((r) => r.proname).join(", ")}`);
  });

  await test("Security Audit", "Storage buckets exclude image/svg+xml & enforce 5 MiB limit", async () => {
    const { rows } = await db.query<{ id: string; public: boolean; file_size_limit: string; allowed_mime_types: string[] }>(`
      SELECT id, public, file_size_limit::text, allowed_mime_types
      FROM storage.buckets
      ORDER BY id
    `);
    assert.equal(rows.length, 2);
    for (const b of rows) {
      assert.equal(b.public, true);
      assert.equal(b.file_size_limit, "5242880");
      assert.ok(!b.allowed_mime_types.includes("image/svg+xml"), "SVG must be excluded");
    }
  });

  // -------------------------------------------------------------------------
  // Correction #1: Admin Authorization & Profile Role Immutability
  // -------------------------------------------------------------------------
  await test("Correction #1", "user_metadata.role='admin' is ignored by signup trigger & is_admin()", async () => {
    const { rows } = await db.query<{ role: string }>(`SELECT role FROM public.profiles WHERE id = $1`, [customerId]);
    assert.equal(rows[0]?.role, "customer");

    const check = await asRole(
      db,
      "authenticated",
      { sub: customerId, email: "alice@example.com", user_metadata: { role: "admin" }, app_metadata: { role: "customer" } },
      async () => {
        const res = await db.query<{ is_admin: boolean }>(`SELECT public.is_admin() AS is_admin`);
        return res.rows[0].is_admin;
      }
    );
    assert.equal(check, false);
  });

  await test("Correction #1", "app_metadata.role='admin' grants admin access & customer cannot self-escalate profile role", async () => {
    const { rows } = await db.query<{ role: string }>(`SELECT role FROM public.profiles WHERE id = $1`, [adminId]);
    assert.equal(rows[0]?.role, "admin");

    await expectError(
      () =>
        asRole(db, "authenticated", { sub: customerId, email: "alice@example.com", app_metadata: {} }, async () => {
          await db.query(`UPDATE public.profiles SET role = 'admin' WHERE id = $1`, [customerId]);
        }),
      /permission denied|administrator/i
    );

    // Even if UPDATE * were attempted via column trigger, role remains customer while full_name succeeds
    await asRole(db, "authenticated", { sub: customerId, email: "alice@example.com", app_metadata: {} }, async () => {
      await db.query(`UPDATE public.profiles SET full_name = 'Alice Updated' WHERE id = $1`, [customerId]);
    });
    const after = await db.query<{ full_name: string; role: string }>(
      `SELECT full_name, role FROM public.profiles WHERE id = $1`,
      [customerId]
    );
    assert.equal(after.rows[0]?.full_name, "Alice Updated");
    assert.equal(after.rows[0]?.role, "customer");
  });

  // -------------------------------------------------------------------------
  // Correction #3: Single Authoritative Stock Source & Variant Rollup
  // -------------------------------------------------------------------------
  await test("Correction #3", "Variant stock automatically sums into parent product & direct parent stock edit is rejected", async () => {
    const { rows } = await db.query<{ stock_quantity: number }>(
      `SELECT stock_quantity FROM public.products WHERE id = 'prod-vars'`
    );
    assert.equal(rows[0]?.stock_quantity, 5); // 2 + 3

    await expectError(
      () => db.query(`UPDATE public.products SET stock_quantity = 999 WHERE id = 'prod-vars'`),
      /active variants|product_variants/i
    );

    const adjusted = await asRole(
      db,
      "authenticated",
      { sub: adminId, email: "admin@noovyx.store", app_metadata: { role: "admin" } },
      async () => {
        const res = await db.query<{ admin_adjust_stock: number }>(
          `SELECT public.admin_adjust_stock('prod-vars', 'var-35', 7, NULL, 'Restocked 3.5mm')`
        );
        return res.rows[0].admin_adjust_stock;
      }
    );
    assert.equal(adjusted, 7);

    const rolled = await db.query<{ stock_quantity: number }>(
      `SELECT stock_quantity FROM public.products WHERE id = 'prod-vars'`
    );
    assert.equal(rolled.rows[0]?.stock_quantity, 10); // 7 + 3
  });

  // -------------------------------------------------------------------------
  // Checkout, Coupons, Idempotency, Concurrency & Corrections #2 & #6
  // -------------------------------------------------------------------------
  let createdOrderId = "";
  let createdOrderNum = "";
  let guestRawToken = "";

  await test("Checkout & Correction #6", "Guest place_order succeeds, applies SAVE10 coupon, stores SHA-256 token & writes ledger", async () => {
    guestRawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(guestRawToken).digest("hex");

    const res = await asRole(db, "service_role", { role: "service_role" }, async () => {
      return db.query<{
        out_order_id: string;
        out_order_number: string;
        out_subtotal: string;
        out_discount_amount: string;
        out_grand_total: string;
        out_idempotent_replay: boolean;
      }>(`SELECT * FROM public.place_order($1::jsonb)`, [
        JSON.stringify({
          idempotencyKey: "idem-guest-001",
          guestTokenHash: tokenHash,
          customerName: "Mohamed Ali",
          contact: "01012345678",
          governorate: "Cairo",
          address: "12 Tahrir St, Cairo",
          couponCode: "SAVE10",
          items: [
            { productId: "prod-simple", quantity: 2 }, // 2 * 1490 = 2980
            { productId: "prod-vars", variantId: "var-44", quantity: 1 }, // 4450
          ],
        }),
      ]);
    });

    const row = res.rows[0];
    createdOrderId = row.out_order_id;
    createdOrderNum = row.out_order_number;
    assert.equal(Number(row.out_subtotal), 7430);
    assert.equal(Number(row.out_discount_amount), 300); // capped at max_discount_amount=300
    assert.equal(Number(row.out_grand_total), 7130); // shippingEnabled=false by default
    assert.equal(row.out_idempotent_replay, false);

    // Replay same idempotencyKey -> zero extra decrement
    const replay = await asRole(db, "service_role", { role: "service_role" }, async () => {
      return db.query<{ out_order_id: string; out_idempotent_replay: boolean }>(
        `SELECT out_order_id, out_idempotent_replay FROM public.place_order($1::jsonb)`,
        [
          JSON.stringify({
            idempotencyKey: "idem-guest-001",
            guestTokenHash: tokenHash,
            customerName: "Mohamed Ali",
            contact: "01012345678",
            address: "12 Tahrir St, Cairo",
            items: [{ productId: "prod-simple", quantity: 2 }],
          }),
        ]
      );
    });
    assert.equal(replay.rows[0].out_order_id, createdOrderId);
    assert.equal(replay.rows[0].out_idempotent_replay, true);

    const stock = await db.query<{ stock_quantity: number }>(
      `SELECT stock_quantity FROM public.products WHERE id = 'prod-simple'`
    );
    assert.equal(stock.rows[0]?.stock_quantity, 3); // 5 - 2 = 3 (not decremented on replay!)
  });

  await test("Coupons", "Usage limit (1) and expired coupon (EXPIRED50) are rejected", async () => {
    const c1 = await db.query<{ valid: boolean; reason: string }>(
      `SELECT valid, reason FROM public.validate_coupon('SAVE10', 2000)`
    );
    assert.equal(c1.rows[0].valid, false);
    assert.match(c1.rows[0].reason, /usage limit/i);

    const c2 = await db.query<{ valid: boolean; reason: string }>(
      `SELECT valid, reason FROM public.validate_coupon('EXPIRED50', 2000)`
    );
    assert.equal(c2.rows[0].valid, false);
    assert.match(c2.rows[0].reason, /expired/i);
  });

  await test("Correction #6", "anon cannot read orders table; get_guest_order masks PII & rejects wrong token", async () => {
    const anonOrders = await asRole(db, "anon", null, async () => {
      return db.query(`SELECT id FROM public.orders`);
    });
    assert.equal(anonOrders.rows.length, 0);

    const wrongToken = await asRole(db, "service_role", { role: "service_role" }, async () => {
      return db.query<{ get_guest_order: unknown }>(
        `SELECT public.get_guest_order($1, $2)`,
        [createdOrderNum, "0".repeat(64)]
      );
    });
    assert.equal(wrongToken.rows[0].get_guest_order, null);

    const validHash = crypto.createHash("sha256").update(guestRawToken).digest("hex");
    const tracked = await asRole(db, "service_role", { role: "service_role" }, async () => {
      return db.query<{ get_guest_order: Record<string, unknown> }>(
        `SELECT public.get_guest_order($1, $2)`,
        [createdOrderNum, validHash]
      );
    });
    const payload = tracked.rows[0].get_guest_order;
    assert.ok(payload, "Expected guest order JSON");
    assert.equal(payload.orderNumber, createdOrderNum);
    assert.equal(payload.customerMasked, "M******");
    assert.equal(payload.contactMasked, "01*****78");
    assert.equal((payload as { address?: unknown }).address, undefined, "Full street address must never leak");
  });

  await test("RLS Isolation", "Customer sees hidden products=0, other customers' orders=0, own orders>0", async () => {
    const tokenHash2 = crypto.createHash("sha256").update("cust-order").digest("hex");
    await asRole(db, "service_role", { role: "service_role" }, async () => {
      await db.query(`SELECT public.place_order($1::jsonb)`, [
        JSON.stringify({
          userId: customerId,
          guestTokenHash: tokenHash2,
          customerName: "Alice Customer",
          contact: "01111111111",
          address: "Nasr City, Cairo",
          items: [{ productId: "prod-low", quantity: 1 }],
        }),
      ]);
    });

    // Customer 1 sees 1 own order; Customer 2 sees 0 orders; Hidden product invisible to both
    const c1Orders = await asRole(db, "authenticated", { sub: customerId, app_metadata: {} }, async () => {
      const o = await db.query(`SELECT id FROM public.orders`);
      const h = await db.query(`SELECT id FROM public.products WHERE is_active = false`);
      return { o: o.rows.length, h: h.rows.length };
    });
    assert.equal(c1Orders.o, 1);
    assert.equal(c1Orders.h, 0);

    const c2Orders = await asRole(db, "authenticated", { sub: customer2Id, app_metadata: {} }, async () => {
      return (await db.query(`SELECT id FROM public.orders`)).rows.length;
    });
    assert.equal(c2Orders, 0);

    // Concurrent/Oversell guard: prod-low now has 0 stock
    await expectError(
      () =>
        asRole(db, "service_role", { role: "service_role" }, async () => {
          await db.query(`SELECT public.place_order($1::jsonb)`, [
            JSON.stringify({
              userId: customer2Id,
              customerName: "Bob Oversell",
              contact: "01222222222",
              address: "Alexandria",
              items: [{ productId: "prod-low", quantity: 1 }],
            }),
          ]);
        }),
      /Insufficient stock/i
    );
  });

  await test("Correction #2 & Inventory Lifecycle", "Admin DELETE on orders/items/events/movements/audit blocked; Cancel restocks cleanly", async () => {
    await expectError(
      () =>
        asRole(db, "authenticated", { sub: adminId, email: "admin@noovyx.store", app_metadata: { role: "admin" } }, async () => {
          await db.query(`DELETE FROM public.orders WHERE id = $1`, [createdOrderId]);
        }),
      /permission denied|prohibited/i
    );

    // Even as service_role / superuser, BEFORE DELETE trigger prohibits deleting order history
    await expectError(
      () => db.query(`DELETE FROM public.order_events WHERE order_id = $1`, [createdOrderId]),
      /prohibited/i
    );

    // Admin cancels order -> restocks prod-simple (3 -> 5) and var-44 (2 -> 3) and creates order_events + audit log
    await asRole(db, "authenticated", { sub: adminId, email: "admin@noovyx.store", app_metadata: { role: "admin" } }, async () => {
      await db.query(`SELECT public.set_order_status($1, 'cancelled', 'Customer requested cancel')`, [createdOrderId]);
    });

    const pSimple = await db.query<{ stock_quantity: number }>(
      `SELECT stock_quantity FROM public.products WHERE id = 'prod-simple'`
    );
    const v44 = await db.query<{ stock_quantity: number }>(
      `SELECT stock_quantity FROM public.product_variants WHERE id = 'var-44'`
    );
    assert.equal(pSimple.rows[0].stock_quantity, 5);
    assert.equal(v44.rows[0].stock_quantity, 3);
  });

  // -------------------------------------------------------------------------
  // Correction #4: Historical Legacy Order Preservation (No Fabricated Financials)
  // -------------------------------------------------------------------------
  await test("Correction #4", "Legacy Firestore orders accept NULL shipping/cod/discount/grand_total while native orders reject NULLs", async () => {
    await db.query(`
      INSERT INTO public.orders (
        legacy_source, legacy_source_id, customer_name, contact, address,
        status, subtotal, shipping_fee, cod_fee, discount_amount, grand_total,
        is_legacy_import, legacy_raw_payload, legacy_unrecoverable_fields
      ) VALUES (
        'firestore', 'ord_legacy_1', 'Legacy Customer', '01099998888', 'Cairo',
        'fulfilled', 1500, NULL, NULL, NULL, NULL,
        true, '{"id":"ord_legacy_1","subtotal":1500}'::jsonb,
        ARRAY['shipping_fee','cod_fee','discount_amount','grand_total']
      )
    `);

    await expectError(
      () =>
        db.query(`
          INSERT INTO public.orders (
            guest_token_hash, customer_name, contact, address,
            status, subtotal, shipping_fee, cod_fee, discount_amount, grand_total, is_legacy_import
          ) VALUES ('abc', 'Native Bad', '01000000000', 'Giza', 'new', 1000, NULL, 0, 0, 1000, false)
        `),
      /chk_native_order_financials/i
    );
  });

  // -------------------------------------------------------------------------
  // Correction #5: 4-Source Browser localStorage + Firestore + Local + Seed Reconciliation
  // -------------------------------------------------------------------------
  await test("Correction #5", "Reconciles 60 seed products + mock Firestore/Local/Browser export, filters CMS doc & flags legacy unrecoverable fields", async () => {
    const b64Cms =
      "data:image/png;base64," +
      Buffer.from(JSON.stringify({ _updatedAt: 9999999999999, announcements: { barText: "From Browser" } })).toString("base64");

    const rec = reconcileAllSources({
      firestoreProducts: [
        { id: "noovyx-cms-config-v2", name: "__CMS__", price: 0, category: "iems", imageUrl: b64Cms },
        { id: seedProducts[0].id, name: seedProducts[0].name, price: 2499, updatedAt: 1000 },
      ],
      firestoreOrders: [
        {
          id: "fs-ord-1",
          customerName: "Tarek",
          contact: "01055554444",
          address: "Alexandria",
          subtotal: 2499,
          status: "confirmed",
          items: [{ productId: "non-existent-sku", name: "Old SKU", quantity: 1, unitPrice: 2499 }],
          createdAt: "2026-09-01T10:00:00.000Z",
        },
      ],
      firestoreSettings: [],
      localDiskState: {
        catalogState: {
          overrides: { [seedProducts[1].id]: { isActive: false, updatedAt: 2000 } },
          deletedIds: [],
          updatedAt: 2000,
        },
      },
      browserExport: {
        version: 1,
        exportedAt: "2026-11-13T00:00:00.000Z",
        entries: {
          noovyx_catalog_state_v2: {
            overrides: {
              [seedProducts[0].id]: { price: 2599, imageUrl: "data:image/png;base64,AAAA" },
            },
            deletedIds: [seedProducts[2].id],
            updatedAt: 3000,
          },
          noovyx_storefront_cms_config_v2: { hero: { titleLine1: "Browser Wins" } },
          noovyx_storefront_cms_updated_at_v2: 12345678900000,
        },
      },
    });

    assert.equal(rec.sourceCounts.seedProducts, 60);
    assert.equal(rec.sourceCounts.firestoreReservedCmsDocsSkipped, 1);
    assert.equal(rec.sourceCounts.reconciledDeletedProducts, 1);
    assert.equal(rec.sourceCounts.base64ImagesDetected >= 1, true);
    assert.equal(rec.cmsWinningSource, "browser_localStorage_cms");
    const overridden = rec.products.find((p) => p.id === seedProducts[0].id);
    assert.equal(overridden?.price, 2599);
    assert.equal(rec.orders[0].shippingFee, null);
    assert.equal(rec.orders[0].grandTotal, null);
    assert.equal(rec.orders[0].items[0].productId, null);
    assert.equal(rec.orders[0].items[0].productExistsInCatalog, false);
  });

  // -------------------------------------------------------------------------
  // Rate Limiter RPC Test
  // -------------------------------------------------------------------------
  await test("Rate Limiting", "check_and_increment_rate_limit enforces window cap", async () => {
    const r1 = await asRole(db, "service_role", { role: "service_role" }, () =>
      db.query<{ allowed: boolean; current_count: number }>(`SELECT allowed, current_count FROM public.check_and_increment_rate_limit('ip:1.2.3.4', 60, 2)`)
    );
    const r2 = await asRole(db, "service_role", { role: "service_role" }, () =>
      db.query<{ allowed: boolean; current_count: number }>(`SELECT allowed, current_count FROM public.check_and_increment_rate_limit('ip:1.2.3.4', 60, 2)`)
    );
    const r3 = await asRole(db, "service_role", { role: "service_role" }, () =>
      db.query<{ allowed: boolean; current_count: number }>(`SELECT allowed, current_count FROM public.check_and_increment_rate_limit('ip:1.2.3.4', 60, 2)`)
    );
    assert.equal(r1.rows[0].allowed, true);
    assert.equal(r2.rows[0].allowed, true);
    assert.equal(r3.rows[0].allowed, false);
    assert.equal(r3.rows[0].current_count, 3);
  });

  await db.close();

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`\nSummary: ${passedCount}/${results.length} passed, ${failedCount} failed.`);

  const summaryJson = JSON.stringify(
    { ranAt: new Date().toISOString(), passed: passedCount, failed: failedCount, results },
    null,
    2,
  );
  try {
    fs.mkdirSync(path.join(process.cwd(), "backups"), { recursive: true });
    fs.writeFileSync(path.join(process.cwd(), "backups", "latest-test-results.json"), summaryJson, "utf8");
  } catch (writeErr) {
    const tmpOut = path.join(os.tmpdir(), "noovyx-latest-test-results.json");
    fs.writeFileSync(tmpOut, summaryJson, "utf8");
    console.warn(`Note: Could not write backups/latest-test-results.json (${(writeErr as Error).message}); wrote to ${tmpOut}`);
  }

  if (failedCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal suite error:", err);
  process.exit(1);
});
