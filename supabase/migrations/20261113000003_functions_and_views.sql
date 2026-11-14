-- =============================================================================
-- Migration 003: Authorization Helpers, Transactional RPCs & Security-Invoker Views
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADMIN AUTHORIZATION HELPER (Uses raw_app_meta_data ONLY, never user_metadata)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    OR (((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean IS TRUE),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. AUTH USER SIGNUP PROFILE TRIGGER
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := CASE
    WHEN (NEW.raw_app_meta_data ->> 'role') = 'admin'
      OR ((NEW.raw_app_meta_data ->> 'is_admin')::boolean IS TRUE)
    THEN 'admin'
    ELSE 'customer'
  END;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), ''),
    v_role
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = CASE
          WHEN (NEW.raw_app_meta_data ->> 'role') = 'admin'
            OR ((NEW.raw_app_meta_data ->> 'is_admin')::boolean IS TRUE)
          THEN 'admin'
          ELSE 'customer'
        END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 3. PERSISTENT SERVERLESS RATE LIMITER (Service Role Only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_key text,
  p_window_seconds int,
  p_max_requests int
)
RETURNS TABLE (allowed boolean, retry_after_sec int, current_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_row public.rate_limits%ROWTYPE;
BEGIN
  IF trim(COALESCE(p_key, '')) = '' THEN
    RAISE EXCEPTION 'rate limit key required';
  END IF;

  INSERT INTO public.rate_limits (key, count, reset_at)
  VALUES (p_key, 1, v_now + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN public.rate_limits.reset_at <= v_now THEN 1
          ELSE public.rate_limits.count + 1
        END,
        reset_at = CASE
          WHEN public.rate_limits.reset_at <= v_now THEN v_now + make_interval(secs => p_window_seconds)
          ELSE public.rate_limits.reset_at
        END
  RETURNING * INTO v_row;

  IF v_row.count > p_max_requests THEN
    RETURN QUERY SELECT
      false,
      GREATEST(1, ceil(extract(epoch FROM (v_row.reset_at - v_now)))::int),
      v_row.count;
  ELSE
    RETURN QUERY SELECT true, 0, v_row.count;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, int, int) TO service_role;

-- -----------------------------------------------------------------------------
-- 4. COUPON VALIDATION HELPER (Safe public check without exposing coupons table)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_subtotal numeric
)
RETURNS TABLE (
  valid boolean,
  coupon_id uuid,
  code text,
  discount_type public.discount_type,
  discount_value numeric,
  discount_amount numeric,
  reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean text := upper(trim(COALESCE(p_code, '')));
  v_c public.coupons%ROWTYPE;
  v_disc numeric(12, 2) := 0;
BEGIN
  IF v_clean = '' THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::public.discount_type, 0::numeric, 0::numeric, 'Empty coupon code';
    RETURN;
  END IF;

  SELECT * INTO v_c FROM public.coupons WHERE public.coupons.code = v_clean AND is_active = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, v_clean, NULL::public.discount_type, 0::numeric, 0::numeric, 'Invalid or inactive coupon code';
    RETURN;
  END IF;

  IF now() < v_c.starts_at OR (v_c.expires_at IS NOT NULL AND now() > v_c.expires_at) THEN
    RETURN QUERY SELECT false, v_c.id, v_c.code, v_c.discount_type, v_c.discount_value, 0::numeric, 'Coupon has expired';
    RETURN;
  END IF;

  IF v_c.usage_limit IS NOT NULL AND v_c.used_count >= v_c.usage_limit THEN
    RETURN QUERY SELECT false, v_c.id, v_c.code, v_c.discount_type, v_c.discount_value, 0::numeric, 'Coupon usage limit reached';
    RETURN;
  END IF;

  IF p_subtotal < v_c.min_order_subtotal THEN
    RETURN QUERY SELECT false, v_c.id, v_c.code, v_c.discount_type, v_c.discount_value, 0::numeric,
      format('Minimum order subtotal of EGP %s required', v_c.min_order_subtotal);
    RETURN;
  END IF;

  IF v_c.discount_type = 'percentage' THEN
    v_disc := round((p_subtotal * v_c.discount_value) / 100.0, 2);
  ELSE
    v_disc := v_c.discount_value;
  END IF;

  IF v_c.max_discount_amount IS NOT NULL THEN
    v_disc := LEAST(v_disc, v_c.max_discount_amount);
  END IF;
  v_disc := LEAST(v_disc, p_subtotal);

  RETURN QUERY SELECT true, v_c.id, v_c.code, v_c.discount_type, v_c.discount_value, v_disc, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. ATOMIC TRANSACTIONAL CHECKOUT: public.place_order (Service Role Only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_order(p_payload jsonb)
RETURNS TABLE (
  out_order_id uuid,
  out_order_number text,
  out_subtotal numeric,
  out_shipping_fee numeric,
  out_cod_fee numeric,
  out_discount_amount numeric,
  out_grand_total numeric,
  out_idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_idemp_key     text := NULLIF(trim(COALESCE(p_payload ->> 'idempotencyKey', '')), '');
  v_existing      public.orders%ROWTYPE;
  v_user_id       uuid := NULLIF(trim(COALESCE(p_payload ->> 'userId', '')), '')::uuid;
  v_guest_hash    text := NULLIF(trim(COALESCE(p_payload ->> 'guestTokenHash', '')), '');
  v_customer_name text := trim(COALESCE(p_payload ->> 'customerName', ''));
  v_contact       text := trim(COALESCE(p_payload ->> 'contact', ''));
  v_governorate   text := NULLIF(trim(COALESCE(p_payload ->> 'governorate', '')), '');
  v_address       text := trim(COALESCE(p_payload ->> 'address', ''));
  v_notes         text := trim(COALESCE(p_payload ->> 'notes', ''));
  v_coupon_code   text := NULLIF(upper(trim(COALESCE(p_payload ->> 'couponCode', ''))), '');

  v_order_id      uuid;
  v_order_number  text;
  v_subtotal      numeric(12, 2) := 0;
  v_shipping_fee  numeric(12, 2) := 0;
  v_cod_fee       numeric(12, 2) := 0;
  v_discount_amt  numeric(12, 2) := 0;
  v_grand_total   numeric(12, 2) := 0;
  v_coupon_id     uuid := NULL;

  v_cfg           jsonb;
  v_coupon        public.coupons%ROWTYPE;
  it              record;
  v_prod          public.products%ROWTYPE;
  v_var           public.product_variants%ROWTYPE;
  v_unit_price    numeric(12, 2);
  v_new_stock     int;
BEGIN
  -- 1. Serialize & replay on idempotency key inside transaction
  IF v_idemp_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('order_idemp:' || v_idemp_key));
    SELECT * INTO v_existing FROM public.orders WHERE idempotency_key = v_idemp_key;
    IF FOUND THEN
      RETURN QUERY SELECT
        v_existing.id,
        v_existing.order_number,
        v_existing.subtotal,
        COALESCE(v_existing.shipping_fee, 0::numeric),
        COALESCE(v_existing.cod_fee, 0::numeric),
        COALESCE(v_existing.discount_amount, 0::numeric),
        COALESCE(v_existing.grand_total, v_existing.subtotal),
        true;
      RETURN;
    END IF;
  END IF;

  -- 2. Structural & identity checks (Guest checkout MUST have guestTokenHash or authenticated userId)
  IF v_guest_hash IS NULL AND v_user_id IS NULL THEN
    RAISE EXCEPTION 'Order must provide either userId or guestTokenHash';
  END IF;

  IF char_length(v_customer_name) < 2 OR char_length(v_contact) < 6 OR char_length(v_address) < 3 THEN
    RAISE EXCEPTION 'Invalid customer contact or address details';
  END IF;

  IF jsonb_typeof(p_payload -> 'items') <> 'array' OR jsonb_array_length(p_payload -> 'items') = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- Create shell order row first so FKs in order_items & stock_movements succeed cleanly
  INSERT INTO public.orders (
    user_id, idempotency_key, guest_token_hash,
    customer_name, contact, governorate, address, notes,
    status, subtotal, shipping_fee, cod_fee, discount_amount, grand_total,
    is_legacy_import
  )
  VALUES (
    v_user_id, v_idemp_key, v_guest_hash,
    left(v_customer_name, 120), left(v_contact, 120), left(v_governorate, 80),
    left(v_address, 500), left(v_notes, 1000),
    'new', 0, 0, 0, 0, 0,
    false
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- 3. Deterministic lock order (product_id, coalesce(variant_id, '')) to prevent deadlocks
  FOR it IN
    SELECT
      (e ->> 'productId') AS pid,
      NULLIF(trim(COALESCE(e ->> 'variantId', '')), '') AS vid,
      sum((e ->> 'quantity')::int)::int AS qty
    FROM jsonb_array_elements(p_payload -> 'items') e
    GROUP BY 1, 2
    ORDER BY 1, 2 NULLS FIRST
  LOOP
    IF it.pid IS NULL OR it.qty IS NULL OR it.qty <= 0 OR it.qty > 20 THEN
      RAISE EXCEPTION 'Invalid product quantity for "%"', COALESCE(it.pid, 'unknown');
    END IF;

    SELECT * INTO v_prod
      FROM public.products
     WHERE id = it.pid AND is_active = true AND is_archived = false
       FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product unavailable: %', it.pid;
    END IF;

    IF it.vid IS NOT NULL THEN
      SELECT * INTO v_var
        FROM public.product_variants
       WHERE id = it.vid AND product_id = v_prod.id AND is_active = true
         FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Selected variant "%" unavailable for "%"', it.vid, v_prod.name;
      END IF;

      IF v_var.stock_quantity < it.qty THEN
        RAISE EXCEPTION 'Insufficient stock for "% (%)"', v_prod.name, v_var.title;
      END IF;

      v_unit_price := COALESCE(v_var.price_override, v_prod.price);
      v_new_stock  := v_var.stock_quantity - it.qty;

      UPDATE public.product_variants
         SET stock_quantity = v_new_stock
       WHERE id = v_var.id;

      INSERT INTO public.stock_movements (
        product_id, variant_id, quantity_delta, balance_after,
        movement_type, reference_type, reference_id, actor_id, actor_label, note
      ) VALUES (
        v_prod.id, v_var.id, -it.qty, v_new_stock,
        'order_reserved', 'order', v_order_id::text, v_user_id, 'checkout',
        format('Reserved %s unit(s) for %s', it.qty, v_order_number)
      );

      INSERT INTO public.order_items (order_id, product_id, variant_id, name, variant_title, unit_price, quantity)
      VALUES (v_order_id, v_prod.id, v_var.id, v_prod.name, v_var.title, v_unit_price, it.qty);
    ELSE
      IF v_prod.has_variants THEN
        RAISE EXCEPTION 'Please select a variant for "%"', v_prod.name;
      END IF;

      IF v_prod.stock_quantity < it.qty THEN
        RAISE EXCEPTION 'Insufficient stock for "%"', v_prod.name;
      END IF;

      v_unit_price := v_prod.price;
      v_new_stock  := v_prod.stock_quantity - it.qty;

      UPDATE public.products
         SET stock_quantity = v_new_stock
       WHERE id = v_prod.id;

      INSERT INTO public.stock_movements (
        product_id, variant_id, quantity_delta, balance_after,
        movement_type, reference_type, reference_id, actor_id, actor_label, note
      ) VALUES (
        v_prod.id, NULL, -it.qty, v_new_stock,
        'order_reserved', 'order', v_order_id::text, v_user_id, 'checkout',
        format('Reserved %s unit(s) for %s', it.qty, v_order_number)
      );

      INSERT INTO public.order_items (order_id, product_id, variant_id, name, variant_title, unit_price, quantity)
      VALUES (v_order_id, v_prod.id, NULL, v_prod.name, NULL, v_unit_price, it.qty);
    END IF;

    v_subtotal := v_subtotal + (v_unit_price * it.qty);
  END LOOP;

  -- 4. Coupon evaluation & atomic increment
  IF v_coupon_code IS NOT NULL THEN
    SELECT * INTO v_coupon FROM public.coupons WHERE code = v_coupon_code AND is_active = true FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or inactive coupon "%"', v_coupon_code;
    END IF;
    IF now() < v_coupon.starts_at OR (v_coupon.expires_at IS NOT NULL AND now() > v_coupon.expires_at) THEN
      RAISE EXCEPTION 'Coupon "%" has expired', v_coupon_code;
    END IF;
    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
      RAISE EXCEPTION 'Coupon "%" usage limit reached', v_coupon_code;
    END IF;
    IF v_subtotal < v_coupon.min_order_subtotal THEN
      RAISE EXCEPTION 'Order subtotal does not meet minimum requirement for coupon "%"', v_coupon_code;
    END IF;

    IF v_coupon.discount_type = 'percentage' THEN
      v_discount_amt := round((v_subtotal * v_coupon.discount_value) / 100.0, 2);
    ELSE
      v_discount_amt := v_coupon.discount_value;
    END IF;
    IF v_coupon.max_discount_amount IS NOT NULL THEN
      v_discount_amt := LEAST(v_discount_amt, v_coupon.max_discount_amount);
    END IF;
    v_discount_amt := LEAST(v_discount_amt, v_subtotal);
    v_coupon_id := v_coupon.id;

    UPDATE public.coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
  END IF;

  -- 5. Server-side shipping/COD calculation driven by storefront_config.commerce (0 if post-confirmation shipping)
  SELECT config INTO v_cfg FROM public.storefront_config WHERE id = 1;
  IF (v_cfg -> 'commerce' ->> 'shippingEnabled')::boolean IS TRUE THEN
    IF v_subtotal >= COALESCE((v_cfg -> 'commerce' ->> 'freeShippingThreshold')::numeric, 9999999) THEN
      v_shipping_fee := 0;
    ELSIF v_governorate IN ('Cairo', 'Giza') THEN
      v_shipping_fee := COALESCE((v_cfg -> 'commerce' ->> 'cairoGizaShippingFee')::numeric, 0);
    ELSE
      v_shipping_fee := COALESCE((v_cfg -> 'commerce' ->> 'otherGovernoratesShippingFee')::numeric, 0);
    END IF;
    v_cod_fee := COALESCE((v_cfg -> 'commerce' ->> 'codFee')::numeric, 0);
  END IF;

  v_grand_total := GREATEST(0, v_subtotal - v_discount_amt + v_shipping_fee + v_cod_fee);

  UPDATE public.orders
     SET coupon_id       = v_coupon_id,
         coupon_code     = v_coupon_code,
         subtotal        = v_subtotal,
         shipping_fee    = v_shipping_fee,
         cod_fee         = v_cod_fee,
         discount_amount = v_discount_amt,
         grand_total     = v_grand_total
   WHERE id = v_order_id;

  INSERT INTO public.order_events (order_id, from_status, to_status, actor_id, actor_label, note)
  VALUES (v_order_id, NULL, 'new', v_user_id, CASE WHEN v_user_id IS NULL THEN 'guest' ELSE 'customer' END, 'Order submitted');

  -- Clear persisted cart items for authenticated checkout
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.cart_items ci
    USING public.carts c
    WHERE ci.cart_id = c.id AND c.user_id = v_user_id;
  END IF;

  RETURN QUERY SELECT
    v_order_id, v_order_number, v_subtotal, v_shipping_fee, v_cod_fee, v_discount_amt, v_grand_total, false;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb) TO service_role;

-- -----------------------------------------------------------------------------
-- 6. ADMIN ORDER STATUS TRANSITIONS & AUTOMATIC STOCK RESTOCK (Admin / Service Role)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_order_status(
  p_order_id uuid,
  p_new_status public.order_status,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role       text := current_setting('role', true);
  v_actor_id   uuid := auth.uid();
  v_actor_mail text := (select auth.jwt()) ->> 'email';
  v_old_status public.order_status;
  v_ord_num    text;
  it           record;
  v_new_bal    int;
BEGIN
  IF v_role <> 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: administrator privileges required' USING ERRCODE = '42501';
  END IF;

  SELECT status, order_number INTO v_old_status, v_ord_num
    FROM public.orders
   WHERE id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_old_status = p_new_status THEN
    RETURN;
  END IF;

  -- Restore stock when cancelling a non-cancelled order
  IF p_new_status = 'cancelled' THEN
    FOR it IN
      SELECT oi.product_id, oi.variant_id, oi.quantity
        FROM public.order_items oi
       WHERE oi.order_id = p_order_id
       ORDER BY oi.product_id, oi.variant_id NULLS FIRST
    LOOP
      IF it.variant_id IS NOT NULL THEN
        UPDATE public.product_variants
           SET stock_quantity = stock_quantity + it.quantity
         WHERE id = it.variant_id
         RETURNING stock_quantity INTO v_new_bal;

        INSERT INTO public.stock_movements (
          product_id, variant_id, quantity_delta, balance_after,
          movement_type, reference_type, reference_id, actor_id, actor_label, note
        ) VALUES (
          it.product_id, it.variant_id, it.quantity, v_new_bal,
          'order_restocked', 'order', p_order_id::text, v_actor_id,
          COALESCE(v_actor_mail, v_role), format('Order %s cancelled — restocked', v_ord_num)
        );
      ELSIF it.product_id IS NOT NULL THEN
        UPDATE public.products
           SET stock_quantity = stock_quantity + it.quantity
         WHERE id = it.product_id
         RETURNING stock_quantity INTO v_new_bal;

        INSERT INTO public.stock_movements (
          product_id, variant_id, quantity_delta, balance_after,
          movement_type, reference_type, reference_id, actor_id, actor_label, note
        ) VALUES (
          it.product_id, NULL, it.quantity, v_new_bal,
          'order_restocked', 'order', p_order_id::text, v_actor_id,
          COALESCE(v_actor_mail, v_role), format('Order %s cancelled — restocked', v_ord_num)
        );
      END IF;
    END LOOP;
  -- Re-reserve stock if un-cancelling an order back to an active status
  ELSIF v_old_status = 'cancelled' THEN
    FOR it IN
      SELECT oi.product_id, oi.variant_id, oi.quantity, oi.name
        FROM public.order_items oi
       WHERE oi.order_id = p_order_id
       ORDER BY oi.product_id, oi.variant_id NULLS FIRST
    LOOP
      IF it.variant_id IS NOT NULL THEN
        UPDATE public.product_variants
           SET stock_quantity = stock_quantity - it.quantity
         WHERE id = it.variant_id AND stock_quantity >= it.quantity
         RETURNING stock_quantity INTO v_new_bal;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Insufficient variant stock to reactivate order for "%"', it.name;
        END IF;

        INSERT INTO public.stock_movements (
          product_id, variant_id, quantity_delta, balance_after,
          movement_type, reference_type, reference_id, actor_id, actor_label, note
        ) VALUES (
          it.product_id, it.variant_id, -it.quantity, v_new_bal,
          'order_reserved', 'order', p_order_id::text, v_actor_id,
          COALESCE(v_actor_mail, v_role), format('Order %s reactivated', v_ord_num)
        );
      ELSIF it.product_id IS NOT NULL THEN
        UPDATE public.products
           SET stock_quantity = stock_quantity - it.quantity
         WHERE id = it.product_id AND stock_quantity >= it.quantity
         RETURNING stock_quantity INTO v_new_bal;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Insufficient stock to reactivate order for "%"', it.name;
        END IF;

        INSERT INTO public.stock_movements (
          product_id, variant_id, quantity_delta, balance_after,
          movement_type, reference_type, reference_id, actor_id, actor_label, note
        ) VALUES (
          it.product_id, NULL, -it.quantity, v_new_bal,
          'order_reserved', 'order', p_order_id::text, v_actor_id,
          COALESCE(v_actor_mail, v_role), format('Order %s reactivated', v_ord_num)
        );
      END IF;
    END LOOP;
  END IF;

  UPDATE public.orders
     SET status       = p_new_status,
         confirmed_at = CASE WHEN p_new_status = 'confirmed' THEN COALESCE(confirmed_at, now()) ELSE confirmed_at END,
         fulfilled_at = CASE WHEN p_new_status = 'fulfilled' THEN COALESCE(fulfilled_at, now()) ELSE fulfilled_at END,
         cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN now() ELSE cancelled_at END
   WHERE id = p_order_id;

  INSERT INTO public.order_events (order_id, from_status, to_status, actor_id, actor_label, note)
  VALUES (
    p_order_id, v_old_status, p_new_status, v_actor_id,
    COALESCE(v_actor_mail, CASE WHEN v_role = 'service_role' THEN 'server' ELSE 'admin' END),
    p_note
  );

  INSERT INTO public.admin_audit_log (actor_id, actor_email, action, entity, entity_id, details)
  VALUES (
    v_actor_id, v_actor_mail, 'order.status_changed', 'order', p_order_id::text,
    jsonb_build_object('from', v_old_status, 'to', p_new_status, 'note', p_note)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_order_status(uuid, public.order_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_order_status(uuid, public.order_status, text) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 7. TRANSACTIONAL ADMIN STOCK ADJUSTMENT (Records stock_movements)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_adjust_stock(
  p_product_id text,
  p_variant_id text DEFAULT NULL,
  p_new_stock int DEFAULT NULL,
  p_delta int DEFAULT NULL,
  p_note text DEFAULT 'Manual admin adjustment'
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role       text := current_setting('role', true);
  v_actor_id   uuid := auth.uid();
  v_actor_mail text := (select auth.jwt()) ->> 'email';
  v_old_stock  int;
  v_next_stock int;
  v_delta      int;
  v_has_vars   boolean;
BEGIN
  IF v_role <> 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: administrator privileges required' USING ERRCODE = '42501';
  END IF;

  IF p_new_stock IS NULL AND p_delta IS NULL THEN
    RAISE EXCEPTION 'Either p_new_stock or p_delta must be provided';
  END IF;

  SELECT has_variants, stock_quantity INTO v_has_vars, v_old_stock
    FROM public.products
   WHERE id = p_product_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  IF p_variant_id IS NOT NULL THEN
    SELECT stock_quantity INTO v_old_stock
      FROM public.product_variants
     WHERE id = p_variant_id AND product_id = p_product_id
       FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant not found: %', p_variant_id;
    END IF;

    v_next_stock := COALESCE(p_new_stock, v_old_stock + COALESCE(p_delta, 0));
    IF v_next_stock < 0 THEN
      RAISE EXCEPTION 'Stock cannot be negative (attempted %)', v_next_stock;
    END IF;
    v_delta := v_next_stock - v_old_stock;

    IF v_delta <> 0 THEN
      UPDATE public.product_variants SET stock_quantity = v_next_stock WHERE id = p_variant_id;

      INSERT INTO public.stock_movements (
        product_id, variant_id, quantity_delta, balance_after,
        movement_type, reference_type, reference_id, actor_id, actor_label, note
      ) VALUES (
        p_product_id, p_variant_id, v_delta, v_next_stock,
        'admin_adjustment', 'manual', p_variant_id, v_actor_id,
        COALESCE(v_actor_mail, v_role), COALESCE(p_note, 'Manual admin adjustment')
      );
    END IF;
    RETURN v_next_stock;
  END IF;

  IF v_has_vars THEN
    RAISE EXCEPTION 'Product "%" manages stock per variant; specify p_variant_id', p_product_id;
  END IF;

  v_next_stock := COALESCE(p_new_stock, v_old_stock + COALESCE(p_delta, 0));
  IF v_next_stock < 0 THEN
    RAISE EXCEPTION 'Stock cannot be negative (attempted %)', v_next_stock;
  END IF;
  v_delta := v_next_stock - v_old_stock;

  IF v_delta <> 0 THEN
    UPDATE public.products SET stock_quantity = v_next_stock WHERE id = p_product_id;

    INSERT INTO public.stock_movements (
      product_id, variant_id, quantity_delta, balance_after,
      movement_type, reference_type, reference_id, actor_id, actor_label, note
    ) VALUES (
      p_product_id, NULL, v_delta, v_next_stock,
      'admin_adjustment', 'manual', p_product_id, v_actor_id,
      COALESCE(v_actor_mail, v_role), COALESCE(p_note, 'Manual admin adjustment')
    );

    INSERT INTO public.admin_audit_log (actor_id, actor_email, action, entity, entity_id, details)
    VALUES (
      v_actor_id, v_actor_mail, 'inventory.adjusted', 'product', p_product_id,
      jsonb_build_object('oldStock', v_old_stock, 'newStock', v_next_stock, 'delta', v_delta, 'note', p_note)
    );
  END IF;

  RETURN v_next_stock;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_stock(text, text, int, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_stock(text, text, int, int, text) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 8. SECURE GUEST ORDER TRACKING (Service Role Only; Masks All Customer PII)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_guest_order(
  p_order_number text,
  p_guest_token_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ord   public.orders%ROWTYPE;
  v_items jsonb;
  v_evts  jsonb;
  v_first text;
  v_phone text;
BEGIN
  IF trim(COALESCE(p_order_number, '')) = '' OR length(trim(COALESCE(p_guest_token_hash, ''))) <> 64 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_ord
    FROM public.orders
   WHERE upper(order_number) = upper(trim(p_order_number))
     AND guest_token_hash IS NOT NULL
     AND guest_token_hash = lower(trim(p_guest_token_hash));

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', oi.name,
    'variantTitle', oi.variant_title,
    'quantity', oi.quantity,
    'unitPrice', oi.unit_price,
    'lineTotal', oi.line_total
  ) ORDER BY oi.id), '[]'::jsonb)
  INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_ord.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'status', oe.to_status,
    'note', oe.note,
    'createdAt', oe.created_at
  ) ORDER BY oe.created_at ASC), '[]'::jsonb)
  INTO v_evts
  FROM public.order_events oe
  WHERE oe.order_id = v_ord.id;

  -- Strictly mask customer PII so guest lookup tokens never expose phone or street address
  v_first := split_part(trim(v_ord.customer_name), ' ', 1);
  v_first := left(v_first, 1) || repeat('*', GREATEST(1, char_length(v_first) - 1));
  v_phone := CASE
    WHEN char_length(v_ord.contact) <= 4 THEN '****'
    ELSE left(v_ord.contact, 2) || '*****' || right(v_ord.contact, 2)
  END;

  RETURN jsonb_build_object(
    'orderNumber', v_ord.order_number,
    'status', v_ord.status,
    'createdAt', v_ord.created_at,
    'confirmedAt', v_ord.confirmed_at,
    'fulfilledAt', v_ord.fulfilled_at,
    'cancelledAt', v_ord.cancelled_at,
    'customerMasked', v_first,
    'contactMasked', v_phone,
    'governorate', COALESCE(v_ord.governorate, split_part(v_ord.address, ' - ', 1)),
    'subtotal', v_ord.subtotal,
    'shippingFee', v_ord.shipping_fee,
    'codFee', v_ord.cod_fee,
    'discountAmount', v_ord.discount_amount,
    'grandTotal', v_ord.grand_total,
    'isLegacyImport', v_ord.is_legacy_import,
    'items', v_items,
    'events', v_evts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_guest_order(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_guest_order(text, text) TO service_role;

-- -----------------------------------------------------------------------------
-- 9. DASHBOARD ANALYTICAL VIEWS (ALL WITH security_invoker = true!)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_low_stock
WITH (security_invoker = true) AS
SELECT id, name, category_id, stock_quantity, low_stock_threshold, (stock_quantity = 0) AS is_out
  FROM public.products
 WHERE is_active = true AND is_archived = false AND stock_quantity <= low_stock_threshold
 ORDER BY stock_quantity ASC;

CREATE OR REPLACE VIEW public.v_order_stats
WITH (security_invoker = true) AS
SELECT
  count(*)::int AS total_orders,
  count(*) FILTER (WHERE status = 'new')::int AS new_orders,
  count(*) FILTER (WHERE status = 'confirmed')::int AS confirmed_orders,
  count(*) FILTER (WHERE status = 'fulfilled')::int AS fulfilled_orders,
  count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_orders,
  coalesce(sum(subtotal) FILTER (WHERE status IN ('confirmed', 'fulfilled')), 0)::numeric(12, 2) AS confirmed_subtotal_revenue
FROM public.orders;

CREATE OR REPLACE VIEW public.v_top_products
WITH (security_invoker = true) AS
SELECT
  oi.product_id,
  oi.name,
  sum(oi.quantity)::bigint AS units_sold,
  sum(oi.line_total)::numeric(12, 2) AS revenue
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
WHERE o.status <> 'cancelled'
GROUP BY oi.product_id, oi.name
ORDER BY units_sold DESC;

CREATE OR REPLACE VIEW public.v_stock_movement_summary
WITH (security_invoker = true) AS
SELECT
  sm.product_id,
  p.name AS product_name,
  p.stock_quantity AS current_authoritative_stock,
  coalesce(sum(sm.quantity_delta), 0)::bigint AS ledger_net_delta,
  count(*)::bigint AS movement_count,
  max(sm.created_at) AS last_movement_at
FROM public.stock_movements sm
JOIN public.products p ON p.id = sm.product_id
GROUP BY sm.product_id, p.name, p.stock_quantity;
