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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      budgets: {
        Row: {
          category: string
          created_at: string
          household_id: string
          id: string
          limit_amount: number
          period: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          household_id: string
          id?: string
          limit_amount?: number
          period: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          household_id?: string
          id?: string
          limit_amount?: number
          period?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          brand: string | null
          close_day: number
          created_at: string
          credit_limit: number
          due_day: number
          household_id: string
          id: string
          last4: string | null
          name: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          close_day?: number
          created_at?: string
          credit_limit?: number
          due_day?: number
          household_id: string
          id?: string
          last4?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          close_day?: number
          created_at?: string
          credit_limit?: number
          due_day?: number
          household_id?: string
          id?: string
          last4?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          household_id: string
          id: string
          kind: string
          name: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          kind?: string
          name: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          kind?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_cost_payments: {
        Row: {
          created_at: string
          fixed_cost_id: string
          household_id: string
          id: string
          paid: boolean
          paid_by: string | null
          period: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fixed_cost_id: string
          household_id: string
          id?: string
          paid?: boolean
          paid_by?: string | null
          period: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fixed_cost_id?: string
          household_id?: string
          id?: string
          paid?: boolean
          paid_by?: string | null
          period?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_cost_payments_fixed_cost_id_fkey"
            columns: ["fixed_cost_id"]
            isOneToOne: false
            referencedRelation: "fixed_costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_cost_payments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_costs: {
        Row: {
          amount: number
          card_name: string | null
          category: string
          created_at: string
          due_day: number
          household_id: string
          id: string
          months: boolean[]
          name: string
          pay_method: Database["public"]["Enums"]["pay_method"]
          responsible: string
          updated_at: string
        }
        Insert: {
          amount: number
          card_name?: string | null
          category?: string
          created_at?: string
          due_day?: number
          household_id: string
          id?: string
          months?: boolean[]
          name: string
          pay_method?: Database["public"]["Enums"]["pay_method"]
          responsible?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          card_name?: string | null
          category?: string
          created_at?: string
          due_day?: number
          household_id?: string
          id?: string
          months?: boolean[]
          name?: string
          pay_method?: Database["public"]["Enums"]["pay_method"]
          responsible?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_costs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          current_amount: number
          deadline: string | null
          household_id: string
          id: string
          monthly: number
          name: string
          responsible: string
          shared: boolean
          target_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          household_id: string
          id?: string
          monthly?: number
          name: string
          responsible?: string
          shared?: boolean
          target_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          household_id?: string
          id?: string
          monthly?: number
          name?: string
          responsible?: string
          shared?: boolean
          target_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          created_at: string
          date: string
          habit_id: string
          household_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          habit_id: string
          household_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          habit_id?: string
          household_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_logs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          created_at: string
          household_id: string
          id: string
          name: string
          owner_id: string
          privacy: Database["public"]["Enums"]["privacy_level"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          name: string
          owner_id: string
          privacy?: Database["public"]["Enums"]["privacy_level"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          owner_id?: string
          privacy?: Database["public"]["Enums"]["privacy_level"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      installments: {
        Row: {
          card_name: string | null
          category: string
          created_at: string
          household_id: string
          id: string
          installments_count: number
          name: string
          paid_count: number
          pay_method: Database["public"]["Enums"]["pay_method"]
          purchase_date: string
          responsible: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          card_name?: string | null
          category?: string
          created_at?: string
          household_id: string
          id?: string
          installments_count?: number
          name: string
          paid_count?: number
          pay_method?: Database["public"]["Enums"]["pay_method"]
          purchase_date?: string
          responsible?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          card_name?: string | null
          category?: string
          created_at?: string
          household_id?: string
          id?: string
          installments_count?: number
          name?: string
          paid_count?: number
          pay_method?: Database["public"]["Enums"]["pay_method"]
          purchase_date?: string
          responsible?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          created_at: string
          current_value: number
          household_id: string
          id: string
          invested: number
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          household_id: string
          id?: string
          invested?: number
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          household_id?: string
          id?: string
          invested?: number
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          card_id: string | null
          created_at: string
          household_id: string
          id: string
          period: string
          status: Database["public"]["Enums"]["invoice_status"]
          total: number
          updated_at: string
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          household_id: string
          id?: string
          period: string
          status?: Database["public"]["Enums"]["invoice_status"]
          total?: number
          updated_at?: string
        }
        Update: {
          card_id?: string | null
          created_at?: string
          household_id?: string
          id?: string
          period?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string
          household_id: string
          id: string
          kind: Database["public"]["Enums"]["pay_method"]
          name: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          kind?: Database["public"]["Enums"]["pay_method"]
          name: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["pay_method"]
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_scale: number
          avatar_url: string | null
          color: string
          created_at: string
          household_id: string | null
          id: string
          initials: string | null
          name: string
          updated_at: string
        }
        Insert: {
          avatar_scale?: number
          avatar_url?: string | null
          color?: string
          created_at?: string
          household_id?: string | null
          id: string
          initials?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          avatar_scale?: number
          avatar_url?: string | null
          color?: string
          created_at?: string
          household_id?: string | null
          id?: string
          initials?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          category: string
          created_at: string
          date: string
          household_id: string
          id: string
          owner_id: string
          privacy: Database["public"]["Enums"]["privacy_level"]
          time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          date?: string
          household_id: string
          id?: string
          owner_id: string
          privacy?: Database["public"]["Enums"]["privacy_level"]
          time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          date?: string
          household_id?: string
          id?: string
          owner_id?: string
          privacy?: Database["public"]["Enums"]["privacy_level"]
          time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_items: {
        Row: {
          actual_price: number | null
          category: string
          created_at: string
          done: boolean
          household_id: string
          id: string
          list_id: string
          name: string
          price: number
          priority: string
          qty: number
          unit: string
          updated_at: string
        }
        Insert: {
          actual_price?: number | null
          category?: string
          created_at?: string
          done?: boolean
          household_id: string
          id?: string
          list_id: string
          name: string
          price?: number
          priority?: string
          qty?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          actual_price?: number | null
          category?: string
          created_at?: string
          done?: boolean
          household_id?: string
          id?: string
          list_id?: string
          name?: string
          price?: number
          priority?: string
          qty?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          archived: boolean
          created_at: string
          household_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          household_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_lists_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          done: boolean
          due_date: string | null
          household_id: string
          id: string
          owner_id: string
          privacy: Database["public"]["Enums"]["privacy_level"]
          quadrant: Database["public"]["Enums"]["task_quadrant"]
          responsible: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          due_date?: string | null
          household_id: string
          id?: string
          owner_id: string
          privacy?: Database["public"]["Enums"]["privacy_level"]
          quadrant?: Database["public"]["Enums"]["task_quadrant"]
          responsible?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          done?: boolean
          due_date?: string | null
          household_id?: string
          id?: string
          owner_id?: string
          privacy?: Database["public"]["Enums"]["privacy_level"]
          quadrant?: Database["public"]["Enums"]["task_quadrant"]
          responsible?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          card_name: string | null
          category: string
          created_at: string
          created_by: string | null
          date: string
          description: string
          household_id: string
          id: string
          installment_current: number | null
          installment_total: number | null
          is_fixed: boolean
          paid: boolean
          pay_method: Database["public"]["Enums"]["pay_method"]
          responsible: string
          type: Database["public"]["Enums"]["tx_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          card_name?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          household_id: string
          id?: string
          installment_current?: number | null
          installment_total?: number | null
          is_fixed?: boolean
          paid?: boolean
          pay_method?: Database["public"]["Enums"]["pay_method"]
          responsible?: string
          type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          card_name?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          household_id?: string
          id?: string
          installment_current?: number | null
          installment_total?: number | null
          is_fixed?: boolean
          paid?: boolean
          pay_method?: Database["public"]["Enums"]["pay_method"]
          responsible?: string
          type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_household: {
        Args: { household_name: string; my_name: string }
        Returns: string
      }
      current_household_id: { Args: never; Returns: string }
      join_household: {
        Args: { invite: string; my_name: string }
        Returns: string
      }
    }
    Enums: {
      invoice_status: "ABERTA" | "FECHADA" | "VENCIDA" | "PAGA"
      pay_method:
        | "DEBITO"
        | "PIX"
        | "DINHEIRO"
        | "CREDITO"
        | "ALIMENTACAO"
        | "TRANSFERENCIA"
        | "BOLETO"
      privacy_level: "PRIVADO" | "COMPARTILHADO" | "DESAFIO"
      task_quadrant: "FAZER_AGORA" | "AGENDAR" | "DELEGAR" | "ELIMINAR"
      tx_type: "RECEITA" | "DESPESA" | "TRANSFERENCIA" | "INVESTIMENTO"
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
      invoice_status: ["ABERTA", "FECHADA", "VENCIDA", "PAGA"],
      pay_method: [
        "DEBITO",
        "PIX",
        "DINHEIRO",
        "CREDITO",
        "ALIMENTACAO",
        "TRANSFERENCIA",
        "BOLETO",
      ],
      privacy_level: ["PRIVADO", "COMPARTILHADO", "DESAFIO"],
      task_quadrant: ["FAZER_AGORA", "AGENDAR", "DELEGAR", "ELIMINAR"],
      tx_type: ["RECEITA", "DESPESA", "TRANSFERENCIA", "INVESTIMENTO"],
    },
  },
} as const
