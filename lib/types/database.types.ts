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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      allergies: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          patient_id: string
          reaction: string | null
          source_document_id: string | null
          substance: string
          verification_status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          patient_id: string
          reaction?: string | null
          source_document_id?: string | null
          substance: string
          verification_status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          patient_id?: string
          reaction?: string | null
          source_document_id?: string | null
          substance?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allergies_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          created_at: string | null
          document_id: string | null
          event_type: string
          id: string
          metadata: Json | null
          patient_id: string | null
          share_id: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          share_id?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          share_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "record_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      conditions: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
          patient_id: string
          source_document_id: string | null
          status: string | null
          verification_status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
          patient_id: string
          source_document_id?: string | null
          status?: string | null
          verification_status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          patient_id?: string
          source_document_id?: string | null
          status?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conditions_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          document_date: string | null
          document_type: string | null
          extracted_data: Json | null
          extraction_status: string | null
          id: string
          metadata: Json | null
          mime_type: string
          original_filename: string
          patient_id: string
          provider_name: string | null
          storage_path: string
          verification_status: string | null
        }
        Insert: {
          created_at?: string | null
          document_date?: string | null
          document_type?: string | null
          extracted_data?: Json | null
          extraction_status?: string | null
          id?: string
          metadata?: Json | null
          mime_type: string
          original_filename: string
          patient_id: string
          provider_name?: string | null
          storage_path: string
          verification_status?: string | null
        }
        Update: {
          created_at?: string | null
          document_date?: string | null
          document_type?: string | null
          extracted_data?: Json | null
          extraction_status?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string
          original_filename?: string
          patient_id?: string
          provider_name?: string | null
          storage_path?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      lab_results: {
        Row: {
          created_at: string | null
          id: string
          is_abnormal: boolean | null
          metadata: Json | null
          normalized_test_name: string | null
          patient_id: string
          reference_range: string | null
          result_value: string | null
          source_document_id: string | null
          test_date: string | null
          test_name: string
          unit: string | null
          verification_status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_abnormal?: boolean | null
          metadata?: Json | null
          normalized_test_name?: string | null
          patient_id: string
          reference_range?: string | null
          result_value?: string | null
          source_document_id?: string | null
          test_date?: string | null
          test_name: string
          unit?: string | null
          verification_status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_abnormal?: boolean | null
          metadata?: Json | null
          normalized_test_name?: string | null
          patient_id?: string
          reference_range?: string | null
          result_value?: string | null
          source_document_id?: string | null
          test_date?: string | null
          test_name?: string
          unit?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_events: {
        Row: {
          created_at: string | null
          document_id: string | null
          event_date: string | null
          event_type: string
          id: string
          metadata: Json | null
          patient_id: string
          structured_data: Json | null
          summary: string | null
          title: string
          verification_status: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          event_date?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          patient_id: string
          structured_data?: Json | null
          summary?: string | null
          title: string
          verification_status?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          event_date?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          patient_id?: string
          structured_data?: Json | null
          summary?: string | null
          title?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string | null
          dosage: string | null
          end_date: string | null
          frequency: string | null
          id: string
          ingredient: string | null
          metadata: Json | null
          name: string
          normalized_name: string | null
          patient_id: string
          route: string | null
          source_document_id: string | null
          start_date: string | null
          status: string | null
          strength: string | null
          verification_status: string | null
        }
        Insert: {
          created_at?: string | null
          dosage?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          ingredient?: string | null
          metadata?: Json | null
          name: string
          normalized_name?: string | null
          patient_id: string
          route?: string | null
          source_document_id?: string | null
          start_date?: string | null
          status?: string | null
          strength?: string | null
          verification_status?: string | null
        }
        Update: {
          created_at?: string | null
          dosage?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          ingredient?: string | null
          metadata?: Json | null
          name?: string
          normalized_name?: string | null
          patient_id?: string
          route?: string | null
          source_document_id?: string | null
          start_date?: string | null
          status?: string | null
          strength?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medications_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          blood_group: string | null
          created_at: string | null
          date_of_birth: string | null
          display_name: string
          emergency_contact: Json | null
          metadata: Json | null
          patient_info: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          blood_group?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          display_name: string
          emergency_contact?: Json | null
          metadata?: Json | null
          patient_info?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          blood_group?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string
          emergency_contact?: Json | null
          metadata?: Json | null
          patient_info?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      record_shares: {
        Row: {
          created_at: string | null
          date_range_end: string | null
          date_range_start: string | null
          expires_at: string
          id: string
          metadata: Json | null
          patient_id: string
          pin_hash: string
          revoked_at: string | null
          scope: Json
          token_hash: string
        }
        Insert: {
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          expires_at: string
          id?: string
          metadata?: Json | null
          patient_id: string
          pin_hash: string
          revoked_at?: string | null
          scope: Json
          token_hash: string
        }
        Update: {
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          expires_at?: string
          id?: string
          metadata?: Json | null
          patient_id?: string
          pin_hash?: string
          revoked_at?: string | null
          scope?: Json
          token_hash?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
