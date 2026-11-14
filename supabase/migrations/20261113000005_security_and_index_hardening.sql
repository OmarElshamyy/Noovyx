-- =============================================================================
-- Migration 005: Security & Index Hardening (Matches remote security_and_index_hardening)
-- =============================================================================

-- 1. Switch public.is_admin() to SECURITY INVOKER (reads JWT app_metadata only;
--    no table access needed, eliminates security_definer lint warnings).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    OR (((select auth.jwt()) -> 'app_metadata' ->> 'is_admin')::boolean IS TRUE),
    false
  );
$$;

-- 2. Add covering partial indexes for foreign keys on audit/history columns
CREATE INDEX IF NOT EXISTS idx_order_events_actor
  ON public.order_events USING btree (actor_id)
  WHERE (actor_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_stock_movements_actor
  ON public.stock_movements USING btree (actor_id)
  WHERE (actor_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_storefront_config_updated_by
  ON public.storefront_config USING btree (updated_by)
  WHERE (updated_by IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_storefront_revisions_updated_by
  ON public.storefront_config_revisions USING btree (updated_by)
  WHERE (updated_by IS NOT NULL);

-- 3. Enforce strict server-only access on rate_limits
REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.rate_limits TO service_role;
