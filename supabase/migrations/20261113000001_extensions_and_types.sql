-- =============================================================================
-- Migration 001: Extensions, Custom Enums, and Utility Triggers
-- Target: Supabase PostgreSQL 15+
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Preserves live application OrderStatus union ('new' | 'confirmed' | 'fulfilled' | 'cancelled')
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('new', 'confirmed', 'fulfilled', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method_type AS ENUM ('cod', 'card', 'wallet');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status_type AS ENUM ('unpaid', 'pending', 'paid', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed_amount');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.stock_movement_type AS ENUM (
    'initial_seed',
    'migration_import',
    'order_reserved',
    'order_restocked',
    'admin_adjustment',
    'return'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
