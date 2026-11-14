-- =============================================================================
-- Migration 002: Relational Tables, Constraints, Indexes & Immutability Guards
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PROFILES (Linked 1:1 to auth.users; role cannot be modified by customers)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               text,
  full_name           text,
  phone               text,
  default_governorate text,
  default_address     text,
  role                text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role  ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email) WHERE email IS NOT NULL;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Defense-in-depth: block non-service callers from changing profiles.role even if GRANTs change
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_setting('role', true) IN ('anon', 'authenticated') THEN
      RAISE EXCEPTION 'Insufficient privilege: profile role is immutable and managed exclusively via server admin metadata'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_role() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_profiles_protect_role ON public.profiles;
CREATE TRIGGER trg_profiles_protect_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- Column-level privileges: authenticated users can never UPDATE the role column
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, email, full_name, phone, default_governorate, default_address, role, created_at, updated_at)
  ON public.profiles TO authenticated;
GRANT UPDATE (email, full_name, phone, default_governorate, default_address)
  ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- -----------------------------------------------------------------------------
-- 2. CATEGORIES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id         text PRIMARY KEY,
  label      text NOT NULL UNIQUE,
  blurb      text NOT NULL DEFAULT '',
  image      text NOT NULL DEFAULT '',
  sort_order int  NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_sort ON public.categories(sort_order) WHERE is_visible = true;

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. PRODUCTS, PRODUCT IMAGES & PRODUCT VARIANTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id                          text PRIMARY KEY,
  slug                        text NOT NULL UNIQUE,
  name                        text NOT NULL CHECK (char_length(trim(name)) > 0),
  category_id                 text NOT NULL REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  price                       numeric(12, 2) NOT NULL CHECK (price >= 0),
  compare_at_price            numeric(12, 2) CHECK (compare_at_price IS NULL OR compare_at_price >= price),
  image                       text NOT NULL DEFAULT 'KZ',
  description                 text NOT NULL DEFAULT '',
  specs                       text[] NOT NULL DEFAULT '{}',
  has_variants                boolean NOT NULL DEFAULT false,
  stock_quantity              int  NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold         int  NOT NULL DEFAULT 3 CHECK (low_stock_threshold >= 0),
  in_stock                    boolean GENERATED ALWAYS AS (stock_quantity > 0) STORED,
  is_active                   boolean NOT NULL DEFAULT true,
  is_archived                 boolean NOT NULL DEFAULT false,
  featured                    boolean NOT NULL DEFAULT false,
  sort_order                  int  NOT NULL DEFAULT 0,
  legacy_source               text,
  legacy_unrecoverable_fields text[] NOT NULL DEFAULT '{}',
  search_vector               tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(category_id, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) STORED,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category_active ON public.products(category_id, sort_order) WHERE is_active = true AND is_archived = false;
CREATE INDEX IF NOT EXISTS idx_products_featured_active ON public.products(sort_order) WHERE is_active = true AND is_archived = false AND featured = true;
CREATE INDEX IF NOT EXISTS idx_products_price           ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm       ON public.products USING gin(name extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_search_vector   ON public.products USING gin(search_vector);

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.product_images (
  id           bigserial PRIMARY KEY,
  product_id   text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE ON UPDATE CASCADE,
  url          text NOT NULL CHECK (char_length(trim(url)) > 0),
  storage_path text,
  alt_text     text,
  position     int  NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, position)
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id, position);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id             text PRIMARY KEY,
  product_id     text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE ON UPDATE CASCADE,
  sku            text UNIQUE,
  title          text NOT NULL CHECK (char_length(trim(title)) > 0),
  options        jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_override numeric(12, 2) CHECK (price_override IS NULL OR price_override >= 0),
  stock_quantity int  NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  in_stock       boolean GENERATED ALWAYS AS (stock_quantity > 0) STORED,
  is_active      boolean NOT NULL DEFAULT true,
  position       int  NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id, position) WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. SINGLE AUTHORITATIVE STOCK SOURCE TRIGGERS & STOCK MOVEMENTS LEDGER
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id              bigserial PRIMARY KEY,
  product_id      text NOT NULL REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  variant_id      text REFERENCES public.product_variants(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  quantity_delta  int  NOT NULL CHECK (quantity_delta <> 0),
  balance_after   int  NOT NULL CHECK (balance_after >= 0),
  movement_type   public.stock_movement_type NOT NULL,
  reference_type  text,
  reference_id    text,
  actor_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label     text,
  note            text,
  idempotency_key text UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON public.stock_movements(variant_id, created_at DESC) WHERE variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref     ON public.stock_movements(reference_type, reference_id);

-- Keeps products.has_variants and products.stock_quantity synchronized when variants change
CREATE OR REPLACE FUNCTION public.sync_product_stock_from_variants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pid text;
  v_sum int;
  v_cnt int;
BEGIN
  v_pid := COALESCE(NEW.product_id, OLD.product_id);

  SELECT
    count(*)::int,
    COALESCE(sum(CASE WHEN is_active THEN stock_quantity ELSE 0 END), 0)::int
  INTO v_cnt, v_sum
  FROM public.product_variants
  WHERE product_id = v_pid;

  PERFORM set_config('app.variant_sync_active', 'true', true);
  UPDATE public.products
     SET has_variants = (v_cnt > 0),
         stock_quantity = CASE WHEN v_cnt > 0 THEN v_sum ELSE stock_quantity END
   WHERE id = v_pid;
  PERFORM set_config('app.variant_sync_active', 'false', true);

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_product_stock_from_variants() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_variant_stock ON public.product_variants;
CREATE TRIGGER trg_sync_variant_stock
  AFTER INSERT OR UPDATE OF stock_quantity, is_active OR DELETE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_stock_from_variants();

-- Guards parent products.stock_quantity so variant-backed products never accept stale direct stock edits
CREATE OR REPLACE FUNCTION public.guard_product_stock_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity THEN
    IF NEW.has_variants AND COALESCE(current_setting('app.variant_sync_active', true), 'false') <> 'true' THEN
      RAISE EXCEPTION 'Product "%" has active variants; adjust stock on product_variants instead of products directly', NEW.id
        USING ERRCODE = '22000';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_product_stock_authority() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_product_stock_authority ON public.products;
CREATE TRIGGER trg_guard_product_stock_authority
  BEFORE UPDATE OF stock_quantity ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.guard_product_stock_authority();

-- -----------------------------------------------------------------------------
-- 5. PERSISTENT SHOPPING CARTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.carts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carts_session ON public.carts(session_id) WHERE session_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_carts_updated_at ON public.carts;
CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.cart_items (
  id         bigserial PRIMARY KEY,
  cart_id    uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE ON UPDATE CASCADE,
  variant_id text REFERENCES public.product_variants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  quantity   int  NOT NULL CHECK (quantity > 0 AND quantity <= 99),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (cart_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart    ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON public.cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant ON public.cart_items(variant_id) WHERE variant_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER trg_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. COUPONS & DISCOUNTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text NOT NULL UNIQUE CHECK (code = upper(trim(code))),
  description         text,
  discount_type       public.discount_type NOT NULL,
  discount_value      numeric(12, 2) NOT NULL CHECK (discount_value > 0),
  min_order_subtotal  numeric(12, 2) NOT NULL DEFAULT 0 CHECK (min_order_subtotal >= 0),
  max_discount_amount numeric(12, 2) CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
  usage_limit         int CHECK (usage_limit IS NULL OR usage_limit > 0),
  used_count          int NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  starts_at           timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_coupon_usage CHECK (usage_limit IS NULL OR used_count <= usage_limit)
);

CREATE INDEX IF NOT EXISTS idx_coupons_code_active ON public.coupons(code) WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_coupons_updated_at ON public.coupons;
CREATE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. ORDERS, ORDER ITEMS & ORDER EVENTS (Historical records immutable; NULLable legacy financials)
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1001;

CREATE TABLE IF NOT EXISTS public.orders (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number                text NOT NULL UNIQUE DEFAULT ('NX-' || nextval('public.order_number_seq')),
  user_id                     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  idempotency_key             text UNIQUE,
  guest_token_hash            text,
  customer_name               text NOT NULL CHECK (char_length(trim(customer_name)) BETWEEN 1 AND 120),
  contact                     text NOT NULL CHECK (char_length(trim(contact)) BETWEEN 3 AND 120),
  governorate                 text,
  address                     text NOT NULL CHECK (char_length(trim(address)) BETWEEN 3 AND 500),
  notes                       text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
  status                      public.order_status NOT NULL DEFAULT 'new',
  coupon_id                   uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  coupon_code                 text,
  subtotal                    numeric(12, 2) NOT NULL CHECK (subtotal >= 0),
  shipping_fee                numeric(12, 2) CHECK (shipping_fee IS NULL OR shipping_fee >= 0),
  cod_fee                     numeric(12, 2) CHECK (cod_fee IS NULL OR cod_fee >= 0),
  discount_amount             numeric(12, 2) CHECK (discount_amount IS NULL OR discount_amount >= 0),
  grand_total                 numeric(12, 2) CHECK (grand_total IS NULL OR grand_total >= 0),
  payment_method              public.payment_method_type NOT NULL DEFAULT 'cod',
  payment_status              public.payment_status_type NOT NULL DEFAULT 'unpaid',
  payment_provider_ref        text,
  is_legacy_import            boolean NOT NULL DEFAULT false,
  legacy_source               text,
  legacy_source_id            text UNIQUE,
  legacy_raw_payload          jsonb,
  legacy_unrecoverable_fields text[] NOT NULL DEFAULT '{}',
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  confirmed_at                timestamptz,
  fulfilled_at                timestamptz,
  cancelled_at                timestamptz,
  -- Native Supabase orders MUST populate every financial column & either user_id or guest_token_hash;
  -- Legacy Firestore imports keep missing financials NULL instead of fabricating values.
  CONSTRAINT chk_native_order_financials CHECK (
    is_legacy_import = true OR (
      shipping_fee IS NOT NULL AND
      cod_fee IS NOT NULL AND
      discount_amount IS NOT NULL AND
      grand_total IS NOT NULL AND
      (guest_token_hash IS NOT NULL OR user_id IS NOT NULL)
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id          ON public.orders(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status_created   ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at       ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_guest_lookup     ON public.orders(order_number, guest_token_hash) WHERE guest_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_coupon_id        ON public.orders(coupon_id) WHERE coupon_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.order_items (
  id            bigserial PRIMARY KEY,
  order_id      uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  product_id    text REFERENCES public.products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  variant_id    text REFERENCES public.product_variants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  name          text NOT NULL,
  variant_title text,
  unit_price    numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  quantity      int  NOT NULL CHECK (quantity > 0 AND quantity <= 99),
  line_total    numeric(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE INDEX IF NOT EXISTS idx_order_items_order   ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON public.order_items(variant_id) WHERE variant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.order_events (
  id          bigserial PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  from_status public.order_status,
  to_status   public.order_status NOT NULL,
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label text NOT NULL DEFAULT 'system',
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order ON public.order_events(order_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 8. STOREFRONT CMS CONFIG, REVISIONS, AUDIT LOG & PERSISTENT RATE LIMITS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storefront_config (
  id         smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config     jsonb NOT NULL DEFAULT '{}'::jsonb,
  version    int   NOT NULL DEFAULT 1,
  updated_by uuid  REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.storefront_config_revisions (
  id         bigserial PRIMARY KEY,
  version    int   NOT NULL,
  config     jsonb NOT NULL,
  updated_by uuid  REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storefront_revisions_created ON public.storefront_config_revisions(created_at DESC);

CREATE OR REPLACE FUNCTION public.storefront_config_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.storefront_config_revisions(version, config, updated_by)
  VALUES (OLD.version, OLD.config, OLD.updated_by);

  NEW.version    := OLD.version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.storefront_config_snapshot() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_storefront_config_rev ON public.storefront_config;
CREATE TRIGGER trg_storefront_config_rev
  BEFORE UPDATE ON public.storefront_config
  FOR EACH ROW EXECUTE FUNCTION public.storefront_config_snapshot();

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          bigserial PRIMARY KEY,
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action      text NOT NULL,
  entity      text NOT NULL,
  entity_id   text,
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor   ON public.admin_audit_log(actor_id) WHERE actor_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key      text PRIMARY KEY,
  count    int NOT NULL DEFAULT 1,
  reset_at timestamptz NOT NULL
);

-- -----------------------------------------------------------------------------
-- 9. IMMUTABILITY ENFORCEMENT FOR ORDER & AUDIT HISTORY (Correction #2)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_historical_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Deletion of historical % records is prohibited; cancel or archive records instead', TG_TABLE_NAME
    USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_historical_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_no_delete_orders ON public.orders;
CREATE TRIGGER trg_no_delete_orders
  BEFORE DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.prevent_historical_delete();

DROP TRIGGER IF EXISTS trg_no_delete_order_items ON public.order_items;
CREATE TRIGGER trg_no_delete_order_items
  BEFORE DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.prevent_historical_delete();

DROP TRIGGER IF EXISTS trg_no_delete_order_events ON public.order_events;
CREATE TRIGGER trg_no_delete_order_events
  BEFORE DELETE ON public.order_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_historical_delete();

DROP TRIGGER IF EXISTS trg_no_delete_stock_movements ON public.stock_movements;
CREATE TRIGGER trg_no_delete_stock_movements
  BEFORE DELETE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.prevent_historical_delete();

DROP TRIGGER IF EXISTS trg_no_delete_audit_log ON public.admin_audit_log;
CREATE TRIGGER trg_no_delete_audit_log
  BEFORE DELETE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_historical_delete();

-- Revoke DELETE explicitly from API roles
REVOKE DELETE ON public.orders, public.order_items, public.order_events,
                 public.stock_movements, public.admin_audit_log,
                 public.storefront_config, public.storefront_config_revisions
  FROM PUBLIC, anon, authenticated;
