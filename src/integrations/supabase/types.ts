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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question?: string
          sort_order?: number
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          available: boolean
          best_seller: boolean
          category_id: string | null
          created_at: string
          description: string
          featured: boolean
          id: string
          image_url: string | null
          name: string
          price: number
          rating: number
          sort_order: number
          updated_at: string
          veg: boolean
        }
        Insert: {
          available?: boolean
          best_seller?: boolean
          category_id?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          name: string
          price?: number
          rating?: number
          sort_order?: number
          updated_at?: string
          veg?: boolean
        }
        Update: {
          available?: boolean
          best_seller?: boolean
          category_id?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          rating?: number
          sort_order?: number
          updated_at?: string
          veg?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string | null
          name: string
          order_id: string
          price: number
          qty: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          name: string
          order_id: string
          price?: number
          qty?: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          name?: string
          order_id?: string
          price?: number
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string
          id: string
          order_number: string
          payment_method: string
          phone: string
          pickup_time: string
          special_instructions: string | null
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          id?: string
          order_number: string
          payment_method?: string
          phone: string
          pickup_time?: string
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          id?: string
          order_number?: string
          payment_method?: string
          phone?: string
          pickup_time?: string
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          name: string
          quote: string
          rating: number
          role: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          quote: string
          rating?: number
          role?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          quote?: string
          rating?: number
          role?: string
          sort_order?: number
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          about_text: string
          address: string
          announcement_enabled: boolean
          announcement_text: string
          close_time: string
          footer_text: string
          hero_banner_url: string | null
          hero_subtitle: string
          hero_title: string
          id: boolean
          instagram_url: string
          logo_url: string | null
          maps_url: string
          open_time: string
          phone: string
          store_name: string
          store_override: string
          tagline: string
          time_zone: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          about_text?: string
          address?: string
          announcement_enabled?: boolean
          announcement_text?: string
          close_time?: string
          footer_text?: string
          hero_banner_url?: string | null
          hero_subtitle?: string
          hero_title?: string
          id?: boolean
          instagram_url?: string
          logo_url?: string | null
          maps_url?: string
          open_time?: string
          phone?: string
          store_name?: string
          store_override?: string
          tagline?: string
          time_zone?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          about_text?: string
          address?: string
          announcement_enabled?: boolean
          announcement_text?: string
          close_time?: string
          footer_text?: string
          hero_banner_url?: string | null
          hero_subtitle?: string
          hero_title?: string
          id?: boolean
          instagram_url?: string
          logo_url?: string | null
          maps_url?: string
          open_time?: string
          phone?: string
          store_name?: string
          store_override?: string
          tagline?: string
          time_zone?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
      order_status:
        | "Pending"
        | "Accepted"
        | "Preparing"
        | "Ready"
        | "Completed"
        | "Cancelled"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin"],
      order_status: [
        "Pending",
        "Accepted",
        "Preparing",
        "Ready",
        "Completed",
        "Cancelled",
      ],
    },
  },
} as const
