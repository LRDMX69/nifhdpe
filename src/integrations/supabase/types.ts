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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_requests: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_intelligence_logs: {
        Row: {
          category: string
          created_at: string
          details: string | null
          id: string
          is_reviewed: boolean
          metadata: Json | null
          organization_id: string
          severity: string
          source_id: string | null
          source_table: string | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          details?: string | null
          id?: string
          is_reviewed?: boolean
          metadata?: Json | null
          organization_id: string
          severity?: string
          source_id?: string | null
          source_table?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          details?: string | null
          id?: string
          is_reviewed?: boolean
          metadata?: Json | null
          organization_id?: string
          severity?: string
          source_id?: string | null
          source_table?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_intelligence_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_summaries: {
        Row: {
          context: string
          created_at: string
          id: string
          metadata: Json | null
          organization_id: string
          summary: string
        }
        Insert: {
          context: string
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id: string
          summary: string
        }
        Update: {
          context?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_summaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          id: string
          organization_id: string
          status: string
          user_id: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          id?: string
          organization_id: string
          status?: string
          user_id: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          id?: string
          organization_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          organization_id: string
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          organization_id: string
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_mode_settings: {
        Row: {
          enabled: boolean
          id: string
          organization_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          id?: string
          organization_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          id?: string
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_mode_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_documents: {
        Row: {
          created_at: string
          created_by: string
          doc_type: string
          expiry_date: string | null
          file_url: string | null
          id: string
          organization_id: string
          project_id: string | null
          status: Database["public"]["Enums"]["compliance_status"]
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          doc_type: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          organization_id: string
          project_id?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          doc_type?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          organization_id?: string
          project_id?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          cost: number | null
          created_at: string
          created_by: string
          delivered_at: string | null
          delivered_lat: number | null
          delivered_lng: number | null
          delivery_date: string
          destination: string
          destination_lat: number | null
          destination_lng: number | null
          destination_state: string | null
          distance_km: number | null
          driver: string | null
          id: string
          notes: string | null
          organization_id: string
          project_id: string | null
          site_name: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
          vehicle: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          created_by: string
          delivered_at?: string | null
          delivered_lat?: number | null
          delivered_lng?: number | null
          delivery_date?: string
          destination: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_state?: string | null
          distance_km?: number | null
          driver?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          project_id?: string | null
          site_name?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
          vehicle?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          delivered_lat?: number | null
          delivered_lng?: number | null
          delivery_date?: string
          destination?: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_state?: string | null
          distance_km?: number | null
          driver?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          project_id?: string | null
          site_name?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
          vehicle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinary_records: {
        Row: {
          action_taken: string | null
          created_at: string
          description: string
          id: string
          incident_date: string
          issued_by: string
          organization_id: string
          severity: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          description: string
          id?: string
          incident_date?: string
          issued_by: string
          organization_id: string
          severity?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          description?: string
          id?: string
          incident_date?: string
          issued_by?: string
          organization_id?: string
          severity?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_skills: {
        Row: {
          certification_expiry: string | null
          certified: boolean | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          proficiency_level: number
          skill_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          certification_expiry?: string | null
          certified?: boolean | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          proficiency_level?: number
          skill_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          certification_expiry?: string | null
          certified?: boolean | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          proficiency_level?: number
          skill_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_skills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          created_at: string
          current_site_project_id: string | null
          id: string
          name: string
          next_maintenance_date: string | null
          notes: string | null
          organization_id: string
          serial_number: string | null
          status: Database["public"]["Enums"]["equipment_status"]
          type: string | null
          updated_at: string
          usage_hours: number | null
        }
        Insert: {
          created_at?: string
          current_site_project_id?: string | null
          id?: string
          name: string
          next_maintenance_date?: string | null
          notes?: string | null
          organization_id: string
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          type?: string | null
          updated_at?: string
          usage_hours?: number | null
        }
        Update: {
          created_at?: string
          current_site_project_id?: string | null
          id?: string
          name?: string
          next_maintenance_date?: string | null
          notes?: string | null
          organization_id?: string
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          type?: string | null
          updated_at?: string
          usage_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_current_site_project_id_fkey"
            columns: ["current_site_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_logs: {
        Row: {
          created_at: string
          description: string | null
          equipment_id: string
          id: string
          log_type: Database["public"]["Enums"]["equipment_log_type"]
          logged_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          equipment_id: string
          id?: string
          log_type: Database["public"]["Enums"]["equipment_log_type"]
          logged_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          equipment_id?: string
          id?: string
          log_type?: Database["public"]["Enums"]["equipment_log_type"]
          logged_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          equipment_id: string
          id: string
          organization_id: string
          project_id: string | null
          reason: string | null
          requested_by: string
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          equipment_id: string
          id?: string
          organization_id: string
          project_id?: string | null
          reason?: string | null
          requested_by: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          equipment_id?: string
          id?: string
          organization_id?: string
          project_id?: string | null
          reason?: string | null
          requested_by?: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string
          date: string
          description: string | null
          id: string
          organization_id: string
          project_id: string | null
        }
        Insert: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by: string
          date?: string
          description?: string | null
          id?: string
          organization_id: string
          project_id?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string
          date?: string
          description?: string | null
          id?: string
          organization_id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      field_report_photos: {
        Row: {
          caption: string | null
          created_at: string
          field_report_id: string
          id: string
          photo_url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          field_report_id: string
          id?: string
          photo_url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          field_report_id?: string
          id?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_report_photos_field_report_id_fkey"
            columns: ["field_report_id"]
            isOneToOne: false
            referencedRelation: "field_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      field_reports: {
        Row: {
          client_feedback: string | null
          created_at: string
          created_by: string
          crew_members: string | null
          id: string
          notes: string | null
          organization_id: string
          pressure_test_result: string | null
          project_id: string | null
          report_date: string
          safety_incidents: string | null
          tasks_completed: string | null
          updated_at: string
        }
        Insert: {
          client_feedback?: string | null
          created_at?: string
          created_by: string
          crew_members?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          pressure_test_result?: string | null
          project_id?: string | null
          report_date?: string
          safety_incidents?: string | null
          tasks_completed?: string | null
          updated_at?: string
        }
        Update: {
          client_feedback?: string | null
          created_at?: string
          created_by?: string
          crew_members?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          pressure_test_result?: string | null
          project_id?: string | null
          report_date?: string
          safety_incidents?: string | null
          tasks_completed?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          created_at: string
          diameter_mm: number | null
          id: string
          item_name: string
          item_type: Database["public"]["Enums"]["pipe_type"] | null
          min_stock_level: number | null
          notes: string | null
          organization_id: string
          quantity_meters: number | null
          supplier: string | null
          supplier_phone: string | null
          thickness_mm: number | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          diameter_mm?: number | null
          id?: string
          item_name: string
          item_type?: Database["public"]["Enums"]["pipe_type"] | null
          min_stock_level?: number | null
          notes?: string | null
          organization_id: string
          quantity_meters?: number | null
          supplier?: string | null
          supplier_phone?: string | null
          thickness_mm?: number | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          diameter_mm?: number | null
          id?: string
          item_name?: string
          item_type?: Database["public"]["Enums"]["pipe_type"] | null
          min_stock_level?: number | null
          notes?: string | null
          organization_id?: string
          quantity_meters?: number | null
          supplier?: string | null
          supplier_phone?: string | null
          thickness_mm?: number | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          category: string
          content: string | null
          created_at: string
          created_by: string
          id: string
          organization_id: string
          pipe_sizes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content?: string | null
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          pipe_sizes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          pipe_sizes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_articles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_reflections: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          reflection: string
          supervisor_feedback: string | null
          title: string
          updated_at: string
          user_id: string
          week_number: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          reflection: string
          supervisor_feedback?: string | null
          title: string
          updated_at?: string
          user_id: string
          week_number?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          reflection?: string
          supervisor_feedback?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_reflections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          leave_type: string
          organization_id: string
          reason: string | null
          start_date: string
          status: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type?: string
          organization_id: string
          reason?: string | null
          start_date: string
          status?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          organization_id?: string
          reason?: string | null
          start_date?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_risk_logs: {
        Row: {
          created_at: string
          details: string | null
          flagged_content: string | null
          id: string
          message_id: string
          organization_id: string
          risk_category: string
          risk_score: number
        }
        Insert: {
          created_at?: string
          details?: string | null
          flagged_content?: string | null
          id?: string
          message_id: string
          organization_id: string
          risk_category?: string
          risk_score?: number
        }
        Update: {
          created_at?: string
          details?: string | null
          flagged_content?: string | null
          id?: string
          message_id?: string
          organization_id?: string
          risk_category?: string
          risk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "message_risk_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_risk_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          context_id: string | null
          context_type: string | null
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          moderation_status: string | null
          organization_id: string
          recipient_id: string | null
          sender_id: string
          subject: string
        }
        Insert: {
          body: string
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          moderation_status?: string | null
          organization_id: string
          recipient_id?: string | null
          sender_id: string
          subject?: string
        }
        Update: {
          body?: string
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          moderation_status?: string | null
          organization_id?: string
          recipient_id?: string | null
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          bid_strategy: string | null
          capital_estimate: number | null
          competition_intensity: string | null
          created_at: string
          created_by: string
          deadline: string | null
          description: string | null
          estimated_value: number | null
          id: string
          notes: string | null
          organization_id: string
          relevance_score: number | null
          source: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          success_probability: number | null
          title: string
          updated_at: string
        }
        Insert: {
          bid_strategy?: string | null
          capital_estimate?: number | null
          competition_intensity?: string | null
          created_at?: string
          created_by: string
          deadline?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          relevance_score?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          success_probability?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          bid_strategy?: string | null
          capital_estimate?: number | null
          competition_intensity?: string | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          relevance_score?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          success_probability?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          office_lat: number | null
          office_lng: number | null
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          office_lat?: number | null
          office_lng?: number | null
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          office_lat?: number | null
          office_lng?: number | null
          phone?: string | null
        }
        Relationships: []
      }
      performance_logs: {
        Row: {
          created_at: string
          created_by: string
          id: string
          notes: string | null
          organization_id: string
          period: string
          rating: number
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          organization_id: string
          period: string
          rating: number
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          organization_id?: string
          period?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      print_requests: {
        Row: {
          admin_notes: string | null
          approved_by: string | null
          created_at: string
          document_content: string | null
          document_id: string | null
          document_title: string
          document_type: string
          id: string
          organization_id: string
          requested_by: string
          stamp_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approved_by?: string | null
          created_at?: string
          document_content?: string | null
          document_id?: string | null
          document_title: string
          document_type?: string
          id?: string
          organization_id: string
          requested_by: string
          stamp_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approved_by?: string | null
          created_at?: string
          document_content?: string | null
          document_id?: string | null
          document_title?: string
          document_type?: string
          id?: string
          organization_id?: string
          requested_by?: string
          stamp_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          organization_id: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          progress_percent: number | null
          project_head_id: string | null
          quotation_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          team_member_ids: Json | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          progress_percent?: number | null
          project_head_id?: string | null
          quotation_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          team_member_ids?: Json | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          progress_percent?: number | null
          project_head_id?: string | null
          quotation_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          team_member_ids?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          approved_by: string
          created_at: string
          effective_date: string
          id: string
          new_role: string
          organization_id: string
          previous_role: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          approved_by: string
          created_at?: string
          effective_date?: string
          id?: string
          new_role: string
          organization_id: string
          previous_role?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          approved_by?: string
          created_at?: string
          effective_date?: string
          id?: string
          new_role?: string
          organization_id?: string
          previous_role?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          created_at: string
          description: string
          diameter_mm: number | null
          id: string
          item_type: Database["public"]["Enums"]["quotation_item_type"]
          length_meters: number | null
          quantity: number
          quotation_id: string
          thickness_mm: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          diameter_mm?: number | null
          id?: string
          item_type?: Database["public"]["Enums"]["quotation_item_type"]
          length_meters?: number | null
          quantity?: number
          quotation_id: string
          thickness_mm?: number | null
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          diameter_mm?: number | null
          id?: string
          item_type?: Database["public"]["Enums"]["quotation_item_type"]
          length_meters?: number | null
          quantity?: number
          quotation_id?: string
          thickness_mm?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string
          id: string
          is_lump_sum: boolean | null
          labor_cost_per_meter: number | null
          lump_sum_amount: number | null
          notes: string | null
          organization_id: string
          pipe_type: Database["public"]["Enums"]["pipe_type"] | null
          profit_margin_percent: number | null
          quotation_number: string
          status: Database["public"]["Enums"]["quotation_status"]
          subtotal: number | null
          total_amount: number | null
          transport_cost: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_lump_sum?: boolean | null
          labor_cost_per_meter?: number | null
          lump_sum_amount?: number | null
          notes?: string | null
          organization_id: string
          pipe_type?: Database["public"]["Enums"]["pipe_type"] | null
          profit_margin_percent?: number | null
          quotation_number: string
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number | null
          total_amount?: number | null
          transport_cost?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_lump_sum?: boolean | null
          labor_cost_per_meter?: number | null
          lump_sum_amount?: number | null
          notes?: string | null
          organization_id?: string
          pipe_type?: Database["public"]["Enums"]["pipe_type"] | null
          profit_margin_percent?: number | null
          quotation_number?: string
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number | null
          total_amount?: number | null
          transport_cost?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment: {
        Row: {
          candidate_email: string | null
          candidate_name: string | null
          candidate_phone: string | null
          created_at: string
          created_by: string
          department: string | null
          id: string
          interview_date: string | null
          notes: string | null
          organization_id: string
          position_title: string
          resume_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_email?: string | null
          candidate_name?: string | null
          candidate_phone?: string | null
          created_at?: string
          created_by: string
          department?: string | null
          id?: string
          interview_date?: string | null
          notes?: string | null
          organization_id: string
          position_title: string
          resume_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_email?: string | null
          candidate_name?: string | null
          candidate_phone?: string | null
          created_at?: string
          created_by?: string
          department?: string | null
          id?: string
          interview_date?: string | null
          notes?: string | null
          organization_id?: string
          position_title?: string
          resume_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      structured_reports: {
        Row: {
          created_at: string
          field_report_id: string
          id: string
          pdf_url: string | null
          structured_content: string
        }
        Insert: {
          created_at?: string
          field_report_id: string
          id?: string
          pdf_url?: string | null
          structured_content: string
        }
        Update: {
          created_at?: string
          field_report_id?: string
          id?: string
          pdf_url?: string | null
          structured_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "structured_reports_field_report_id_fkey"
            columns: ["field_report_id"]
            isOneToOne: false
            referencedRelation: "field_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      system_maintenance_accounts: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      training_logs: {
        Row: {
          certificate_url: string | null
          completed_date: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          organization_id: string
          score: number | null
          training_title: string
          training_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          completed_date?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          organization_id: string
          score?: number | null
          training_title: string
          training_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          organization_id?: string
          score?: number | null
          training_title?: string
          training_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_claims: {
        Row: {
          admin_notes: string | null
          amount: number | null
          category: string
          claim_type: string
          created_at: string
          description: string | null
          id: string
          organization_id: string
          project_id: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount?: number | null
          category?: string
          claim_type?: string
          created_at?: string
          description?: string | null
          id?: string
          organization_id: string
          project_id?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number | null
          category?: string
          claim_type?: string
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string
          project_id?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_claims_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_claims_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          date: string
          description: string | null
          equipment_id: string | null
          id: string
          organization_id: string
          project_id: string | null
          type: Database["public"]["Enums"]["payment_type"]
          user_id: string | null
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by: string
          date?: string
          description?: string | null
          equipment_id?: string | null
          id?: string
          organization_id: string
          project_id?: string | null
          type: Database["public"]["Enums"]["payment_type"]
          user_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          date?: string
          description?: string | null
          equipment_id?: string | null
          id?: string
          organization_id?: string
          project_id?: string | null
          type?: Database["public"]["Enums"]["payment_type"]
          user_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_payments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_visible_admins: { Args: { _org_id: string }; Returns: number }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_visible_members: {
        Args: { _org_id: string }
        Returns: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "organization_memberships"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_maintenance_admin: { Args: { _uid: string }; Returns: boolean }
      is_member_of_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "administrator"
        | "engineer"
        | "technician"
        | "warehouse"
        | "finance"
        | "hr"
        | "reception_sales"
        | "knowledge_manager"
        | "siwes_trainee"
        | "it_student"
        | "nysc_member"
      compliance_status: "valid" | "expired" | "pending"
      delivery_status: "pending" | "in_transit" | "delivered" | "cancelled"
      equipment_log_type: "assignment" | "maintenance" | "fault"
      equipment_status: "available" | "in_use" | "maintenance" | "retired"
      expense_category:
        | "labor"
        | "fuel"
        | "transport"
        | "materials"
        | "equipment"
        | "other"
      opportunity_status: "identified" | "bidding" | "won" | "lost"
      payment_type:
        | "salary"
        | "overtime"
        | "fuel"
        | "maintenance"
        | "bonus"
        | "transport"
        | "vendor"
      pipe_type: "hdpe" | "pvc" | "custom"
      project_status:
        | "planning"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "cancelled"
      quotation_item_type: "pipe" | "fitting" | "labor" | "transport" | "other"
      quotation_status: "draft" | "sent" | "accepted" | "rejected"
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
      app_role: [
        "administrator",
        "engineer",
        "technician",
        "warehouse",
        "finance",
        "hr",
        "reception_sales",
        "knowledge_manager",
        "siwes_trainee",
        "it_student",
        "nysc_member",
      ],
      compliance_status: ["valid", "expired", "pending"],
      delivery_status: ["pending", "in_transit", "delivered", "cancelled"],
      equipment_log_type: ["assignment", "maintenance", "fault"],
      equipment_status: ["available", "in_use", "maintenance", "retired"],
      expense_category: [
        "labor",
        "fuel",
        "transport",
        "materials",
        "equipment",
        "other",
      ],
      opportunity_status: ["identified", "bidding", "won", "lost"],
      payment_type: [
        "salary",
        "overtime",
        "fuel",
        "maintenance",
        "bonus",
        "transport",
        "vendor",
      ],
      pipe_type: ["hdpe", "pvc", "custom"],
      project_status: [
        "planning",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ],
      quotation_item_type: ["pipe", "fitting", "labor", "transport", "other"],
      quotation_status: ["draft", "sent", "accepted", "rejected"],
    },
  },
} as const
