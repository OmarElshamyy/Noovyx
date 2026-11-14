-- =============================================================================
-- Migration 006: Enable Supabase Realtime for Storefront CMS & Public Catalog
-- Ensures admin section toggles, CMS content edits, and product availability
-- changes broadcast live to all active visitor tabs globally.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'storefront_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.storefront_config;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
END
$$;
