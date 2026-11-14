// Auto-generated via Supabase MCP generate_typescript_types (project nspzvguggvvcqcplhuix)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: number
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: number
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: number
          product_id: string
          quantity: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: number
          product_id: string
          quantity: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: number
          product_id?: string
          quantity?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: string
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          blurb: string
          created_at: string
          id: string
          image: string
          is_visible: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          blurb?: string
          created_at?: string
          id: string
          image?: string
          is_visible?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          blurb?: string
          created_at?: string
          id?: string
          image?: string
          is_visible?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount_amount: number | null
          min_order_subtotal: number
          starts_at: string
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_subtotal?: number
          starts_at?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_subtotal?: number
          starts_at?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      order_events: {
        Row: {
          actor_id: string | null
          actor_label: string
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: number
          note: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_id?: string | null
          actor_label?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: number
          note?: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_id?: string | null
          actor_label?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: number
          note?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: number
          line_total: number | null
          name: string
          order_id: string
          product_id: string | null
          quantity: number
          unit_price: number
          variant_id: string | null
          variant_title: string | null
        }
        Insert: {
          id?: number
          line_total?: number | null
          name: string
          order_id: string
          product_id?: string | null
          quantity: number
          unit_price: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Update: {
          id?: number
          line_total?: number | null
          name?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          cancelled_at: string | null
          cod_fee: number | null
          confirmed_at: string | null
          contact: string
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          customer_name: string
          discount_amount: number | null
          fulfilled_at: string | null
          governorate: string | null
          grand_total: number | null
          guest_token_hash: string | null
          id: string
          idempotency_key: string | null
          is_legacy_import: boolean
          legacy_raw_payload: Json | null
          legacy_source: string | null
          legacy_source_id: string | null
          legacy_unrecoverable_fields: string[]
          notes: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          payment_provider_ref: string | null
          payment_status: Database["public"]["Enums"]["payment_status_type"]
          shipping_fee: number | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: string
          cancelled_at?: string | null
          cod_fee?: number | null
          confirmed_at?: string | null
          contact: string
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_name: string
          discount_amount?: number | null
          fulfilled_at?: string | null
          governorate?: string | null
          grand_total?: number | null
          guest_token_hash?: string | null
          id?: string
          idempotency_key?: string | null
          is_legacy_import?: boolean
          legacy_raw_payload?: Json | null
          legacy_source?: string | null
          legacy_source_id?: string | null
          legacy_unrecoverable_fields?: string[]
          notes?: string
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method_type"]
          payment_provider_ref?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status_type"]
          shipping_fee?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          cancelled_at?: string | null
          cod_fee?: number | null
          confirmed_at?: string | null
          contact?: string
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_name?: string
          discount_amount?: number | null
          fulfilled_at?: string | null
          governorate?: string | null
          grand_total?: number | null
          guest_token_hash?: string | null
          id?: string
          idempotency_key?: string | null
          is_legacy_import?: boolean
          legacy_raw_payload?: Json | null
          legacy_source?: string | null
          legacy_source_id?: string | null
          legacy_unrecoverable_fields?: string[]
          notes?: string
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method_type"]
          payment_provider_ref?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status_type"]
          shipping_fee?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: number
          position: number
          product_id: string
          storage_path: string | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: number
          position?: number
          product_id: string
          storage_path?: string | null
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: number
          position?: number
          product_id?: string
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          in_stock: boolean | null
          is_active: boolean
          options: Json
          position: number
          price_override: number | null
          product_id: string
          sku: string | null
          stock_quantity: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          in_stock?: boolean | null
          is_active?: boolean
          options?: Json
          position?: number
          price_override?: number | null
          product_id: string
          sku?: string | null
          stock_quantity?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          in_stock?: boolean | null
          is_active?: boolean
          options?: Json
          position?: number
          price_override?: number | null
          product_id?: string
          sku?: string | null
          stock_quantity?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          compare_at_price: number | null
          created_at: string
          description: string
          featured: boolean
          has_variants: boolean
          id: string
          image: string
          in_stock: boolean | null
          is_active: boolean
          is_archived: boolean
          legacy_source: string | null
          legacy_unrecoverable_fields: string[]
          low_stock_threshold: number
          name: string
          price: number
          search_vector: unknown
          slug: string
          sort_order: number
          specs: string[]
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          category_id: string
          compare_at_price?: number | null
          created_at?: string
          description?: string
          featured?: boolean
          has_variants?: boolean
          id: string
          image?: string
          in_stock?: boolean | null
          is_active?: boolean
          is_archived?: boolean
          legacy_source?: string | null
          legacy_unrecoverable_fields?: string[]
          low_stock_threshold?: number
          name: string
          price: number
          search_vector?: unknown
          slug: string
          sort_order?: number
          specs?: string[]
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          compare_at_price?: number | null
          created_at?: string
          description?: string
          featured?: boolean
          has_variants?: boolean
          id?: string
          image?: string
          in_stock?: boolean | null
          is_active?: boolean
          is_archived?: boolean
          legacy_source?: string | null
          legacy_unrecoverable_fields?: string[]
          low_stock_threshold?: number
          name?: string
          price?: number
          search_vector?: unknown
          slug?: string
          sort_order?: number
          specs?: string[]
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_address: string | null
          default_governorate: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_address?: string | null
          default_governorate?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_address?: string | null
          default_governorate?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          reset_at: string
        }
        Insert: {
          count?: number
          key: string
          reset_at: string
        }
        Update: {
          count?: number
          key?: string
          reset_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          actor_id: string | null
          actor_label: string | null
          balance_after: number
          created_at: string
          id: number
          idempotency_key: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          note: string | null
          product_id: string
          quantity_delta: number
          reference_id: string | null
          reference_type: string | null
          variant_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_label?: string | null
          balance_after: number
          created_at?: string
          id?: number
          idempotency_key?: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          note?: string | null
          product_id: string
          quantity_delta: number
          reference_id?: string | null
          reference_type?: string | null
          variant_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_label?: string | null
          balance_after?: number
          created_at?: string
          id?: number
          idempotency_key?: string | null
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          note?: string | null
          product_id?: string
          quantity_delta?: number
          reference_id?: string | null
          reference_type?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_config: {
        Row: {
          config: Json
          id: number
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          config?: Json
          id?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          config?: Json
          id?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      storefront_config_revisions: {
        Row: {
          config: Json
          created_at: string
          id: number
          updated_by: string | null
          version: number
        }
        Insert: {
          config: Json
          created_at?: string
          id?: number
          updated_by?: string | null
          version: number
        }
        Update: {
          config?: Json
          created_at?: string
          id?: number
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      v_low_stock: {
        Row: {
          category_id: string | null
          id: string | null
          is_out: boolean | null
          low_stock_threshold: number | null
          name: string | null
          stock_quantity: number | null
        }
        Insert: {
          category_id?: string | null
          id?: string | null
          is_out?: never
          low_stock_threshold?: number | null
          name?: string | null
          stock_quantity?: number | null
        }
        Update: {
          category_id?: string | null
          id?: string | null
          is_out?: never
          low_stock_threshold?: number | null
          name?: string | null
          stock_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      v_order_stats: {
        Row: {
          cancelled_orders: number | null
          confirmed_orders: number | null
          confirmed_subtotal_revenue: number | null
          fulfilled_orders: number | null
          new_orders: number | null
          total_orders: number | null
        }
        Relationships: []
      }
      v_stock_movement_summary: {
        Row: {
          current_authoritative_stock: number | null
          last_movement_at: string | null
          ledger_net_delta: number | null
          movement_count: number | null
          product_id: string | null
          product_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      v_top_products: {
        Row: {
          name: string | null
          product_id: string | null
          revenue: number | null
          units_sold: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_low_stock"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_adjust_stock: {
        Args: {
          p_delta?: number
          p_new_stock?: number
          p_note?: string
          p_product_id: string
          p_variant_id?: string
        }
        Returns: number
      }
      check_and_increment_rate_limit: {
        Args: {
          p_key: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          current_count: number
          retry_after_sec: number
        }[]
      }
      get_guest_order: {
        Args: { p_guest_token_hash: string; p_order_number: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      place_order: {
        Args: { p_payload: Json }
        Returns: {
          out_cod_fee: number
          out_discount_amount: number
          out_grand_total: number
          out_idempotent_replay: boolean
          out_order_id: string
          out_order_number: string
          out_shipping_fee: number
          out_subtotal: number
        }[]
      }
      set_order_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["order_status"]
          p_note?: string
          p_order_id: string
        }
        Returns: undefined
      }
      validate_coupon: {
        Args: { p_code: string; p_subtotal: number }
        Returns: {
          code: string
          coupon_id: string
          discount_amount: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          reason: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      discount_type: "percentage" | "fixed_amount"
      order_status: "new" | "confirmed" | "fulfilled" | "cancelled"
      payment_method_type: "cod" | "card" | "wallet"
      payment_status_type: "unpaid" | "pending" | "paid" | "failed" | "refunded"
      stock_movement_type:
        | "initial_seed"
        | "migration_import"
        | "order_reserved"
        | "order_restocked"
        | "admin_adjustment"
        | "return"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      discount_type: ["percentage", "fixed_amount"],
      order_status: ["new", "confirmed", "fulfilled", "cancelled"],
      payment_method_type: ["cod", "card", "wallet"],
      payment_status_type: ["unpaid", "pending", "paid", "failed", "refunded"],
      stock_movement_type: [
        "initial_seed",
        "migration_import",
        "order_reserved",
        "order_restocked",
        "admin_adjustment",
        "return",
      ],
    },
  },
} as const
