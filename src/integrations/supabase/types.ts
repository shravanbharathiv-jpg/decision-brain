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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      datasets: {
        Row: {
          column_count: number | null
          created_at: string
          file_size: number | null
          file_type: string
          id: string
          name: string
          raw_data: string | null
          row_count: number | null
          storage_path: string | null
          user_id: string
        }
        Insert: {
          column_count?: number | null
          created_at?: string
          file_size?: number | null
          file_type: string
          id?: string
          name: string
          raw_data?: string | null
          row_count?: number | null
          storage_path?: string | null
          user_id: string
        }
        Update: {
          column_count?: number | null
          created_at?: string
          file_size?: number | null
          file_type?: string
          id?: string
          name?: string
          raw_data?: string | null
          row_count?: number | null
          storage_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      decision_analyses: {
        Row: {
          blind_spots: Json | null
          case_id: string
          created_at: string
          decision_paths: Json | null
          effects_tradeoffs: Json | null
          follow_up_questions: Json | null
          id: string
          key_arguments: Json | null
          probability_reasoning: string | null
          recommended_path: string | null
          summary: string | null
          user_id: string
        }
        Insert: {
          blind_spots?: Json | null
          case_id: string
          created_at?: string
          decision_paths?: Json | null
          effects_tradeoffs?: Json | null
          follow_up_questions?: Json | null
          id?: string
          key_arguments?: Json | null
          probability_reasoning?: string | null
          recommended_path?: string | null
          summary?: string | null
          user_id: string
        }
        Update: {
          blind_spots?: Json | null
          case_id?: string
          created_at?: string
          decision_paths?: Json | null
          effects_tradeoffs?: Json | null
          follow_up_questions?: Json | null
          id?: string
          key_arguments?: Json | null
          probability_reasoning?: string | null
          recommended_path?: string | null
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_analyses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "decision_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_cases: {
        Row: {
          additional_text: string | null
          constraints: string | null
          context: string | null
          created_at: string
          description: string
          id: string
          objectives: string | null
          risks: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_text?: string | null
          constraints?: string | null
          context?: string | null
          created_at?: string
          description: string
          id?: string
          objectives?: string | null
          risks?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_text?: string | null
          constraints?: string | null
          context?: string | null
          created_at?: string
          description?: string
          id?: string
          objectives?: string | null
          risks?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      decision_revisions: {
        Row: {
          case_id: string
          content: string | null
          created_at: string
          id: string
          metadata: Json | null
          revision_type: string
          user_id: string
        }
        Insert: {
          case_id: string
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          revision_type: string
          user_id: string
        }
        Update: {
          case_id?: string
          content?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          revision_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_revisions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "decision_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          anomalies: Json | null
          charts_data: Json | null
          created_at: string
          dataset_id: string | null
          full_content: Json | null
          id: string
          insights: Json | null
          processing_time_ms: number | null
          summary: string | null
          tier_generated: string
          title: string
          user_id: string
        }
        Insert: {
          anomalies?: Json | null
          charts_data?: Json | null
          created_at?: string
          dataset_id?: string | null
          full_content?: Json | null
          id?: string
          insights?: Json | null
          processing_time_ms?: number | null
          summary?: string | null
          tier_generated: string
          title: string
          user_id: string
        }
        Update: {
          anomalies?: Json | null
          charts_data?: Json | null
          created_at?: string
          dataset_id?: string | null
          full_content?: Json | null
          id?: string
          insights?: Json | null
          processing_time_ms?: number | null
          summary?: string | null
          tier_generated?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_simulations: {
        Row: {
          best_case: Json | null
          case_id: string
          created_at: string
          expected_value: Json | null
          id: string
          probability_data: Json | null
          simulation_results: Json | null
          user_id: string
          worst_case: Json | null
        }
        Insert: {
          best_case?: Json | null
          case_id: string
          created_at?: string
          expected_value?: Json | null
          id?: string
          probability_data?: Json | null
          simulation_results?: Json | null
          user_id: string
          worst_case?: Json | null
        }
        Update: {
          best_case?: Json | null
          case_id?: string
          created_at?: string
          expected_value?: Json | null
          id?: string
          probability_data?: Json | null
          simulation_results?: Json | null
          user_id?: string
          worst_case?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_simulations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "decision_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          case_id: string
          created_at: string
          id: string
          invited_user_id: string
          role: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          invited_user_id: string
          role?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          invited_user_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "decision_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { check_user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          check_user_id: string
          required_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "free" | "pro" | "premium"
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
      app_role: ["free", "pro", "premium"],
    },
  },
} as const
