-- =============================================================================
-- Migration 004: Complete Row Level Security (RLS) & Storage Policies
-- =============================================================================

-- Enable RLS on EVERY exposed table in public
ALTER TABLE public.profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_config          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_config_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits                ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 1. PROFILES
-- =============================================================================
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- Note: INSERT and DELETE on profiles are revoked from authenticated/anon;
-- rows are created only via on_auth_user_created trigger and role cannot be modified by users.

-- =============================================================================
-- 2. CATEGORIES, PRODUCTS, IMAGES, VARIANTS (Public Read Active, Admin Write)
-- =============================================================================
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (is_visible = true OR public.is_admin());

DROP POLICY IF EXISTS "categories_admin_insert" ON public.categories;
CREATE POLICY "categories_admin_insert"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "categories_admin_update" ON public.categories;
CREATE POLICY "categories_admin_update"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "categories_admin_delete" ON public.categories;
CREATE POLICY "categories_admin_delete"
  ON public.categories FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING ((is_active = true AND is_archived = false) OR public.is_admin());

DROP POLICY IF EXISTS "products_admin_insert" ON public.products;
CREATE POLICY "products_admin_insert"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products_admin_update" ON public.products;
CREATE POLICY "products_admin_update"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products_admin_delete" ON public.products;
CREATE POLICY "products_admin_delete"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "product_images_public_read" ON public.product_images;
CREATE POLICY "product_images_public_read"
  ON public.product_images FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
       WHERE p.id = product_id
         AND ((p.is_active = true AND p.is_archived = false) OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "product_images_admin_insert" ON public.product_images;
CREATE POLICY "product_images_admin_insert"
  ON public.product_images FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "product_images_admin_update" ON public.product_images;
CREATE POLICY "product_images_admin_update"
  ON public.product_images FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "product_images_admin_delete" ON public.product_images;
CREATE POLICY "product_images_admin_delete"
  ON public.product_images FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "product_variants_public_read" ON public.product_variants;
CREATE POLICY "product_variants_public_read"
  ON public.product_variants FOR SELECT
  TO anon, authenticated
  USING (
    (is_active = true AND EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active = true AND p.is_archived = false
    )) OR public.is_admin()
  );

DROP POLICY IF EXISTS "product_variants_admin_insert" ON public.product_variants;
CREATE POLICY "product_variants_admin_insert"
  ON public.product_variants FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "product_variants_admin_update" ON public.product_variants;
CREATE POLICY "product_variants_admin_update"
  ON public.product_variants FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "product_variants_admin_delete" ON public.product_variants;
CREATE POLICY "product_variants_admin_delete"
  ON public.product_variants FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =============================================================================
-- 3. STOCK MOVEMENTS LEDGER (Admin Read-Only via PostgREST; Writes via RPC)
-- =============================================================================
DROP POLICY IF EXISTS "stock_movements_admin_read" ON public.stock_movements;
CREATE POLICY "stock_movements_admin_read"
  ON public.stock_movements FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "stock_movements_admin_insert" ON public.stock_movements;
CREATE POLICY "stock_movements_admin_insert"
  ON public.stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- No UPDATE or DELETE policies on stock_movements (immutable ledger)

-- =============================================================================
-- 4. PERSISTENT SHOPPING CARTS
-- =============================================================================
DROP POLICY IF EXISTS "carts_own_all" ON public.carts;
CREATE POLICY "carts_own_all"
  ON public.carts FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "cart_items_own_all" ON public.cart_items;
CREATE POLICY "cart_items_own_all"
  ON public.cart_items FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = (select auth.uid()))
  );

-- =============================================================================
-- 5. COUPONS (Admin manages; Customers validate via validate_coupon RPC)
-- =============================================================================
DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;
CREATE POLICY "coupons_admin_all"
  ON public.coupons FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 6. ORDERS, ORDER ITEMS & ORDER EVENTS (Historical records immutable — NO DELETE)
-- =============================================================================
DROP POLICY IF EXISTS "orders_select_own_or_admin" ON public.orders;
CREATE POLICY "orders_select_own_or_admin"
  ON public.orders FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;
CREATE POLICY "orders_admin_update"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Note: Orders are created ONLY via service_role / place_order RPC (guest & customer),
-- and CANNOT be deleted by any API role.

DROP POLICY IF EXISTS "order_items_select_own_or_admin" ON public.order_items;
CREATE POLICY "order_items_select_own_or_admin"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "order_events_select_own_or_admin" ON public.order_events;
CREATE POLICY "order_events_select_own_or_admin"
  ON public.order_events FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = (select auth.uid())
    )
  );

-- =============================================================================
-- 7. STOREFRONT CMS CONFIG, REVISIONS, AUDIT LOG & RATE LIMITS
-- =============================================================================
DROP POLICY IF EXISTS "storefront_config_public_read" ON public.storefront_config;
CREATE POLICY "storefront_config_public_read"
  ON public.storefront_config FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "storefront_config_admin_insert" ON public.storefront_config;
CREATE POLICY "storefront_config_admin_insert"
  ON public.storefront_config FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "storefront_config_admin_update" ON public.storefront_config;
CREATE POLICY "storefront_config_admin_update"
  ON public.storefront_config FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "storefront_revisions_admin_read" ON public.storefront_config_revisions;
CREATE POLICY "storefront_revisions_admin_read"
  ON public.storefront_config_revisions FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_audit_log_admin_read" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_admin_read"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_audit_log_admin_insert" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_admin_insert"
  ON public.admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- rate_limits has RLS enabled and NO anon/authenticated policies (service_role / DEFINER RPC only).

-- =============================================================================
-- 8. SUPABASE STORAGE BUCKETS & OBJECT POLICIES
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images', 'product-images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/avif']),
  ('cms-assets',     'cms-assets',     true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "noovyx_storage_public_read" ON storage.objects;
CREATE POLICY "noovyx_storage_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id IN ('product-images', 'cms-assets'));

DROP POLICY IF EXISTS "noovyx_storage_admin_insert" ON storage.objects;
CREATE POLICY "noovyx_storage_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('product-images', 'cms-assets') AND public.is_admin());

DROP POLICY IF EXISTS "noovyx_storage_admin_update" ON storage.objects;
CREATE POLICY "noovyx_storage_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('product-images', 'cms-assets') AND public.is_admin())
  WITH CHECK (bucket_id IN ('product-images', 'cms-assets') AND public.is_admin());

DROP POLICY IF EXISTS "noovyx_storage_admin_delete" ON storage.objects;
CREATE POLICY "noovyx_storage_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id IN ('product-images', 'cms-assets') AND public.is_admin());
