# Self-hosted database (PostgreSQL in Docker, no third-party services)

Firebase stays for admin login only. All shop data lives in your own Postgres.

## Run
1. Add to `.env.local` (and a `.env` next to docker-compose.yml with the same `DB_PASSWORD`):
   ```
   DB_PASSWORD=<long random password>
   DATABASE_URL=postgres://noovyx:<same password>@127.0.0.1:5432/noovyx
   ```
2. `docker compose up -d` creates the database and applies `schema.sql` automatically on first start.
3. `pnpm db:seed` loads products, categories and the default homepage config.
4. `pnpm db:test` runs all logic checks on a throwaway in-memory Postgres.
Later schema changes: `pnpm db:migrate` (the schema is idempotent).

## Cost and hosting
Free on your own PC or server. A small VPS (1 GB RAM) is plenty if you want 24/7. The app and DB can share the machine.

## Safety
- Port is bound to `127.0.0.1`: only the Next.js server on the same machine can reach it. Do not publish 5432.
- `backup` container writes `backups/noovyx-YYYY-MM-DD.sql.gz` nightly and keeps 14 days. Copy that folder off-machine (external disk) regularly.
- Restore: `gunzip -c backups/FILE.sql.gz | docker exec -i noovyx-db psql -U noovyx noovyx`
- Data is in the `pgdata` Docker volume; `docker compose down` keeps it, `down -v` DELETES it.

## Mapping to admin tabs
| Admin tab | Tables / functions |
|---|---|
| Homepage | `storefront_config` (+ `_revisions` rollback, last 30) |
| Catalog / Quick-add / Bulk | `products`, `product_images`, `categories`, `v_low_stock` |
| Orders | `orders`, `order_items`, `order_events`, `set_order_status()`, `v_order_stats`, `v_top_products` |
| Checkout (public) | `place_order()` (server-priced, locks stock) |
| Audit | `admin_audit_log` (Firebase UID) |

## API rule
The browser never touches the DB; Next.js route handlers do. Admin routes first verify the Firebase ID token and `admin` claim (`adminGate.ts`); public routes only read and call `place_order()`.