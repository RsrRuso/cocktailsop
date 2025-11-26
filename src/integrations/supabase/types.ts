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
      access_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          qr_code_id: string
          status: string
          updated_at: string
          user_email: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          qr_code_id: string
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          qr_code_id?: string
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      area_equipment: {
        Row: {
          area_id: string
          capacity: string | null
          created_at: string | null
          equipment_type: string
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          area_id: string
          capacity?: string | null
          created_at?: string | null
          equipment_type: string
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          area_id?: string
          capacity?: string | null
          created_at?: string | null
          equipment_type?: string
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "area_equipment_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "location_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_calculations: {
        Row: {
          batch_size: number
          created_at: string | null
          id: string
          ingredients: Json
          name: string
          user_id: string
        }
        Insert: {
          batch_size: number
          created_at?: string | null
          id?: string
          ingredients: Json
          name: string
          user_id: string
        }
        Update: {
          batch_size?: number
          created_at?: string | null
          id?: string
          ingredients?: Json
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_calculations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_calculations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      business_analytics: {
        Row: {
          created_at: string | null
          date: string
          id: string
          idea_id: string | null
          metric_type: string
          metric_value: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          idea_id?: string | null
          metric_type: string
          metric_value?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          idea_id?: string | null
          metric_type?: string
          metric_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_analytics_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "business_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      business_ideas: {
        Row: {
          category: string
          created_at: string | null
          current_funding: number | null
          description: string
          funding_goal: number | null
          hashtags: string[] | null
          headline: string
          id: string
          interest_count: number | null
          looking_for: string[] | null
          media_urls: string[] | null
          stage: string | null
          title: string
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          current_funding?: number | null
          description: string
          funding_goal?: number | null
          hashtags?: string[] | null
          headline: string
          id?: string
          interest_count?: number | null
          looking_for?: string[] | null
          media_urls?: string[] | null
          stage?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          current_funding?: number | null
          description?: string
          funding_goal?: number | null
          hashtags?: string[] | null
          headline?: string
          id?: string
          interest_count?: number | null
          looking_for?: string[] | null
          media_urls?: string[] | null
          stage?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          attendees: string[] | null
          created_at: string | null
          description: string | null
          end_time: string
          event_type: string | null
          id: string
          location: string | null
          start_time: string
          task_id: string | null
          team_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attendees?: string[] | null
          created_at?: string | null
          description?: string | null
          end_time: string
          event_type?: string | null
          id?: string
          location?: string | null
          start_time: string
          task_id?: string | null
          team_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attendees?: string[] | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          event_type?: string | null
          id?: string
          location?: string | null
          start_time?: string
          task_id?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          created_at: string
          credential_id: string | null
          credential_url: string | null
          description: string | null
          expiry_date: string | null
          id: string
          issue_date: string
          issuing_organization: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          issue_date: string
          issuing_organization: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string
          issuing_organization?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_channels: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          team_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          team_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          team_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachments: Json | null
          channel_id: string
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
          reply_to: string | null
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          channel_id: string
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          reply_to?: string | null
          user_id: string
        }
        Update: {
          attachments?: Json | null
          channel_id?: string
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          reply_to?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      cocktail_sops: {
        Row: {
          abv_percentage: number | null
          allergens: string | null
          batch_size: number | null
          brix: number | null
          cost_per_serving: number | null
          created_at: string
          drink_name: string
          garnish: string
          glass: string
          ice: string
          id: string
          ingredient_costs: Json | null
          is_active: boolean | null
          kcal: number | null
          main_image: string | null
          method_sop: string
          nutritional_info: Json | null
          parent_version_id: string | null
          ph: number | null
          ratio: string | null
          recipe: Json
          selling_price: number | null
          service_notes: string | null
          taste_bitter: number | null
          taste_profile: Json | null
          taste_salty: number | null
          taste_sour: number | null
          taste_sweet: number | null
          taste_umami: number | null
          technique: string
          texture_profile: Json | null
          total_ml: number
          updated_at: string
          user_id: string
          version: number | null
        }
        Insert: {
          abv_percentage?: number | null
          allergens?: string | null
          batch_size?: number | null
          brix?: number | null
          cost_per_serving?: number | null
          created_at?: string
          drink_name: string
          garnish: string
          glass: string
          ice: string
          id?: string
          ingredient_costs?: Json | null
          is_active?: boolean | null
          kcal?: number | null
          main_image?: string | null
          method_sop: string
          nutritional_info?: Json | null
          parent_version_id?: string | null
          ph?: number | null
          ratio?: string | null
          recipe?: Json
          selling_price?: number | null
          service_notes?: string | null
          taste_bitter?: number | null
          taste_profile?: Json | null
          taste_salty?: number | null
          taste_sour?: number | null
          taste_sweet?: number | null
          taste_umami?: number | null
          technique: string
          texture_profile?: Json | null
          total_ml: number
          updated_at?: string
          user_id: string
          version?: number | null
        }
        Update: {
          abv_percentage?: number | null
          allergens?: string | null
          batch_size?: number | null
          brix?: number | null
          cost_per_serving?: number | null
          created_at?: string
          drink_name?: string
          garnish?: string
          glass?: string
          ice?: string
          id?: string
          ingredient_costs?: Json | null
          is_active?: boolean | null
          kcal?: number | null
          main_image?: string | null
          method_sop?: string
          nutritional_info?: Json | null
          parent_version_id?: string | null
          ph?: number | null
          ratio?: string | null
          recipe?: Json
          selling_price?: number | null
          service_notes?: string | null
          taste_bitter?: number | null
          taste_profile?: Json | null
          taste_salty?: number | null
          taste_sour?: number | null
          taste_sweet?: number | null
          taste_umami?: number | null
          technique?: string
          texture_profile?: Json | null
          total_ml?: number
          updated_at?: string
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cocktail_sops_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "cocktail_sops"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          certificate_url: string | null
          competition_date: string
          created_at: string
          description: string | null
          id: string
          organizer: string | null
          result: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          competition_date: string
          created_at?: string
          description?: string | null
          id?: string
          organizer?: string | null
          result: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          competition_date?: string
          created_at?: string
          description?: string | null
          id?: string
          organizer?: string | null
          result?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          created_by: string | null
          group_avatar_url: string | null
          group_description: string | null
          group_name: string | null
          id: string
          is_group: boolean | null
          last_message_at: string | null
          participant_ids: string[]
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          group_avatar_url?: string | null
          group_description?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          participant_ids: string[]
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          group_avatar_url?: string | null
          group_description?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          participant_ids?: string[]
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          deal_id: string | null
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          priority: string | null
          status: string | null
          subject: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string | null
          status?: string | null
          subject: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string | null
          status?: string | null
          subject?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          address: string | null
          assigned_to: string | null
          avatar_url: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          position: string | null
          source: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          avatar_url?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          avatar_url?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crm_deals: {
        Row: {
          actual_close_date: string | null
          assigned_to: string | null
          contact_id: string | null
          created_at: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          probability: number | null
          stage: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          actual_close_date?: string | null
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          probability?: number | null
          stage?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          value: number
        }
        Update: {
          actual_close_date?: string | null
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          probability?: number | null
          stage?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          assigned_to: string | null
          budget: number | null
          company: string | null
          contact_name: string
          created_at: string | null
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          probability: number | null
          source: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          budget?: number | null
          company?: string | null
          contact_name: string
          created_at?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          probability?: number | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          budget?: number | null
          company?: string | null
          contact_name?: string
          created_at?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          probability?: number | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crm_notes: {
        Row: {
          contact_id: string | null
          content: string
          created_at: string | null
          deal_id: string | null
          id: string
          lead_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          content: string
          created_at?: string | null
          deal_id?: string | null
          id?: string
          lead_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string | null
          content?: string
          created_at?: string | null
          deal_id?: string | null
          id?: string
          lead_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_reports: {
        Row: {
          config: Json
          created_at: string | null
          description: string | null
          id: string
          name: string
          report_type: string
          schedule: string | null
          user_id: string
        }
        Insert: {
          config: Json
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          report_type: string
          schedule?: string | null
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          report_type?: string
          schedule?: string | null
          user_id?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          head_id: string | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          head_id?: string | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          head_id?: string | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          description: string | null
          file_size: number
          file_type: string
          file_url: string
          folder_id: string | null
          id: string
          is_folder: boolean | null
          name: string
          shared_with: string[] | null
          tags: string[] | null
          team_id: string | null
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_size: number
          file_type: string
          file_url: string
          folder_id?: string | null
          id?: string
          is_folder?: boolean | null
          name: string
          shared_with?: string[] | null
          tags?: string[] | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_size?: number
          file_type?: string
          file_url?: string
          folder_id?: string | null
          id?: string
          is_folder?: boolean | null
          name?: string
          shared_with?: string[] | null
          tags?: string[] | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_positions: {
        Row: {
          created_at: string | null
          department_id: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          position_title: string
          start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          position_title: string
          start_date: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          position_title?: string
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          id: string
          name: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      employment_verifications: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          position: string
          start_date: string
          status: string
          user_id: string
          venue_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          position: string
          start_date: string
          status?: string
          user_id: string
          venue_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          position?: string
          start_date?: string
          status?: string
          user_id?: string
          venue_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employment_verifications_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          area: string
          created_at: string | null
          doors: number | null
          id: string
          name: string
          target_temperature: number
          type: Database["public"]["Enums"]["equipment_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          area: string
          created_at?: string | null
          doors?: number | null
          id?: string
          name: string
          target_temperature: number
          type: Database["public"]["Enums"]["equipment_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          area?: string
          created_at?: string | null
          doors?: number | null
          id?: string
          name?: string
          target_temperature?: number
          type?: Database["public"]["Enums"]["equipment_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      equipment_items: {
        Row: {
          category: string | null
          created_at: string | null
          equipment_id: string
          id: string
          item_name: string
          notes: string | null
          quantity: string | null
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          equipment_id: string
          id?: string
          item_name: string
          notes?: string | null
          quantity?: string | null
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          equipment_id?: string
          id?: string
          item_name?: string
          notes?: string | null
          quantity?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_items_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "area_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "event_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      event_comments: {
        Row: {
          content: string
          created_at: string | null
          event_id: string
          id: string
          parent_comment_id: string | null
          reaction_count: number | null
          reactions: Json | null
          reply_count: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          event_id: string
          id?: string
          parent_comment_id?: string | null
          reaction_count?: number | null
          reactions?: Json | null
          reply_count?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          event_id?: string
          id?: string
          parent_comment_id?: string | null
          reaction_count?: number | null
          reactions?: Json | null
          reply_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "event_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      event_likes: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_likes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          attendee_count: number | null
          comment_count: number | null
          created_at: string | null
          description: string | null
          event_date: string | null
          id: string
          is_active: boolean | null
          like_count: number | null
          region: string
          status: string
          title: string
          updated_at: string | null
          user_id: string
          venue_name: string | null
        }
        Insert: {
          address?: string | null
          attendee_count?: number | null
          comment_count?: number | null
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          is_active?: boolean | null
          like_count?: number | null
          region: string
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
          venue_name?: string | null
        }
        Update: {
          address?: string | null
          attendee_count?: number | null
          comment_count?: number | null
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          is_active?: boolean | null
          like_count?: number | null
          region?: string
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          venue_name?: string | null
        }
        Relationships: []
      }
      fifo_activity_log: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          employee_id: string | null
          id: string
          inventory_id: string | null
          photo_url: string | null
          quantity_after: number | null
          quantity_before: number | null
          store_id: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          employee_id?: string | null
          id?: string
          inventory_id?: string | null
          photo_url?: string | null
          quantity_after?: number | null
          quantity_before?: number | null
          store_id?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          employee_id?: string | null
          id?: string
          inventory_id?: string | null
          photo_url?: string | null
          quantity_after?: number | null
          quantity_before?: number | null
          store_id?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fifo_activity_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "fifo_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fifo_activity_log_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "fifo_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fifo_activity_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "fifo_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fifo_activity_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fifo_employees: {
        Row: {
          created_at: string | null
          id: string
          name: string
          title: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          title: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          title?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fifo_employees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fifo_inventory: {
        Row: {
          batch_number: string | null
          created_at: string | null
          expiration_date: string
          id: string
          item_id: string
          notes: string | null
          photo_url: string | null
          priority_score: number | null
          quantity: number
          received_date: string | null
          scanned_data: Json | null
          sold_at: string | null
          status: string | null
          store_id: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          expiration_date: string
          id?: string
          item_id: string
          notes?: string | null
          photo_url?: string | null
          priority_score?: number | null
          quantity?: number
          received_date?: string | null
          scanned_data?: Json | null
          sold_at?: string | null
          status?: string | null
          store_id: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          expiration_date?: string
          id?: string
          item_id?: string
          notes?: string | null
          photo_url?: string | null
          priority_score?: number | null
          quantity?: number
          received_date?: string | null
          scanned_data?: Json | null
          sold_at?: string | null
          status?: string | null
          store_id?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fifo_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "fifo_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fifo_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "fifo_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fifo_inventory_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fifo_items: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string | null
          color_code: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          photo_url: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          color_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          photo_url?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          color_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fifo_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fifo_stores: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          store_type: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          store_type?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          store_type?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fifo_stores_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fifo_transfers: {
        Row: {
          created_at: string | null
          from_store_id: string | null
          id: string
          inventory_id: string | null
          notes: string | null
          photo_url: string | null
          quantity: number
          scanned_data: Json | null
          status: string | null
          to_store_id: string | null
          transfer_date: string | null
          transferred_by: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          from_store_id?: string | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          photo_url?: string | null
          quantity: number
          scanned_data?: Json | null
          status?: string | null
          to_store_id?: string | null
          transfer_date?: string | null
          transferred_by?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          from_store_id?: string | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          photo_url?: string | null
          quantity?: number
          scanned_data?: Json | null
          status?: string | null
          to_store_id?: string | null
          transfer_date?: string | null
          transferred_by?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fifo_transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "fifo_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fifo_transfers_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "fifo_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fifo_transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "fifo_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fifo_transfers_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "fifo_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fifo_transfers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_interests: {
        Row: {
          created_at: string | null
          id: string
          idea_id: string
          notes: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          idea_id: string
          notes?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          idea_id?: string
          notes?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_interests_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "business_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_prices: {
        Row: {
          cost_per_unit: number
          created_at: string | null
          id: string
          ingredient_name: string
          last_updated: string | null
          supplier: string | null
          unit: string
          user_id: string
        }
        Insert: {
          cost_per_unit: number
          created_at?: string | null
          id?: string
          ingredient_name: string
          last_updated?: string | null
          supplier?: string | null
          unit?: string
          user_id: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          ingredient_name?: string
          last_updated?: string | null
          supplier?: string | null
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      internal_emails: {
        Row: {
          archived: boolean | null
          body: string
          created_at: string | null
          id: string
          is_draft: boolean | null
          read: boolean | null
          recipient_id: string
          sender_id: string
          starred: boolean | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          body: string
          created_at?: string | null
          id?: string
          is_draft?: boolean | null
          read?: boolean | null
          recipient_id: string
          sender_id: string
          starred?: boolean | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          body?: string
          created_at?: string | null
          id?: string
          is_draft?: boolean | null
          read?: boolean | null
          recipient_id?: string
          sender_id?: string
          starred?: boolean | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          batch_number: string | null
          created_at: string
          expiration_date: string
          id: string
          item_id: string
          notes: string | null
          photo_url: string | null
          priority_score: number | null
          quantity: number
          received_date: string | null
          scanned_data: Json | null
          status: string | null
          store_id: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          expiration_date: string
          id?: string
          item_id: string
          notes?: string | null
          photo_url?: string | null
          priority_score?: number | null
          quantity?: number
          received_date?: string | null
          scanned_data?: Json | null
          status?: string | null
          store_id: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          expiration_date?: string
          id?: string
          item_id?: string
          notes?: string | null
          photo_url?: string | null
          priority_score?: number | null
          quantity?: number
          received_date?: string | null
          scanned_data?: Json | null
          status?: string | null
          store_id?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_activity_log: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          employee_id: string | null
          id: string
          inventory_id: string | null
          photo_url: string | null
          quantity_after: number | null
          quantity_before: number | null
          store_id: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          employee_id?: string | null
          id?: string
          inventory_id?: string | null
          photo_url?: string | null
          quantity_after?: number | null
          quantity_before?: number | null
          store_id?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          employee_id?: string | null
          id?: string
          inventory_id?: string | null
          photo_url?: string | null
          quantity_after?: number | null
          quantity_before?: number | null
          store_id?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_activity_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_activity_log_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_activity_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_activity_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_spot_checks: {
        Row: {
          check_date: string | null
          checked_by: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          photo_urls: string[] | null
          status: string | null
          store_id: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          check_date?: string | null
          checked_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          status?: string | null
          store_id?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          check_date?: string | null
          checked_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          photo_urls?: string[] | null
          status?: string | null
          store_id?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_spot_checks_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_spot_checks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_spot_checks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfers: {
        Row: {
          created_at: string | null
          from_store_id: string | null
          id: string
          inventory_id: string | null
          notes: string | null
          photo_url: string | null
          quantity: number
          scanned_data: Json | null
          status: string | null
          to_store_id: string | null
          transfer_date: string | null
          transferred_by: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          from_store_id?: string | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          photo_url?: string | null
          quantity: number
          scanned_data?: Json | null
          status?: string | null
          to_store_id?: string | null
          transfer_date?: string | null
          transferred_by?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          from_store_id?: string | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          photo_url?: string | null
          quantity?: number
          scanned_data?: Json | null
          status?: string | null
          to_store_id?: string | null
          transfer_date?: string | null
          transferred_by?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          id: string
          industries: string[] | null
          investment_focus: string[] | null
          investment_range_max: number | null
          investment_range_min: number | null
          linkedin_url: string | null
          portfolio_url: string | null
          preferred_stages: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          id?: string
          industries?: string[] | null
          investment_focus?: string[] | null
          investment_range_max?: number | null
          investment_range_min?: number | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          preferred_stages?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          id?: string
          industries?: string[] | null
          investment_focus?: string[] | null
          investment_range_max?: number | null
          investment_range_min?: number | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          preferred_stages?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string | null
          color_code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          photo_url: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          color_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          photo_url?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          color_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_published: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          views: number | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          views?: number | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      location_areas: {
        Row: {
          area_type: string
          created_at: string | null
          id: string
          map_id: string
          name: string
          notes: string | null
          position_x: number | null
          position_y: number | null
        }
        Insert: {
          area_type: string
          created_at?: string | null
          id?: string
          map_id: string
          name: string
          notes?: string | null
          position_x?: number | null
          position_y?: number | null
        }
        Update: {
          area_type?: string
          created_at?: string | null
          id?: string
          map_id?: string
          name?: string
          notes?: string | null
          position_x?: number | null
          position_y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "location_areas_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "location_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      location_maps: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_maps_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      matrix_chat_history: {
        Row: {
          context_insights: string[] | null
          context_memory: string[] | null
          created_at: string | null
          id: string
          message_content: string
          message_role: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          context_insights?: string[] | null
          context_memory?: string[] | null
          created_at?: string | null
          id?: string
          message_content: string
          message_role: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          context_insights?: string[] | null
          context_memory?: string[] | null
          created_at?: string | null
          id?: string
          message_content?: string
          message_role?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      matrix_insights: {
        Row: {
          category: string | null
          context: Json | null
          created_at: string | null
          description: string
          embedding_vector: Json | null
          id: string
          insight_type: string
          priority_score: number | null
          processed_at: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          context?: Json | null
          created_at?: string | null
          description: string
          embedding_vector?: Json | null
          id?: string
          insight_type: string
          priority_score?: number | null
          processed_at?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          context?: Json | null
          created_at?: string | null
          description?: string
          embedding_vector?: Json | null
          id?: string
          insight_type?: string
          priority_score?: number | null
          processed_at?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      matrix_memory: {
        Row: {
          access_count: number | null
          content: string
          created_at: string | null
          embedding_vector: Json | null
          expires_at: string | null
          id: string
          last_accessed: string | null
          memory_type: string
          metadata: Json | null
          relevance_score: number | null
        }
        Insert: {
          access_count?: number | null
          content: string
          created_at?: string | null
          embedding_vector?: Json | null
          expires_at?: string | null
          id?: string
          last_accessed?: string | null
          memory_type: string
          metadata?: Json | null
          relevance_score?: number | null
        }
        Update: {
          access_count?: number | null
          content?: string
          created_at?: string | null
          embedding_vector?: Json | null
          expires_at?: string | null
          id?: string
          last_accessed?: string | null
          memory_type?: string
          metadata?: Json | null
          relevance_score?: number | null
        }
        Relationships: []
      }
      matrix_patterns: {
        Row: {
          category: string | null
          confidence_score: number | null
          detected_at: string | null
          id: string
          last_updated: string | null
          occurrence_count: number | null
          pattern_description: string | null
          pattern_name: string
          related_insight_ids: string[]
          status: string | null
          trend_direction: string | null
        }
        Insert: {
          category?: string | null
          confidence_score?: number | null
          detected_at?: string | null
          id?: string
          last_updated?: string | null
          occurrence_count?: number | null
          pattern_description?: string | null
          pattern_name: string
          related_insight_ids?: string[]
          status?: string | null
          trend_direction?: string | null
        }
        Update: {
          category?: string | null
          confidence_score?: number | null
          detected_at?: string | null
          id?: string
          last_updated?: string | null
          occurrence_count?: number | null
          pattern_description?: string | null
          pattern_name?: string
          related_insight_ids?: string[]
          status?: string | null
          trend_direction?: string | null
        }
        Relationships: []
      }
      matrix_roadmap: {
        Row: {
          ai_generated: boolean | null
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string | null
          estimated_impact: string | null
          feature_description: string
          feature_title: string
          id: string
          implementation_complexity: string | null
          priority: string
          priority_score: number | null
          reasoning: string | null
          source_insight_ids: string[] | null
          source_pattern_ids: string[] | null
          status: string
          updated_at: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          estimated_impact?: string | null
          feature_description: string
          feature_title: string
          id?: string
          implementation_complexity?: string | null
          priority?: string
          priority_score?: number | null
          reasoning?: string | null
          source_insight_ids?: string[] | null
          source_pattern_ids?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          estimated_impact?: string | null
          feature_description?: string
          feature_title?: string
          id?: string
          implementation_complexity?: string | null
          priority?: string
          priority_score?: number | null
          reasoning?: string | null
          source_insight_ids?: string[] | null
          source_pattern_ids?: string[] | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          delivered: boolean | null
          edited: boolean | null
          edited_at: string | null
          forwarded: boolean | null
          id: string
          media_type: string | null
          media_url: string | null
          reactions: Json | null
          read: boolean | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          delivered?: boolean | null
          edited?: boolean | null
          edited_at?: string | null
          forwarded?: boolean | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          reactions?: Json | null
          read?: boolean | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          delivered?: boolean | null
          edited?: boolean | null
          edited_at?: string | null
          forwarded?: boolean | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          reactions?: Json | null
          read?: boolean | null
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      music_share_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          music_share_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          music_share_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          music_share_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_share_comments_music_share_id_fkey"
            columns: ["music_share_id"]
            isOneToOne: false
            referencedRelation: "music_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      music_share_likes: {
        Row: {
          created_at: string
          id: string
          music_share_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          music_share_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          music_share_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_share_likes_music_share_id_fkey"
            columns: ["music_share_id"]
            isOneToOne: false
            referencedRelation: "music_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      music_shares: {
        Row: {
          comment_count: number | null
          created_at: string
          id: string
          like_count: number | null
          track_artist: string
          track_id: string
          track_title: string
          user_id: string
        }
        Insert: {
          comment_count?: number | null
          created_at?: string
          id?: string
          like_count?: number | null
          track_artist: string
          track_id: string
          track_title: string
          user_id: string
        }
        Update: {
          comment_count?: number | null
          created_at?: string
          id?: string
          like_count?: number | null
          track_artist?: string
          track_id?: string
          track_title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string | null
          event_id: string | null
          id: string
          music_share_id: string | null
          post_id: string | null
          read: boolean | null
          reel_id: string | null
          reference_user_id: string | null
          story_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          music_share_id?: string | null
          post_id?: string | null
          read?: boolean | null
          reel_id?: string | null
          reference_user_id?: string | null
          story_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          music_share_id?: string | null
          post_id?: string | null
          read?: boolean | null
          reel_id?: string | null
          reference_user_id?: string | null
          story_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          price: number
          product_id: string
          product_image: string
          product_name: string
          quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          price: number
          product_id: string
          product_image: string
          product_name: string
          quantity?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          product_image?: string
          product_name?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_updates: {
        Row: {
          created_at: string | null
          id: string
          message: string
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          order_id: string
          status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_updates_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          id: string
          order_number: string
          payment_method: string
          seller_id: string | null
          shipping_address: string
          shipping_city: string
          shipping_country: string
          shipping_postal_code: string | null
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_number: string
          payment_method: string
          seller_id?: string | null
          shipping_address: string
          shipping_city: string
          shipping_country: string
          shipping_postal_code?: string | null
          status?: string
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_number?: string
          payment_method?: string
          seller_id?: string | null
          shipping_address?: string
          shipping_city?: string
          shipping_country?: string
          shipping_postal_code?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      popular_music: {
        Row: {
          artist: string
          created_at: string
          duration: string
          id: string
          preview_url: string | null
          title: string
          track_id: string
        }
        Insert: {
          artist: string
          created_at?: string
          duration: string
          id?: string
          preview_url?: string | null
          title: string
          track_id: string
        }
        Update: {
          artist?: string
          created_at?: string
          duration?: string
          id?: string
          preview_url?: string | null
          title?: string
          track_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_comment_id: string | null
          post_id: string
          reactions: Json | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_comment_id?: string | null
          post_id: string
          reactions?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          reactions?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          id: string
          post_id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comment_count: number | null
          content: string | null
          created_at: string | null
          id: string
          like_count: number | null
          media_urls: string[] | null
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          comment_count?: number | null
          content?: string | null
          created_at?: string | null
          id?: string
          like_count?: number | null
          media_urls?: string[] | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          comment_count?: number | null
          content?: string | null
          created_at?: string | null
          id?: string
          like_count?: number | null
          media_urls?: string[] | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string | null
          description: string
          id: string
          image_url: string
          is_active: boolean | null
          name: string
          price: number
          seller_id: string
          stock_quantity: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          id?: string
          image_url: string
          is_active?: boolean | null
          name: string
          price: number
          seller_id: string
          stock_quantity?: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          image_url?: string
          is_active?: boolean | null
          name?: string
          price?: number
          seller_id?: string
          stock_quantity?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          id: string
          viewed_at: string | null
          viewed_profile_id: string
          viewer_id: string
        }
        Insert: {
          id?: string
          viewed_at?: string | null
          viewed_profile_id: string
          viewer_id: string
        }
        Update: {
          id?: string
          viewed_at?: string | null
          viewed_profile_id?: string
          viewer_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          badge_level: Database["public"]["Enums"]["badge_level"] | null
          bio: string | null
          career_score: number | null
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          email_verified: boolean | null
          follower_count: number | null
          following_count: number | null
          full_name: string
          id: string
          interests: string[] | null
          is_bot: boolean | null
          phone: string | null
          phone_verified: boolean | null
          post_count: number | null
          postal_code: string | null
          professional_title:
            | Database["public"]["Enums"]["professional_title"]
            | null
          region: string | null
          show_phone: boolean | null
          show_website: boolean | null
          show_whatsapp: boolean | null
          updated_at: string | null
          user_type: string | null
          username: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          badge_level?: Database["public"]["Enums"]["badge_level"] | null
          bio?: string | null
          career_score?: number | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_verified?: boolean | null
          follower_count?: number | null
          following_count?: number | null
          full_name: string
          id: string
          interests?: string[] | null
          is_bot?: boolean | null
          phone?: string | null
          phone_verified?: boolean | null
          post_count?: number | null
          postal_code?: string | null
          professional_title?:
            | Database["public"]["Enums"]["professional_title"]
            | null
          region?: string | null
          show_phone?: boolean | null
          show_website?: boolean | null
          show_whatsapp?: boolean | null
          updated_at?: string | null
          user_type?: string | null
          username: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          badge_level?: Database["public"]["Enums"]["badge_level"] | null
          bio?: string | null
          career_score?: number | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_verified?: boolean | null
          follower_count?: number | null
          following_count?: number | null
          full_name?: string
          id?: string
          interests?: string[] | null
          is_bot?: boolean | null
          phone?: string | null
          phone_verified?: boolean | null
          post_count?: number | null
          postal_code?: string | null
          professional_title?:
            | Database["public"]["Enums"]["professional_title"]
            | null
          region?: string | null
          show_phone?: boolean | null
          show_website?: boolean | null
          show_whatsapp?: boolean | null
          updated_at?: string | null
          user_type?: string | null
          username?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      receiving_qr_codes: {
        Row: {
          created_at: string | null
          id: string
          qr_code_id: string
          to_store_id: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          qr_code_id: string
          to_store_id: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          qr_code_id?: string
          to_store_id?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receiving_qr_codes_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_qr_codes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string | null
          id: string
          ingredients: Json
          instructions: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredients: Json
          instructions?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredients?: Json
          instructions?: string | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      recognitions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          issue_date: string
          issuer: string
          recognition_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          issue_date: string
          issuer: string
          recognition_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          issue_date?: string
          issuer?: string
          recognition_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reel_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_comment_id: string | null
          reactions: Json | null
          reel_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_comment_id?: string | null
          reactions?: Json | null
          reel_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_comment_id?: string | null
          reactions?: Json | null
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "reel_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comments_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_likes: {
        Row: {
          created_at: string | null
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_views: {
        Row: {
          id: string
          reel_id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          id?: string
          reel_id: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          id?: string
          reel_id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reel_views_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          caption: string | null
          comment_count: number | null
          created_at: string | null
          id: string
          like_count: number | null
          thumbnail_url: string | null
          user_id: string
          video_url: string
          view_count: number | null
        }
        Insert: {
          caption?: string | null
          comment_count?: number | null
          created_at?: string | null
          id?: string
          like_count?: number | null
          thumbnail_url?: string | null
          user_id: string
          video_url: string
          view_count?: number | null
        }
        Update: {
          caption?: string | null
          comment_count?: number | null
          created_at?: string | null
          id?: string
          like_count?: number | null
          thumbnail_url?: string | null
          user_id?: string
          video_url?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          report_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data: Json
          id?: string
          report_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          report_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_events: {
        Row: {
          created_at: string | null
          description: string | null
          event_date: string
          event_name: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_date: string
          event_name: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_date?: string
          event_name?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      seller_profiles: {
        Row: {
          business_address: string | null
          business_description: string | null
          business_name: string
          business_phone: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          business_address?: string | null
          business_description?: string | null
          business_name: string
          business_phone?: string | null
          created_at?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          business_address?: string | null
          business_description?: string | null
          business_name?: string
          business_phone?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      spot_check_items: {
        Row: {
          actual_quantity: number | null
          created_at: string | null
          expected_quantity: number | null
          id: string
          inventory_id: string | null
          item_id: string | null
          photo_url: string | null
          reason: string | null
          spot_check_id: string | null
          variance: number | null
          variance_percentage: number | null
        }
        Insert: {
          actual_quantity?: number | null
          created_at?: string | null
          expected_quantity?: number | null
          id?: string
          inventory_id?: string | null
          item_id?: string | null
          photo_url?: string | null
          reason?: string | null
          spot_check_id?: string | null
          variance?: number | null
          variance_percentage?: number | null
        }
        Update: {
          actual_quantity?: number | null
          created_at?: string | null
          expected_quantity?: number | null
          id?: string
          inventory_id?: string | null
          item_id?: string | null
          photo_url?: string | null
          reason?: string | null
          spot_check_id?: string | null
          variance?: number | null
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spot_check_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_check_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_check_items_spot_check_id_fkey"
            columns: ["spot_check_id"]
            isOneToOne: false
            referencedRelation: "inventory_spot_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      spotify_connections: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          scope: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          scope: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          scope?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      staff_allocations: {
        Row: {
          allocation_date: string
          created_at: string | null
          id: string
          notes: string | null
          responsibilities: string[] | null
          shift_type: string
          staff_member_id: string
          station_assignment: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allocation_date: string
          created_at?: string | null
          id?: string
          notes?: string | null
          responsibilities?: string[] | null
          shift_type: string
          staff_member_id: string
          station_assignment: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allocation_date?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          responsibilities?: string[] | null
          shift_type?: string
          staff_member_id?: string
          station_assignment?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_allocations_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          area_allocation: string | null
          break_timings: Json | null
          created_at: string | null
          email: string | null
          id: string
          invitation_sent_at: string | null
          invitation_status: string | null
          is_active: boolean | null
          linked_user_id: string | null
          name: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          area_allocation?: string | null
          break_timings?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          invitation_sent_at?: string | null
          invitation_status?: string | null
          is_active?: boolean | null
          linked_user_id?: string | null
          name: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          area_allocation?: string | null
          break_timings?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          invitation_sent_at?: string | null
          invitation_status?: string | null
          is_active?: boolean | null
          linked_user_id?: string | null
          name?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      staff_schedules: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          schedule_date: string
          shift_type: string
          staff_member_id: string
          station_type: string
          updated_at: string | null
          user_id: string
          week_number: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          schedule_date: string
          shift_type: string
          staff_member_id: string
          station_type: string
          updated_at?: string | null
          user_id: string
          week_number: number
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          schedule_date?: string
          shift_type?: string
          staff_member_id?: string
          station_type?: string
          updated_at?: string | null
          user_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedules_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      status_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          status_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          status_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          status_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_reactions_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "user_status"
            referencedColumns: ["id"]
          },
        ]
      }
      status_replies: {
        Row: {
          content: string
          created_at: string | null
          id: string
          status_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          status_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          status_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_replies_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "user_status"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_alert_settings: {
        Row: {
          alert_recipients: string[]
          alert_time: string | null
          created_at: string
          enabled: boolean
          id: string
          minimum_quantity_threshold: number
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          alert_recipients?: string[]
          alert_time?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          minimum_quantity_threshold?: number
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          alert_recipients?: string[]
          alert_time?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          minimum_quantity_threshold?: number
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fifo_alert_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          area: string
          created_at: string
          id: string
          is_active: boolean | null
          manager_id: string | null
          name: string
          store_type: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          address?: string | null
          area: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name: string
          store_type?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          address?: string | null
          area?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name?: string
          store_type?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          comment_count: number | null
          created_at: string | null
          expires_at: string | null
          filters: Json | null
          id: string
          like_count: number | null
          media_types: string[]
          media_urls: string[]
          music_data: Json | null
          text_overlays: Json | null
          trim_data: Json | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          comment_count?: number | null
          created_at?: string | null
          expires_at?: string | null
          filters?: Json | null
          id?: string
          like_count?: number | null
          media_types?: string[]
          media_urls?: string[]
          music_data?: Json | null
          text_overlays?: Json | null
          trim_data?: Json | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          comment_count?: number | null
          created_at?: string | null
          expires_at?: string | null
          filters?: Json | null
          id?: string
          like_count?: number | null
          media_types?: string[]
          media_urls?: string[]
          music_data?: Json | null
          text_overlays?: Json | null
          trim_data?: Json | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      story_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          reactions: Json | null
          story_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          reactions?: Json | null
          story_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          reactions?: Json | null
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      story_likes: {
        Row: {
          created_at: string | null
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_likes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          id?: string
          story_id: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          id?: string
          story_id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          id: string
          status: Database["public"]["Enums"]["subscription_status"] | null
          subscription_ends_at: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          subscription_ends_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          subscription_ends_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reminders: {
        Row: {
          created_at: string | null
          id: string
          remind_at: string
          sent: boolean | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          remind_at: string
          sent?: boolean | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          remind_at?: string
          sent?: boolean | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reminders_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          category: string | null
          checklist: Json | null
          created_at: string | null
          description: string | null
          estimated_hours: number | null
          id: string
          name: string
          priority: string | null
          tags: string[] | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          checklist?: Json | null
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          name: string
          priority?: string | null
          tags?: string[] | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          checklist?: Json | null
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          name?: string
          priority?: string | null
          tags?: string[] | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          attachments: Json | null
          category: string | null
          checklist: Json | null
          completed_at: string | null
          created_at: string | null
          deadline: string | null
          dependencies: string[] | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          parent_task_id: string | null
          priority: string | null
          progress: number | null
          status: string | null
          tags: string[] | null
          task_number: string | null
          team_id: string | null
          time_tracking: Json | null
          title: string
          updated_at: string | null
          user_id: string
          watchers: string[] | null
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          attachments?: Json | null
          category?: string | null
          checklist?: Json | null
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          dependencies?: string[] | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          parent_task_id?: string | null
          priority?: string | null
          progress?: number | null
          status?: string | null
          tags?: string[] | null
          task_number?: string | null
          team_id?: string | null
          time_tracking?: Json | null
          title: string
          updated_at?: string | null
          user_id: string
          watchers?: string[] | null
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          attachments?: Json | null
          category?: string | null
          checklist?: Json | null
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          dependencies?: string[] | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          parent_task_id?: string | null
          priority?: string | null
          progress?: number | null
          status?: string | null
          tags?: string[] | null
          task_number?: string | null
          team_id?: string | null
          time_tracking?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
          watchers?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invited_email: string
          invited_user_id: string | null
          role: string
          status: string
          team_id: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_email: string
          invited_user_id?: string | null
          role?: string
          status?: string
          team_id: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          invited_user_id?: string | null
          role?: string
          status?: string
          team_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string | null
          role: string
          team_id: string
          title: string | null
          user_id: string
          workload_capacity: number | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string
          team_id: string
          title?: string | null
          user_id: string
          workload_capacity?: number | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string
          team_id?: string
          title?: string | null
          user_id?: string
          workload_capacity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      temperature_logs: {
        Row: {
          created_at: string | null
          equipment_id: string
          id: string
          notes: string | null
          recorded_at: string | null
          temperature: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          equipment_id: string
          id?: string
          notes?: string | null
          recorded_at?: string | null
          temperature: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          equipment_id?: string
          id?: string
          notes?: string | null
          recorded_at?: string | null
          temperature?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "temperature_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          started_at: string
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at: string
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          end_date: string
          id: string
          reason: string | null
          start_date: string
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      transfer_qr_codes: {
        Row: {
          created_at: string
          from_store_id: string
          id: string
          qr_code_id: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          from_store_id: string
          id?: string
          qr_code_id: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          from_store_id?: string
          id?: string
          qr_code_id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_qr_codes_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_qr_codes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          created_at: string
          from_store_id: string
          id: string
          item_id: string
          quantity: number
          received_at: string | null
          to_store_id: string
          transfer_date: string | null
          transferred_by: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_store_id: string
          id?: string
          item_id: string
          quantity: number
          received_at?: string | null
          to_store_id: string
          transfer_date?: string | null
          transferred_by: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_store_id?: string
          id?: string
          item_id?: string
          quantity?: number
          received_at?: string | null
          to_store_id?: string
          transfer_date?: string | null
          transferred_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_status: {
        Row: {
          created_at: string
          emoji: string | null
          expires_at: string
          id: string
          reaction_count: number | null
          reply_count: number | null
          status_text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          expires_at?: string
          id?: string
          reaction_count?: number | null
          reply_count?: number | null
          status_text: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          expires_at?: string
          id?: string
          reaction_count?: number | null
          reply_count?: number | null
          status_text?: string
          user_id?: string
        }
        Relationships: []
      }
      variance_reports: {
        Row: {
          created_at: string | null
          id: string
          items_with_variance: number | null
          notes: string | null
          report_data: Json | null
          report_date: string | null
          store_id: string | null
          total_items_checked: number | null
          total_variance_value: number | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          items_with_variance?: number | null
          notes?: string | null
          report_data?: Json | null
          report_date?: string | null
          store_id?: string | null
          total_items_checked?: number | null
          total_variance_value?: number | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          items_with_variance?: number | null
          notes?: string | null
          report_data?: Json | null
          report_date?: string | null
          store_id?: string | null
          total_items_checked?: number | null
          total_variance_value?: number | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variance_reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variance_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          city: string
          contact_email: string | null
          country: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          owner_id: string | null
          region: string
          show_contact_email: boolean | null
          type: string
          verified: boolean | null
        }
        Insert: {
          address?: string | null
          city: string
          contact_email?: string | null
          country?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          owner_id?: string | null
          region: string
          show_contact_email?: boolean | null
          type: string
          verified?: boolean | null
        }
        Update: {
          address?: string | null
          city?: string
          contact_email?: string | null
          country?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          region?: string
          show_contact_email?: boolean | null
          type?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      weekly_schedules: {
        Row: {
          created_at: string | null
          daily_events: Json | null
          id: string
          schedule_data: Json
          special_events: Json | null
          updated_at: string | null
          user_id: string
          venue_name: string | null
          week_start_date: string
        }
        Insert: {
          created_at?: string | null
          daily_events?: Json | null
          id?: string
          schedule_data: Json
          special_events?: Json | null
          updated_at?: string | null
          user_id: string
          venue_name?: string | null
          week_start_date: string
        }
        Update: {
          created_at?: string | null
          daily_events?: Json | null
          id?: string
          schedule_data?: Json
          special_events?: Json | null
          updated_at?: string | null
          user_id?: string
          venue_name?: string | null
          week_start_date?: string
        }
        Relationships: []
      }
      work_experiences: {
        Row: {
          company_name: string
          created_at: string | null
          description: string | null
          employment_type: string
          end_date: string | null
          id: string
          is_current: boolean | null
          is_project: boolean | null
          location: string | null
          position: string
          project_link: string | null
          skills: string[] | null
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string | null
          description?: string | null
          employment_type: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          is_project?: boolean | null
          location?: string | null
          position: string
          project_link?: string | null
          skills?: string[] | null
          start_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string | null
          description?: string | null
          employment_type?: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          is_project?: boolean | null
          location?: string | null
          position?: string
          project_link?: string | null
          skills?: string[] | null
          start_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          actions: Json
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_config: Json
          trigger_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actions: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_config: Json
          trigger_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actions?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workspace_member_permissions: {
        Row: {
          can_approve_transfers: boolean | null
          can_manage_members: boolean | null
          can_receive: boolean | null
          can_spot_check: boolean | null
          can_transfer: boolean | null
          can_view_reports: boolean | null
          created_at: string | null
          id: string
          updated_at: string | null
          workspace_member_id: string | null
        }
        Insert: {
          can_approve_transfers?: boolean | null
          can_manage_members?: boolean | null
          can_receive?: boolean | null
          can_spot_check?: boolean | null
          can_transfer?: boolean | null
          can_view_reports?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          workspace_member_id?: string | null
        }
        Update: {
          can_approve_transfers?: boolean | null
          can_manage_members?: boolean | null
          can_receive?: boolean | null
          can_spot_check?: boolean | null
          can_transfer?: boolean | null
          can_view_reports?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          workspace_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_member_permissions_workspace_member_id_fkey"
            columns: ["workspace_member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_member_permissions_workspace_member_id_fkey"
            columns: ["workspace_member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string | null
          permissions: Json | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Json | null
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Json | null
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          settings: Json | null
          updated_at: string | null
          workspace_type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id: string
          settings?: Json | null
          updated_at?: string | null
          workspace_type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          settings?: Json | null
          updated_at?: string | null
          workspace_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      profiles_secure: {
        Row: {
          address: string | null
          avatar_url: string | null
          badge_level: Database["public"]["Enums"]["badge_level"] | null
          bio: string | null
          career_score: number | null
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          email_verified: boolean | null
          follower_count: number | null
          following_count: number | null
          full_name: string | null
          id: string | null
          interests: string[] | null
          is_bot: boolean | null
          phone: string | null
          phone_verified: boolean | null
          post_count: number | null
          postal_code: string | null
          professional_title:
            | Database["public"]["Enums"]["professional_title"]
            | null
          region: string | null
          show_phone: boolean | null
          show_website: boolean | null
          show_whatsapp: boolean | null
          updated_at: string | null
          user_type: string | null
          username: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          badge_level?: Database["public"]["Enums"]["badge_level"] | null
          bio?: string | null
          career_score?: number | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_verified?: boolean | null
          follower_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string | null
          interests?: string[] | null
          is_bot?: boolean | null
          phone?: never
          phone_verified?: boolean | null
          post_count?: number | null
          postal_code?: string | null
          professional_title?:
            | Database["public"]["Enums"]["professional_title"]
            | null
          region?: string | null
          show_phone?: boolean | null
          show_website?: boolean | null
          show_whatsapp?: boolean | null
          updated_at?: string | null
          user_type?: string | null
          username?: string | null
          website?: never
          whatsapp?: never
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          badge_level?: Database["public"]["Enums"]["badge_level"] | null
          bio?: string | null
          career_score?: number | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_verified?: boolean | null
          follower_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string | null
          interests?: string[] | null
          is_bot?: boolean | null
          phone?: never
          phone_verified?: boolean | null
          post_count?: number | null
          postal_code?: string | null
          professional_title?:
            | Database["public"]["Enums"]["professional_title"]
            | null
          region?: string | null
          show_phone?: boolean | null
          show_website?: boolean | null
          show_whatsapp?: boolean | null
          updated_at?: string | null
          user_type?: string | null
          username?: string | null
          website?: never
          whatsapp?: never
        }
        Relationships: []
      }
      workspace_members_with_owner: {
        Row: {
          id: string | null
          invited_by: string | null
          joined_at: string | null
          permissions: Json | null
          role: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          id?: string | null
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Json | null
          role?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          id?: string | null
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Json | null
          role?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_fifo_priority: {
        Args: { p_expiration_date: string; p_received_date: string }
        Returns: number
      }
      create_notification: {
        Args: {
          p_content: string
          p_event_id?: string
          p_music_share_id?: string
          p_post_id?: string
          p_reel_id?: string
          p_reference_user_id?: string
          p_story_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      expire_team_invitations: { Args: never; Returns: undefined }
      get_member_workload: {
        Args: { member_team_id: string; member_user_id: string }
        Returns: number
      }
      get_task_hierarchy: {
        Args: { task_id: string }
        Returns: {
          id: string
          level: number
          title: string
        }[]
      }
      get_team_stats: {
        Args: { team_uuid: string }
        Returns: {
          completed_tasks: number
          in_progress_tasks: number
          pending_tasks: number
          total_hours_logged: number
          total_members: number
          total_tasks: number
        }[]
      }
      get_unread_message_count: {
        Args: { p_channel_id: string; p_user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_task_manager_access: { Args: { _user_id: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_founder: { Args: { user_id: string }; Returns: boolean }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_verified: { Args: { user_id: string }; Returns: boolean }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      notify_friends_birthday: { Args: never; Returns: undefined }
      recalculate_follow_counts: { Args: never; Returns: undefined }
      update_business_analytics: { Args: never; Returns: undefined }
      update_expired_events: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "user"
        | "moderator"
        | "admin"
        | "founder"
        | "verified"
        | "manager"
        | "seller"
        | "buyer"
      badge_level: "bronze" | "silver" | "gold" | "platinum"
      equipment_type:
        | "fridge"
        | "freezer"
        | "walk_in_fridge"
        | "walk_in_freezer"
        | "chest_freezer"
        | "under_counter"
        | "tall_fridge"
        | "chiller"
        | "super_freezer"
      professional_title:
        | "bartender"
        | "mixologist"
        | "bar_manager"
        | "beverage_director"
        | "sommelier"
        | "brand_ambassador"
        | "distributor"
        | "investor"
        | "manufacturer"
        | "consultant"
        | "founder_of_specverse"
      subscription_status: "trial" | "active" | "expired" | "cancelled"
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
        "user",
        "moderator",
        "admin",
        "founder",
        "verified",
        "manager",
        "seller",
        "buyer",
      ],
      badge_level: ["bronze", "silver", "gold", "platinum"],
      equipment_type: [
        "fridge",
        "freezer",
        "walk_in_fridge",
        "walk_in_freezer",
        "chest_freezer",
        "under_counter",
        "tall_fridge",
        "chiller",
        "super_freezer",
      ],
      professional_title: [
        "bartender",
        "mixologist",
        "bar_manager",
        "beverage_director",
        "sommelier",
        "brand_ambassador",
        "distributor",
        "investor",
        "manufacturer",
        "consultant",
        "founder_of_specverse",
      ],
      subscription_status: ["trial", "active", "expired", "cancelled"],
    },
  },
} as const
