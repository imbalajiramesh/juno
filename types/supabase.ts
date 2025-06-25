export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type CustomerStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed_won' | 'closed_lost';
export type CustomerSubStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      alex_call_logs: {
        Row: {
          call_recording_url: string | null
          call_summary: string | null
          call_transcript: string | null
          created_at: string | null
          customer_id: string | null
          duration_minutes: string | null
          id: string
        }
        Insert: {
          call_recording_url?: string | null
          call_summary?: string | null
          call_transcript?: string | null
          created_at?: string | null
          customer_id?: string | null
          duration_minutes?: string | null
          id?: string
        }
        Update: {
          call_recording_url?: string | null
          call_summary?: string | null
          call_transcript?: string | null
          created_at?: string | null
          customer_id?: string | null
          duration_minutes?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "Alex Call Logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      alex_email_logs: {
        Row: {
          created_at: string | null
          customer_id: string | null
          email_attachment_url: string | null
          email_body: string | null
          email_subject: string | null
          email_summary: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          email_attachment_url?: string | null
          email_body?: string | null
          email_subject?: string | null
          email_summary?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          email_attachment_url?: string | null
          email_body?: string | null
          email_subject?: string | null
          email_summary?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alex_email_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      alex_sms_logs: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          sms_attachment_url: string | null
          sms_content: string | null
          sms_summary: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          sms_attachment_url?: string | null
          sms_content?: string | null
          sms_summary?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          sms_attachment_url?: string | null
          sms_content?: string | null
          sms_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alex_sms_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone_number: string | null;
          status: CustomerStatus;
          sub_status: CustomerSubStatus | null;
          user_account_id: string | null;
          last_interaction: string | null;
          ac_age: string | null;
          ac_ownership: string | null;
          ac_rent_amount: number | null;
          address: string | null;
          age: string | null;
          applied_for_program: boolean | null;
          attic_insulation: string | null;
          furnace_age: string | null;
          furnace_ownership: string | null;
          furnace_rent_amount: number | null;
          gas_bill: number | null;
          home_age: string | null;
          hydro_bill: number | null;
          knows_about_program: boolean | null;
          ownership_status: string | null;
          water_heater_age: string | null;
          water_heater_ownership: string | null;
          water_heater_rent_amount: number | null;
          zip_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone_number?: string | null;
          status?: CustomerStatus;
          sub_status?: CustomerSubStatus | null;
          user_account_id?: string | null;
          last_interaction?: string | null;
          ac_age?: string | null;
          ac_ownership?: string | null;
          ac_rent_amount?: number | null;
          address?: string | null;
          age?: string | null;
          applied_for_program?: boolean | null;
          attic_insulation?: string | null;
          furnace_age?: string | null;
          furnace_ownership?: string | null;
          furnace_rent_amount?: number | null;
          gas_bill?: number | null;
          home_age?: string | null;
          hydro_bill?: number | null;
          knows_about_program?: boolean | null;
          ownership_status?: string | null;
          water_heater_age?: string | null;
          water_heater_ownership?: string | null;
          water_heater_rent_amount?: number | null;
          zip_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone_number?: string | null;
          status?: CustomerStatus;
          sub_status?: CustomerSubStatus | null;
          user_account_id?: string | null;
          last_interaction?: string | null;
          ac_age?: string | null;
          ac_ownership?: string | null;
          ac_rent_amount?: number | null;
          address?: string | null;
          age?: string | null;
          applied_for_program?: boolean | null;
          attic_insulation?: string | null;
          furnace_age?: string | null;
          furnace_ownership?: string | null;
          furnace_rent_amount?: number | null;
          gas_bill?: number | null;
          home_age?: string | null;
          hydro_bill?: number | null;
          knows_about_program?: boolean | null;
          ownership_status?: string | null;
          water_heater_age?: string | null;
          water_heater_ownership?: string | null;
          water_heater_rent_amount?: number | null;
          zip_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
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
          customer_id: string | null
          details: string | null
          id: string
          interaction_date: string | null
          interaction_type: string | null
        }
        Insert: {
          customer_id?: string | null
          details?: string | null
          id?: string
          interaction_date?: string | null
          interaction_type?: string | null
        }
        Update: {
          customer_id?: string | null
          details?: string | null
          id?: string
          interaction_date?: string | null
          interaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          role_name: string
        }
        Insert: {
          id?: string
          role_name: string
        }
        Update: {
          id?: string
          role_name?: string
        }
        Relationships: []
      }
      user_accounts: {
        Row: {
          address: string | null
          appointments_till_date: string | null
          auth_id: string
          calls_made_till_date: string | null
          date_of_joining: string | null
          deals_closed_till_date: string | null
          first_name: string | null
          id: string
          last_name: string | null
          revenue_till_date: string | null
          role_id: string | null
          slug: string | null
          status: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          appointments_till_date?: string | null
          auth_id: string
          calls_made_till_date?: string | null
          date_of_joining?: string | null
          deals_closed_till_date?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          revenue_till_date?: string | null
          role_id?: string | null
          slug?: string | null
          status?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          appointments_till_date?: string | null
          auth_id?: string
          calls_made_till_date?: string | null
          date_of_joining?: string | null
          deals_closed_till_date?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          revenue_till_date?: string | null
          role_id?: string | null
          slug?: string | null
          status?: string | null
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      customer_status: CustomerStatus;
      customer_sub_status: CustomerSubStatus;
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
