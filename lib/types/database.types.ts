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
          created_at: string
          extraction_id: string | null
          id: string
          metadata: Json | null
          patient_id: string
          reaction: string | null
          source_document_id: string | null
          source_excerpt: string | null
          source_page: number | null
          substance: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          extraction_id?: string | null
          id?: string
          metadata?: Json | null
          patient_id: string
          reaction?: string | null
          source_document_id?: string | null
          source_excerpt?: string | null
          source_page?: number | null
          substance: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          extraction_id?: string | null
          id?: string
          metadata?: Json | null
          patient_id?: string
          reaction?: string | null
          source_document_id?: string | null
          source_excerpt?: string | null
          source_page?: number | null
          substance?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "allergies_extraction_fk"
            columns: ["extraction_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "document_extractions"
            referencedColumns: ["id", "patient_id"]
          },
          {
            foreignKeyName: "allergies_source_document_fk"
            columns: ["source_document_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "patient_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          created_at: string
          document_id: string | null
          event_type: string
          id: string
          metadata: Json | null
          patient_id: string | null
          share_id: string | null
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          patient_id?: string | null
          share_id?: string | null
        }
        Update: {
          created_at?: string
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
          created_at: string
          diagnosed_date: string | null
          extraction_id: string | null
          id: string
          metadata: Json | null
          name: string
          patient_id: string
          source_document_id: string | null
          source_excerpt: string | null
          source_page: number | null
          status: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          diagnosed_date?: string | null
          extraction_id?: string | null
          id?: string
          metadata?: Json | null
          name: string
          patient_id: string
          source_document_id?: string | null
          source_excerpt?: string | null
          source_page?: number | null
          status?: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          diagnosed_date?: string | null
          extraction_id?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          patient_id?: string
          source_document_id?: string | null
          source_excerpt?: string | null
          source_page?: number | null
          status?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conditions_extraction_fk"
            columns: ["extraction_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "document_extractions"
            referencedColumns: ["id", "patient_id"]
          },
          {
            foreignKeyName: "conditions_source_document_fk"
            columns: ["source_document_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "patient_id"]
          },
        ]
      }
      document_extractions: {
        Row: {
          ai_model: string | null
          ai_provider: string | null
          completed_at: string | null
          created_at: string
          document_id: string
          error_code: string | null
          id: string
          is_simulated: boolean
          ocr_provider: string | null
          output: Json | null
          patient_id: string
          schema_version: string
          status: string
          text_source: string | null
          updated_at: string
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          completed_at?: string | null
          created_at?: string
          document_id: string
          error_code?: string | null
          id?: string
          is_simulated?: boolean
          ocr_provider?: string | null
          output?: Json | null
          patient_id: string
          schema_version: string
          status?: string
          text_source?: string | null
          updated_at?: string
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          completed_at?: string | null
          created_at?: string
          document_id?: string
          error_code?: string | null
          id?: string
          is_simulated?: boolean
          ocr_provider?: string | null
          output?: Json | null
          patient_id?: string
          schema_version?: string
          status?: string
          text_source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_extractions_document_fk"
            columns: ["document_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "patient_id"]
          },
        ]
      }
      document_pages: {
        Row: {
          content: string
          created_at: string
          document_id: string
          ocr_confidence: number | null
          page_number: number
          patient_id: string
          text_source: string
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
          ocr_confidence?: number | null
          page_number: number
          patient_id: string
          text_source: string
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
          ocr_confidence?: number | null
          page_number?: number
          patient_id?: string
          text_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_pages_document_fk"
            columns: ["document_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "patient_id"]
          },
        ]
      }
      documents: {
        Row: {
          cancelled_at: string | null
          content_sha256: string | null
          created_at: string
          document_date: string | null
          document_type: string | null
          extracted_data: Json | null
          extraction_status: string
          facility_name: string | null
          id: string
          metadata: Json | null
          mime_type: string
          original_filename: string
          page_count: number | null
          patient_id: string
          processed_at: string | null
          processing_attempts: number
          processing_error: string | null
          processing_started_at: string | null
          provider_name: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          cancelled_at?: string | null
          content_sha256?: string | null
          created_at?: string
          document_date?: string | null
          document_type?: string | null
          extracted_data?: Json | null
          extraction_status?: string
          facility_name?: string | null
          id?: string
          metadata?: Json | null
          mime_type: string
          original_filename: string
          page_count?: number | null
          patient_id: string
          processed_at?: string | null
          processing_attempts?: number
          processing_error?: string | null
          processing_started_at?: string | null
          provider_name?: string | null
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          cancelled_at?: string | null
          content_sha256?: string | null
          created_at?: string
          document_date?: string | null
          document_type?: string | null
          extracted_data?: Json | null
          extraction_status?: string
          facility_name?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string
          original_filename?: string
          page_count?: number | null
          patient_id?: string
          processed_at?: string | null
          processing_attempts?: number
          processing_error?: string | null
          processing_started_at?: string | null
          provider_name?: string | null
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      duplicate_decisions: {
        Row: {
          created_at: string
          decision: string
          id: string
          patient_id: string
          record_ids: string[]
          record_kind: string
        }
        Insert: {
          created_at?: string
          decision?: string
          id?: string
          patient_id: string
          record_ids: string[]
          record_kind: string
        }
        Update: {
          created_at?: string
          decision?: string
          id?: string
          patient_id?: string
          record_ids?: string[]
          record_kind?: string
        }
        Relationships: []
      }
      emergency_access: {
        Row: {
          consent_given_at: string
          created_at: string
          expires_at: string
          id: string
          last_accessed_at: string | null
          medication_ids: string[]
          patient_id: string
          patient_note: string | null
          revoked_at: string | null
          show_allergies: boolean
          show_blood_group: boolean
          show_conditions: boolean
          show_date_of_birth: boolean
          show_emergency_contact: boolean
          token_hash: string
          updated_at: string
        }
        Insert: {
          consent_given_at: string
          created_at?: string
          expires_at: string
          id?: string
          last_accessed_at?: string | null
          medication_ids?: string[]
          patient_id: string
          patient_note?: string | null
          revoked_at?: string | null
          show_allergies?: boolean
          show_blood_group?: boolean
          show_conditions?: boolean
          show_date_of_birth?: boolean
          show_emergency_contact?: boolean
          token_hash: string
          updated_at?: string
        }
        Update: {
          consent_given_at?: string
          created_at?: string
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          medication_ids?: string[]
          patient_id?: string
          patient_note?: string | null
          revoked_at?: string | null
          show_allergies?: boolean
          show_blood_group?: boolean
          show_conditions?: boolean
          show_date_of_birth?: boolean
          show_emergency_contact?: boolean
          token_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      lab_results: {
        Row: {
          created_at: string
          extraction_id: string | null
          id: string
          is_abnormal: boolean | null
          lab_name: string | null
          metadata: Json | null
          normalized_test_name: string | null
          patient_id: string
          reference_range: string | null
          report_flag: string | null
          result_value: string | null
          source_document_id: string | null
          source_excerpt: string | null
          source_page: number | null
          test_date: string | null
          test_name: string
          unit: string | null
          updated_at: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          extraction_id?: string | null
          id?: string
          is_abnormal?: boolean | null
          lab_name?: string | null
          metadata?: Json | null
          normalized_test_name?: string | null
          patient_id: string
          reference_range?: string | null
          report_flag?: string | null
          result_value?: string | null
          source_document_id?: string | null
          source_excerpt?: string | null
          source_page?: number | null
          test_date?: string | null
          test_name: string
          unit?: string | null
          updated_at?: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          extraction_id?: string | null
          id?: string
          is_abnormal?: boolean | null
          lab_name?: string | null
          metadata?: Json | null
          normalized_test_name?: string | null
          patient_id?: string
          reference_range?: string | null
          report_flag?: string | null
          result_value?: string | null
          source_document_id?: string | null
          source_excerpt?: string | null
          source_page?: number | null
          test_date?: string | null
          test_name?: string
          unit?: string | null
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_extraction_fk"
            columns: ["extraction_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "document_extractions"
            referencedColumns: ["id", "patient_id"]
          },
          {
            foreignKeyName: "lab_results_source_document_fk"
            columns: ["source_document_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "patient_id"]
          },
        ]
      }
      medical_events: {
        Row: {
          created_at: string
          document_id: string | null
          event_date: string | null
          event_type: string
          extraction_id: string | null
          facility_name: string | null
          id: string
          metadata: Json | null
          patient_id: string
          provider_name: string | null
          source_excerpt: string | null
          source_page: number | null
          structured_data: Json | null
          summary: string | null
          title: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          event_date?: string | null
          event_type: string
          extraction_id?: string | null
          facility_name?: string | null
          id?: string
          metadata?: Json | null
          patient_id: string
          provider_name?: string | null
          source_excerpt?: string | null
          source_page?: number | null
          structured_data?: Json | null
          summary?: string | null
          title: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          event_date?: string | null
          event_type?: string
          extraction_id?: string | null
          facility_name?: string | null
          id?: string
          metadata?: Json | null
          patient_id?: string
          provider_name?: string | null
          source_excerpt?: string | null
          source_page?: number | null
          structured_data?: Json | null
          summary?: string | null
          title?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_events_extraction_fk"
            columns: ["extraction_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "document_extractions"
            referencedColumns: ["id", "patient_id"]
          },
          {
            foreignKeyName: "medical_events_source_document_fk"
            columns: ["document_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "patient_id"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string
          dosage: string | null
          duration: string | null
          end_date: string | null
          extraction_id: string | null
          facility_name: string | null
          frequency: string | null
          id: string
          ingredient: string | null
          instructions: string | null
          metadata: Json | null
          name: string
          normalized_name: string | null
          patient_id: string
          prescriber_name: string | null
          route: string | null
          source_document_id: string | null
          source_excerpt: string | null
          source_page: number | null
          start_date: string | null
          status: string
          strength: string | null
          updated_at: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          duration?: string | null
          end_date?: string | null
          extraction_id?: string | null
          facility_name?: string | null
          frequency?: string | null
          id?: string
          ingredient?: string | null
          instructions?: string | null
          metadata?: Json | null
          name: string
          normalized_name?: string | null
          patient_id: string
          prescriber_name?: string | null
          route?: string | null
          source_document_id?: string | null
          source_excerpt?: string | null
          source_page?: number | null
          start_date?: string | null
          status?: string
          strength?: string | null
          updated_at?: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          dosage?: string | null
          duration?: string | null
          end_date?: string | null
          extraction_id?: string | null
          facility_name?: string | null
          frequency?: string | null
          id?: string
          ingredient?: string | null
          instructions?: string | null
          metadata?: Json | null
          name?: string
          normalized_name?: string | null
          patient_id?: string
          prescriber_name?: string | null
          route?: string | null
          source_document_id?: string | null
          source_excerpt?: string | null
          source_page?: number | null
          start_date?: string | null
          status?: string
          strength?: string | null
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_extraction_fk"
            columns: ["extraction_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "document_extractions"
            referencedColumns: ["id", "patient_id"]
          },
          {
            foreignKeyName: "medications_source_document_fk"
            columns: ["source_document_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "patient_id"]
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
          consent_given_at: string | null
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          document_ids: string[]
          expires_at: string
          failed_pin_attempts: number
          id: string
          label: string | null
          last_accessed_at: string | null
          locked_until: string | null
          metadata: Json | null
          patient_id: string
          pin_hash: string
          revoked_at: string | null
          scope: Json
          token_hash: string
        }
        Insert: {
          consent_given_at?: string | null
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          document_ids?: string[]
          expires_at: string
          failed_pin_attempts?: number
          id?: string
          label?: string | null
          last_accessed_at?: string | null
          locked_until?: string | null
          metadata?: Json | null
          patient_id: string
          pin_hash: string
          revoked_at?: string | null
          scope: Json
          token_hash: string
        }
        Update: {
          consent_given_at?: string | null
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          document_ids?: string[]
          expires_at?: string
          failed_pin_attempts?: number
          id?: string
          label?: string | null
          last_accessed_at?: string | null
          locked_until?: string | null
          metadata?: Json | null
          patient_id?: string
          pin_hash?: string
          revoked_at?: string | null
          scope?: Json
          token_hash?: string
        }
        Relationships: []
      }
      share_access_logs: {
        Row: {
          emergency_access_id: string | null
          id: string
          ip_hash: string | null
          occurred_at: string
          outcome: string
          patient_id: string
          share_id: string | null
          user_agent: string | null
        }
        Insert: {
          emergency_access_id?: string | null
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          outcome: string
          patient_id: string
          share_id?: string | null
          user_agent?: string | null
        }
        Update: {
          emergency_access_id?: string | null
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          outcome?: string
          patient_id?: string
          share_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_access_logs_emergency_fk"
            columns: ["emergency_access_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "emergency_access"
            referencedColumns: ["id", "patient_id"]
          },
          {
            foreignKeyName: "share_access_logs_share_fk"
            columns: ["share_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "record_shares"
            referencedColumns: ["id", "patient_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_document_for_processing: {
        Args: { p_document_id: string }
        Returns: {
          cancelled_at: string | null
          content_sha256: string | null
          created_at: string
          document_date: string | null
          document_type: string | null
          extracted_data: Json | null
          extraction_status: string
          facility_name: string | null
          id: string
          metadata: Json | null
          mime_type: string
          original_filename: string
          page_count: number | null
          patient_id: string
          processed_at: string | null
          processing_attempts: number
          processing_error: string | null
          processing_started_at: string | null
          provider_name: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string
          verification_status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "documents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      confirm_extraction: {
        Args: { p_extraction_id: string; p_review: Json }
        Returns: string
      }
      delete_health_record: {
        Args: { p_id: string; p_kind: string }
        Returns: undefined
      }
      dismiss_duplicate: {
        Args: { p_kind: string; p_record_ids: string[] }
        Returns: undefined
      }
      record_audit_event: {
        Args: {
          p_details?: Json
          p_document_id?: string
          p_event_type: string
          p_share_id?: string
        }
        Returns: string
      }
      update_medication: {
        Args: {
          p_end_date: string
          p_medication_id: string
          p_start_date: string
          p_status: string
        }
        Returns: undefined
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
