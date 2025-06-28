export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      alex_add_minutes: {
        Row: {
          created_at: string
          id: string
          total_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          total_minutes?: number
          updated_at: string
        }
        Update: {
          created_at?: string
          id?: string
          total_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      credit_balances: {
        Row: {
          id: string
          tenant_id: string
          balance: number
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          balance?: number
          last_updated?: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          balance?: number
          last_updated?: string
          created_at?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          id: string
          tenant_id: string
          transaction_type: string
          amount: number
          description: string
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          transaction_type: string
          amount: number
          description: string
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          transaction_type?: string
          amount?: number
          description?: string
          reference_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      juno_call_logs: {
        Row: {
          ai_next_steps: string | null
          ai_summary: string | null
          call_recording_url: string | null
          call_summary: string | null
          call_transcript: string | null
          created_at: string
          customer_id: string
          duration_minutes: number | null
          id: string
          tenant_id: string
          twilio_call_sid: string | null
          vapi_call_id: string | null
          voice_agent_id: string | null
          updated_at: string
        }
        Insert: {
          ai_next_steps?: string | null
          ai_summary?: string | null
          call_recording_url?: string | null
          call_summary?: string | null
          call_transcript?: string | null
          created_at?: string
          customer_id: string
          duration_minutes?: number | null
          id: string
          tenant_id: string
          twilio_call_sid?: string | null
          vapi_call_id?: string | null
          voice_agent_id?: string | null
          updated_at: string
        }
        Update: {
          ai_next_steps?: string | null
          ai_summary?: string | null
          call_recording_url?: string | null
          call_summary?: string | null
          call_transcript?: string | null
          created_at?: string
          customer_id?: string
          duration_minutes?: number | null
          id?: string
          tenant_id?: string
          twilio_call_sid?: string | null
          vapi_call_id?: string | null
          voice_agent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "juno_call_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "juno_call_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      juno_email_logs: {
        Row: {
          ai_next_steps: string | null
          ai_summary: string | null
          created_at: string
          customer_id: string
          email_attachment_url: string | null
          email_body: string | null
          email_subject: string | null
          email_summary: string | null
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ai_next_steps?: string | null
          ai_summary?: string | null
          created_at?: string
          customer_id: string
          email_attachment_url?: string | null
          email_body?: string | null
          email_subject?: string | null
          email_summary?: string | null
          id: string
          tenant_id: string
          updated_at: string
        }
        Update: {
          ai_next_steps?: string | null
          ai_summary?: string | null
          created_at?: string
          customer_id?: string
          email_attachment_url?: string | null
          email_body?: string | null
          email_subject?: string | null
          email_summary?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "juno_email_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "juno_email_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      juno_sms_logs: {
        Row: {
          ai_next_steps: string | null
          ai_summary: string | null
          created_at: string
          customer_id: string
          id: string
          sms_attachment_url: string | null
          sms_content: string | null
          sms_summary: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ai_next_steps?: string | null
          ai_summary?: string | null
          created_at?: string
          customer_id: string
          id: string
          sms_attachment_url?: string | null
          sms_content?: string | null
          sms_summary?: string | null
          tenant_id: string
          updated_at: string
        }
        Update: {
          ai_next_steps?: string | null
          ai_summary?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          sms_attachment_url?: string | null
          sms_content?: string | null
          sms_summary?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "juno_sms_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "juno_sms_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alex_tasks: {
        Row: {
          created_at: string
          id: string
          task_customerId: string | null
          task_description: string | null
          task_name: string
          task_schedule: string | null
          task_status: string
          task_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          task_customerId?: string | null
          task_description?: string | null
          task_name: string
          task_schedule?: string | null
          task_status?: string
          task_type: string
          tenant_id: string
          updated_at: string
        }
        Update: {
          created_at?: string
          id?: string
          task_customerId?: string | null
          task_description?: string | null
          task_name?: string
          task_schedule?: string | null
          task_status?: string
          task_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alex_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          created_at: string
          id: string
          label: string
          name: string
          options: Json | null
          required: boolean
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          label: string
          name: string
          options?: Json | null
          required?: boolean
          tenant_id: string
          type: string
          updated_at: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          name?: string
          options?: Json | null
          required?: boolean
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          age: string | null
          ai_interaction_summary: string | null
          ai_next_steps: string | null
          created_at: string
          custom_fields: Json | null
          email: string | null
          first_name: string
          id: string
          juno_call_duration_total: number | null
          last_juno_call_date: string | null
          last_juno_interaction_date: string | null
          last_juno_interaction_type: string | null
          last_name: string
          phone_number: string | null
          status: string | null
          tenant_id: string
          total_juno_calls: number | null
          total_juno_emails: number | null
          total_juno_sms: number | null
          updated_at: string
          user_account_id: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          age?: string | null
          ai_interaction_summary?: string | null
          ai_next_steps?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          first_name: string
          id: string
          juno_call_duration_total?: number | null
          last_juno_call_date?: string | null
          last_juno_interaction_date?: string | null
          last_juno_interaction_type?: string | null
          last_name: string
          phone_number?: string | null
          status?: string | null
          tenant_id: string
          total_juno_calls?: number | null
          total_juno_emails?: number | null
          total_juno_sms?: number | null
          updated_at: string
          user_account_id?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          age?: string | null
          ai_interaction_summary?: string | null
          ai_next_steps?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          first_name?: string
          id?: string
          juno_call_duration_total?: number | null
          last_juno_call_date?: string | null
          last_juno_interaction_date?: string | null
          last_juno_interaction_type?: string | null
          last_name?: string
          phone_number?: string | null
          status?: string | null
          tenant_id?: string
          total_juno_calls?: number | null
          total_juno_emails?: number | null
          total_juno_sms?: number | null
          updated_at?: string
          user_account_id?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_user_account_id_fkey"
            columns: ["user_account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          ai_next_steps: string | null
          ai_summary: string | null
          created_at: string
          customer_id: string
          details: string | null
          id: string
          interaction_date: string | null
          interaction_source: string | null
          interaction_type: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ai_next_steps?: string | null
          ai_summary?: string | null
          created_at?: string
          customer_id: string
          details?: string | null
          id: string
          interaction_date?: string | null
          interaction_source?: string | null
          interaction_type?: string | null
          tenant_id: string
          updated_at: string
        }
        Update: {
          ai_next_steps?: string | null
          ai_summary?: string | null
          created_at?: string
          customer_id?: string
          details?: string | null
          id?: string
          interaction_date?: string | null
          interaction_source?: string | null
          interaction_type?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          role_name: string
          updated_at: string
        }
        Update: {
          created_at?: string
          id?: string
          role_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          status: string
          task_type: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id: string
          status?: string
          task_type: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          task_type?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          clerk_org_id: string
          created_at: string
          id: string
          name: string
          schema_name: string
          updated_at: string
        }
        Insert: {
          clerk_org_id: string
          created_at?: string
          id: string
          name: string
          schema_name: string
          updated_at: string
        }
        Update: {
          clerk_org_id?: string
          created_at?: string
          id?: string
          name?: string
          schema_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenant_phone_numbers: {
        Row: {
          id: string
          tenant_id: string
          phone_number: string
          twilio_sid: string
          twilio_account_sid: string | null
          vapi_phone_number_id: string | null
          status: string
          monthly_cost_credits: number
          setup_cost_credits: number
          purchased_at: string
          next_billing_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          phone_number: string
          twilio_sid: string
          twilio_account_sid?: string | null
          vapi_phone_number_id?: string | null
          status?: string
          monthly_cost_credits: number
          setup_cost_credits?: number
          purchased_at?: string
          next_billing_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          phone_number?: string
          twilio_sid?: string
          twilio_account_sid?: string | null
          vapi_phone_number_id?: string | null
          status?: string
          monthly_cost_credits?: number
          setup_cost_credits?: number
          purchased_at?: string
          next_billing_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      voice_agents: {
        Row: {
          id: string
          tenant_id: string
          name: string
          vapi_agent_id: string | null
          vapi_org_id: string | null
          phone_number_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          vapi_agent_id?: string | null
          vapi_org_id?: string | null
          phone_number_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          vapi_agent_id?: string | null
          vapi_org_id?: string | null
          phone_number_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_accounts: {
        Row: {
          address: string | null
          appointments_till_date: number | null
          auth_id: string
          calls_made_till_date: number | null
          created_at: string
          date_of_joining: string | null
          deals_closed_till_date: number | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          revenue_till_date: number | null
          role_id: string | null
          slug: string | null
          status: string | null
          tenant_id: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          appointments_till_date?: number | null
          auth_id: string
          calls_made_till_date?: number | null
          created_at?: string
          date_of_joining?: string | null
          deals_closed_till_date?: number | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          revenue_till_date?: number | null
          role_id?: string | null
          slug?: string | null
          status?: string | null
          tenant_id: string
          updated_at: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          appointments_till_date?: number | null
          auth_id?: string
          calls_made_till_date?: number | null
          created_at?: string
          date_of_joining?: string | null
          deals_closed_till_date?: number | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          revenue_till_date?: number | null
          role_id?: string | null
          slug?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_accounts_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_tenant_credit_balance: {
        Args: {
          tenant_id_param: string
        }
        Returns: number
      }
      update_credits: {
        Args: {
          tenant_id_param: string
          amount_param: number
          transaction_type_param: string
          description_param: string
          reference_id_param?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

