/**
 * Usage:
 *   pnpm db:migrate   -> applies database/schema.sql to DATABASE_URL
 *   pnpm db:seed      -> loads categories, products, images, default CMS config
 *   pnpm db:test      -> runs everything on an in-memory Postgres (PGlite) and checks the logic
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { products, PRODUCT_CATEGORIES } from "../products";
import { DEFAULT_STOREFRONT_CONFIG } from "../storefrontConfig";

type Q = (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const schemaSql = () => readFileSync(join(__dirname, "schema.sql"), "utf8");

export async function seed(q: Q) {
  for (const [i, label] of PRODUCT_CATEGORIES.entries()) {
    await q(
      `insert into categories(id,label,sort_order) values ($1,$2,$3)
       on conflict (id) do update set label = excluded.label, sort_order = excluded.sort_order`,
      [slug(label), label, i],
    );
  }
  for (const [i, p] of products.entries()) {
    await q(
      `insert into products(id,slug,name,category_id,price,badge,description,specs,stock_quantity,
                            low_stock_threshold,is_active,featured,sort_order)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (id) do nothing`,
      [p.id, p.slug, p.name, slug(p.category), p.price, p.image, p.description, p.specs,
       p.stockQuantity, p.lowStockThreshold, p.isActive, p.featured, i],
    );
    const urls = p.imageUrls?.length ? p.imageUrls : [p.imageUrl];
    for (const [pos, url] of urls.entries()) {
      await q(
        `insert into product_images(product_id,url,position) values ($1,$2,$3)
         on conflict (product_id, position) do nothing`,
        [p.id, url, pos],
      );
    }
  }
  await q(
    `insert into storefront_config(id,config) values (1,$1::jsonb) on conflict (id) do nothing`,
    [JSON.stringify(DEFAULT_STOREFRONT_CONFIG)],
  );
}

async function selfTest() {
  const { PGlite } = await import("@electric-sql/pglite");
  const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm");
  const db = new PGlite({ extensions: { pg_trgm } });
  const q: Q = (sql, params) => db.query(sql, params as any[]) as any;
  const ok = (c: boolean, m: string) => { if (!c) throw new Error("FAIL: " + m); console.log("ok  -", m); };

  await db.exec(schemaSql());
  await db.exec(schemaSql());                 // idempotency
  ok(true, "schema applies twice (idempotent)");
  await seed(q); await seed(q);
  const n = (await q("select count(*)::int c from products")).rows[0].c;
  ok(n === products.length, `seeded ${n} products`);

  await q("update products set is_active = true, stock_quantity = 5 where id = $1", [products[0].id]);
  const pid = products[0].id;
  const r = (await q("select * from place_order($1::jsonb)", [JSON.stringify({
    customerName: "Test", contact: "01000000000", address: "Cairo, Egypt", notes: "",
    items: [{ productId: pid, quantity: 2 }] })])).rows[0];
  ok(Number(r.out_subtotal) === products[0].price * 2, "order priced by DB, order# " + r.out_order_number);
  ok((await q("select stock_quantity s from products where id=$1", [pid])).rows[0].s === 3, "stock decremented");

  let blocked = false;
  try { await q("select * from place_order($1::jsonb)", [JSON.stringify({
    customerName: "T", contact: "0100", address: "Cairo",
    items: [{ productId: pid, quantity: 99 }] })]); } catch { blocked = true; }
  ok(blocked, "overselling rejected");
  ok((await q("select count(*)::int c from orders")).rows[0].c === 1, "failed order rolled back (no orphan)");

  await q("select set_order_status($1, 'cancelled', 'uid123')", [r.out_order_id]);
  ok((await q("select stock_quantity s from products where id=$1", [pid])).rows[0].s === 5, "cancel restocks");
  ok((await q("select count(*)::int c from order_events where order_id=$1", [r.out_order_id])).rows[0].c === 2, "status timeline logged");

  await q("update storefront_config set config = jsonb_set(config,'{hero,enabled}','false'), updated_by='uid123'");
  const cfg = (await q("select version from storefront_config")).rows[0];
  ok(cfg.version === 2 && (await q("select count(*)::int c from storefront_config_revisions")).rows[0].c === 1,
     "CMS revision saved on edit");
  await q("select * from v_low_stock"); await q("select * from v_order_stats"); await q("select * from v_top_products");
  ok(true, "dashboard views work");
  console.log("\nALL CHECKS PASSED");
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === "test") return selfTest();
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : false });
  const q: Q = (s, p) => pool.query(s, p as any[]);
  if (cmd === "migrate") await pool.query(schemaSql());
  else if (cmd === "seed") await seed(q);
  else console.log("usage: migrate | seed | test");
  await pool.end();
}
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });