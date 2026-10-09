export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          display_name: string;
          date_of_birth: string | null;
          blood_group: string | null;
          emergency_contact: Json | null;
          patient_info: Json | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name: string;
          date_of_birth?: string | null;
          blood_group?: string | null;
          emergency_contact?: Json | null;
          patient_info?: Json | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          display_name?: string;
          date_of_birth?: string | null;
          blood_group?: string | null;
          emergency_contact?: Json | null;
          patient_info?: Json | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          patient_id: string;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          document_type: string | null;
          document_date: string | null;
          provider_name: string | null;
          extraction_status: string | null;
          verification_status: string | null;
          extracted_data: Json | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          document_type?: string | null;
          document_date?: string | null;
          provider_name?: string | null;
          extraction_status?: string | null;
          verification_status?: string | null;
          extracted_data?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          storage_path?: string;
          original_filename?: string;
          mime_type?: string;
          document_type?: string | null;
          document_date?: string | null;
          provider_name?: string | null;
          extraction_status?: string | null;
          verification_status?: string | null;
          extracted_data?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      medical_events: {
        Row: {
          id: string;
          patient_id: string;
          document_id: string | null;
          event_type: string;
          event_date: string | null;
          title: string;
          summary: string | null;
          verification_status: string | null;
          structured_data: Json | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          document_id?: string | null;
          event_type: string;
          event_date?: string | null;
          title: string;
          summary?: string | null;
          verification_status?: string | null;
          structured_data?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          document_id?: string | null;
          event_type?: string;
          event_date?: string | null;
          title?: string;
          summary?: string | null;
          verification_status?: string | null;
          structured_data?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      medications: {
        Row: {
          id: string;
          patient_id: string;
          source_document_id: string | null;
          name: string;
          normalized_name: string | null;
          ingredient: string | null;
          strength: string | null;
          dosage: string | null;
          frequency: string | null;
          route: string | null;
          start_date: string | null;
          end_date: string | null;
          status: string | null;
          verification_status: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          source_document_id?: string | null;
          name: string;
          normalized_name?: string | null;
          ingredient?: string | null;
          strength?: string | null;
          dosage?: string | null;
          frequency?: string | null;
          route?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string | null;
          verification_status?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          source_document_id?: string | null;
          name?: string;
          normalized_name?: string | null;
          ingredient?: string | null;
          strength?: string | null;
          dosage?: string | null;
          frequency?: string | null;
          route?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string | null;
          verification_status?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      allergies: {
        Row: {
          id: string;
          patient_id: string;
          substance: string;
          reaction: string | null;
          verification_status: string | null;
          source_document_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          substance: string;
          reaction?: string | null;
          verification_status?: string | null;
          source_document_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          substance?: string;
          reaction?: string | null;
          verification_status?: string | null;
          source_document_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      conditions: {
        Row: {
          id: string;
          patient_id: string;
          name: string;
          status: string | null;
          verification_status: string | null;
          source_document_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          name: string;
          status?: string | null;
          verification_status?: string | null;
          source_document_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          name?: string;
          status?: string | null;
          verification_status?: string | null;
          source_document_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      lab_results: {
        Row: {
          id: string;
          patient_id: string;
          source_document_id: string | null;
          test_name: string;
          normalized_test_name: string | null;
          result_value: string | null;
          unit: string | null;
          reference_range: string | null;
          is_abnormal: boolean | null;
          test_date: string | null;
          verification_status: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          source_document_id?: string | null;
          test_name: string;
          normalized_test_name?: string | null;
          result_value?: string | null;
          unit?: string | null;
          reference_range?: string | null;
          is_abnormal?: boolean | null;
          test_date?: string | null;
          verification_status?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          source_document_id?: string | null;
          test_name?: string;
          normalized_test_name?: string | null;
          result_value?: string | null;
          unit?: string | null;
          reference_range?: string | null;
          is_abnormal?: boolean | null;
          test_date?: string | null;
          verification_status?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      record_shares: {
        Row: {
          id: string;
          patient_id: string;
          token_hash: string;
          pin_hash: string;
          scope: Json;
          date_range_start: string | null;
          date_range_end: string | null;
          expires_at: string;
          revoked_at: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          token_hash: string;
          pin_hash: string;
          scope: Json;
          date_range_start?: string | null;
          date_range_end?: string | null;
          expires_at: string;
          revoked_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          token_hash?: string;
          pin_hash?: string;
          scope?: Json;
          date_range_start?: string | null;
          date_range_end?: string | null;
          expires_at?: string;
          revoked_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          patient_id: string | null;
          share_id: string | null;
          document_id: string | null;
          event_type: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id?: string | null;
          share_id?: string | null;
          document_id?: string | null;
          event_type: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string | null;
          share_id?: string | null;
          document_id?: string | null;
          event_type?: string;
          metadata?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
