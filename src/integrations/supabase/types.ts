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
      approval_comments: {
        Row: {
          approval_request_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          approval_request_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          approval_request_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_comments_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "studio_approval_requests"
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
          photos: string[] | null
        }
        Insert: {
          area_id: string
          capacity?: string | null
          created_at?: string | null
          equipment_type: string
          id?: string
          name: string
          notes?: string | null
          photos?: string[] | null
        }
        Update: {
          area_id?: string
          capacity?: string | null
          created_at?: string | null
          equipment_type?: string
          id?: string
          name?: string
          notes?: string | null
          photos?: string[] | null
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
      automation_logs: {
        Row: {
          error_message: string | null
          executed_at: string | null
          id: string
          payload: Json | null
          response: Json | null
          status: string
          trigger_id: string | null
          user_id: string
          webhook_id: string | null
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          id?: string
          payload?: Json | null
          response?: Json | null
          status: string
          trigger_id?: string | null
          user_id: string
          webhook_id?: string | null
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          id?: string
          payload?: Json | null
          response?: Json | null
          status?: string
          trigger_id?: string | null
          user_id?: string
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "automation_triggers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "automation_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_template_installs: {
        Row: {
          id: string
          installed_at: string | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          installed_at?: string | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          installed_at?: string | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_template_installs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "automation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_template_reviews: {
        Row: {
          created_at: string | null
          id: string
          rating: number | null
          review_text: string | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rating?: number | null
          review_text?: string | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rating?: number | null
          review_text?: string | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_template_reviews_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "automation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_templates: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          install_count: number | null
          is_public: boolean | null
          name: string
          rating: number | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          workflow_data: Json
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          install_count?: number | null
          is_public?: boolean | null
          name: string
          rating?: number | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          workflow_data: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          install_count?: number | null
          is_public?: boolean | null
          name?: string
          rating?: number | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          workflow_data?: Json
        }
        Relationships: []
      }
      automation_triggers: {
        Row: {
          conditions: Json | null
          config: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          next_run_at: string | null
          schedule_cron: string | null
          schedule_enabled: boolean | null
          trigger_type: string
          updated_at: string | null
          user_id: string
          webhook_id: string | null
        }
        Insert: {
          conditions?: Json | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          schedule_cron?: string | null
          schedule_enabled?: boolean | null
          trigger_type: string
          updated_at?: string | null
          user_id: string
          webhook_id?: string | null
        }
        Update: {
          conditions?: Json | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          schedule_cron?: string | null
          schedule_enabled?: boolean | null
          trigger_type?: string
          updated_at?: string | null
          user_id?: string
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_triggers_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "automation_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_webhooks: {
        Row: {
          config: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          trigger_count: number | null
          updated_at: string | null
          user_id: string
          webhook_type: string
          webhook_url: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          trigger_count?: number | null
          updated_at?: string | null
          user_id: string
          webhook_type: string
          webhook_url: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          trigger_count?: number | null
          updated_at?: string | null
          user_id?: string
          webhook_type?: string
          webhook_url?: string
        }
        Relationships: []
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
      batch_production_ingredients: {
        Row: {
          created_at: string
          id: string
          ingredient_name: string
          original_amount: number
          production_id: string
          scaled_amount: number
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_name: string
          original_amount: number
          production_id: string
          scaled_amount: number
          unit: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_name?: string
          original_amount?: number
          production_id?: string
          scaled_amount?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_production_ingredients_production_id_fkey"
            columns: ["production_id"]
            isOneToOne: false
            referencedRelation: "batch_productions"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_productions: {
        Row: {
          batch_name: string
          created_at: string
          group_id: string | null
          id: string
          notes: string | null
          produced_by_email: string | null
          produced_by_name: string | null
          produced_by_user_id: string | null
          production_date: string
          qr_code_data: string | null
          recipe_id: string
          target_liters: number
          target_serves: number
          user_id: string
        }
        Insert: {
          batch_name: string
          created_at?: string
          group_id?: string | null
          id?: string
          notes?: string | null
          produced_by_email?: string | null
          produced_by_name?: string | null
          produced_by_user_id?: string | null
          production_date?: string
          qr_code_data?: string | null
          recipe_id: string
          target_liters: number
          target_serves: number
          user_id: string
        }
        Update: {
          batch_name?: string
          created_at?: string
          group_id?: string | null
          id?: string
          notes?: string | null
          produced_by_email?: string | null
          produced_by_name?: string | null
          produced_by_user_id?: string | null
          production_date?: string
          qr_code_data?: string | null
          recipe_id?: string
          target_liters?: number
          target_serves?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_productions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "batch_recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batch_productions_group_id"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "mixologist_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_qr_codes: {
        Row: {
          created_at: string | null
          expires_at: string | null
          group_id: string | null
          id: string
          is_active: boolean | null
          recipe_data: Json
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          recipe_data: Json
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          recipe_data?: Json
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_batch_qr_group"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "mixologist_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_recipes: {
        Row: {
          created_at: string
          current_serves: number
          description: string | null
          group_id: string | null
          id: string
          ingredients: Json
          recipe_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_serves?: number
          description?: string | null
          group_id?: string | null
          id?: string
          ingredients?: Json
          recipe_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_serves?: number
          description?: string | null
          group_id?: string | null
          id?: string
          ingredients?: Json
          recipe_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_recipes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "mixologist_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_actuals: {
        Row: {
          actual_amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          source: string | null
          transaction_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_amount?: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          source?: string | null
          transaction_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          source?: string | null
          transaction_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          budget_amount: number
          category: string
          created_at: string
          id: string
          notes: string | null
          period: string
          period_end: string
          period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_amount?: number
          category: string
          created_at?: string
          id?: string
          notes?: string | null
          period?: string
          period_end: string
          period_start: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_amount?: number
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          period?: string
          period_end?: string
          period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      career_activities: {
        Row: {
          achievement_date: string | null
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          title: string
          user_id: string
        }
        Insert: {
          achievement_date?: string | null
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          title: string
          user_id: string
        }
        Update: {
          achievement_date?: string | null
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      career_profiles: {
        Row: {
          career_goals: string[] | null
          certifications: string[] | null
          created_at: string | null
          experience_years: number | null
          id: string
          interests: string[] | null
          preferred_locations: string[] | null
          role_title: string | null
          skills: string[] | null
          target_positions: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          career_goals?: string[] | null
          certifications?: string[] | null
          created_at?: string | null
          experience_years?: number | null
          id?: string
          interests?: string[] | null
          preferred_locations?: string[] | null
          role_title?: string | null
          skills?: string[] | null
          target_positions?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          career_goals?: string[] | null
          certifications?: string[] | null
          created_at?: string | null
          experience_years?: number | null
          id?: string
          interests?: string[] | null
          preferred_locations?: string[] | null
          role_title?: string | null
          skills?: string[] | null
          target_positions?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      career_recommendations: {
        Row: {
          ai_reasoning: string | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          priority: number | null
          recommendation_type: string
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          recommendation_type: string
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          ai_reasoning?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          recommendation_type?: string
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
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
      creator_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["creator_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["creator_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["creator_role"]
          user_id?: string
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
      exam_answers: {
        Row: {
          ai_feedback: string | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string
          selected_answer: string | null
          selected_options: Json | null
          session_id: string
          time_taken_seconds: number | null
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id: string
          selected_answer?: string | null
          selected_options?: Json | null
          session_id: string
          time_taken_seconds?: number | null
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string
          selected_answer?: string | null
          selected_options?: Json | null
          session_id?: string
          time_taken_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_badge_levels: {
        Row: {
          benefits: string[] | null
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          max_score: number
          min_score: number
          name: string
          sort_order: number | null
        }
        Insert: {
          benefits?: string[] | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          max_score: number
          min_score: number
          name: string
          sort_order?: number | null
        }
        Update: {
          benefits?: string[] | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          max_score?: number
          min_score?: number
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      exam_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      exam_certificates: {
        Row: {
          badge_level_id: string | null
          category_id: string | null
          certificate_number: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_verified: boolean | null
          issued_at: string | null
          metadata: Json | null
          pdf_url: string | null
          percentage: number
          score: number
          session_id: string | null
          user_id: string
        }
        Insert: {
          badge_level_id?: string | null
          category_id?: string | null
          certificate_number?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_verified?: boolean | null
          issued_at?: string | null
          metadata?: Json | null
          pdf_url?: string | null
          percentage: number
          score: number
          session_id?: string | null
          user_id: string
        }
        Update: {
          badge_level_id?: string | null
          category_id?: string | null
          certificate_number?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_verified?: boolean | null
          issued_at?: string | null
          metadata?: Json | null
          pdf_url?: string | null
          percentage?: number
          score?: number
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_certificates_badge_level_id_fkey"
            columns: ["badge_level_id"]
            isOneToOne: false
            referencedRelation: "exam_badge_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_certificates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exam_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_certificates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_performance: {
        Row: {
          average_score: number | null
          best_score: number | null
          category_id: string | null
          correct_answers: number | null
          created_at: string | null
          current_badge_level_id: string | null
          id: string
          improvement_plan: Json | null
          last_exam_date: string | null
          strength_areas: Json | null
          total_exams_taken: number | null
          total_questions_answered: number | null
          updated_at: string | null
          user_id: string
          weakness_areas: Json | null
        }
        Insert: {
          average_score?: number | null
          best_score?: number | null
          category_id?: string | null
          correct_answers?: number | null
          created_at?: string | null
          current_badge_level_id?: string | null
          id?: string
          improvement_plan?: Json | null
          last_exam_date?: string | null
          strength_areas?: Json | null
          total_exams_taken?: number | null
          total_questions_answered?: number | null
          updated_at?: string | null
          user_id: string
          weakness_areas?: Json | null
        }
        Update: {
          average_score?: number | null
          best_score?: number | null
          category_id?: string | null
          correct_answers?: number | null
          created_at?: string | null
          current_badge_level_id?: string | null
          id?: string
          improvement_plan?: Json | null
          last_exam_date?: string | null
          strength_areas?: Json | null
          total_exams_taken?: number | null
          total_questions_answered?: number | null
          updated_at?: string | null
          user_id?: string
          weakness_areas?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_performance_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exam_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_performance_current_badge_level_id_fkey"
            columns: ["current_badge_level_id"]
            isOneToOne: false
            referencedRelation: "exam_badge_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          category_id: string | null
          correct_answer: string | null
          created_at: string | null
          created_by: string | null
          difficulty: string | null
          explanation: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          options: Json | null
          points: number | null
          question_media_url: string | null
          question_text: string
          question_type: string
          sort_order: number | null
          tags: string[] | null
          time_limit_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          correct_answer?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          options?: Json | null
          points?: number | null
          question_media_url?: string | null
          question_text: string
          question_type?: string
          sort_order?: number | null
          tags?: string[] | null
          time_limit_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          correct_answer?: string | null
          created_at?: string | null
          created_by?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          options?: Json | null
          points?: number | null
          question_media_url?: string | null
          question_text?: string
          question_type?: string
          sort_order?: number | null
          tags?: string[] | null
          time_limit_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exam_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sessions: {
        Row: {
          ai_analysis: Json | null
          answered_questions: number | null
          badge_level_id: string | null
          category_id: string | null
          correct_answers: number | null
          created_at: string | null
          exam_type: string
          id: string
          max_possible_score: number | null
          metadata: Json | null
          percentage_score: number | null
          status: string | null
          time_ended: string | null
          time_spent_seconds: number | null
          time_started: string | null
          total_questions: number | null
          total_score: number | null
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          answered_questions?: number | null
          badge_level_id?: string | null
          category_id?: string | null
          correct_answers?: number | null
          created_at?: string | null
          exam_type?: string
          id?: string
          max_possible_score?: number | null
          metadata?: Json | null
          percentage_score?: number | null
          status?: string | null
          time_ended?: string | null
          time_spent_seconds?: number | null
          time_started?: string | null
          total_questions?: number | null
          total_score?: number | null
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          answered_questions?: number | null
          badge_level_id?: string | null
          category_id?: string | null
          correct_answers?: number | null
          created_at?: string | null
          exam_type?: string
          id?: string
          max_possible_score?: number | null
          metadata?: Json | null
          percentage_score?: number | null
          status?: string | null
          time_ended?: string | null
          time_spent_seconds?: number | null
          time_started?: string | null
          total_questions?: number | null
          total_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_badge_level_id_fkey"
            columns: ["badge_level_id"]
            isOneToOne: false
            referencedRelation: "exam_badge_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exam_categories"
            referencedColumns: ["id"]
          },
        ]
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
      gm_approval_requests: {
        Row: {
          ai_recommendation: string | null
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          outlet_id: string | null
          payback_months: number | null
          priority: string | null
          rejection_reason: string | null
          requested_by: string
          risk_score: string | null
          roi_percentage: number | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_recommendation?: string | null
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          outlet_id?: string | null
          payback_months?: number | null
          priority?: string | null
          rejection_reason?: string | null
          requested_by: string
          risk_score?: string | null
          roi_percentage?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_recommendation?: string | null
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          outlet_id?: string | null
          payback_months?: number | null
          priority?: string | null
          rejection_reason?: string | null
          requested_by?: string
          risk_score?: string | null
          roi_percentage?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gm_approval_requests_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      gm_financial_metrics: {
        Row: {
          average_check: number | null
          beverage_cost_percentage: number | null
          covers: number | null
          created_at: string | null
          food_cost_percentage: number | null
          gp_percentage: number | null
          gross_profit: number | null
          id: string
          labor_cost_percentage: number | null
          outlet_id: string | null
          period_end: string
          period_start: string
          total_cost: number | null
          total_revenue: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_check?: number | null
          beverage_cost_percentage?: number | null
          covers?: number | null
          created_at?: string | null
          food_cost_percentage?: number | null
          gp_percentage?: number | null
          gross_profit?: number | null
          id?: string
          labor_cost_percentage?: number | null
          outlet_id?: string | null
          period_end: string
          period_start: string
          total_cost?: number | null
          total_revenue?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_check?: number | null
          beverage_cost_percentage?: number | null
          covers?: number | null
          created_at?: string | null
          food_cost_percentage?: number | null
          gp_percentage?: number | null
          gross_profit?: number | null
          id?: string
          labor_cost_percentage?: number | null
          outlet_id?: string | null
          period_end?: string
          period_start?: string
          total_cost?: number | null
          total_revenue?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gm_financial_metrics_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      gm_inventory_predictions: {
        Row: {
          ai_suggestion: string | null
          created_at: string | null
          current_stock: number | null
          excess_stock_warning: boolean | null
          id: string
          item_name: string
          outlet_id: string | null
          predicted_shortage_date: string | null
          reorder_recommendation: string | null
          user_id: string
          waste_risk_value: number | null
        }
        Insert: {
          ai_suggestion?: string | null
          created_at?: string | null
          current_stock?: number | null
          excess_stock_warning?: boolean | null
          id?: string
          item_name: string
          outlet_id?: string | null
          predicted_shortage_date?: string | null
          reorder_recommendation?: string | null
          user_id: string
          waste_risk_value?: number | null
        }
        Update: {
          ai_suggestion?: string | null
          created_at?: string | null
          current_stock?: number | null
          excess_stock_warning?: boolean | null
          id?: string
          item_name?: string
          outlet_id?: string | null
          predicted_shortage_date?: string | null
          reorder_recommendation?: string | null
          user_id?: string
          waste_risk_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gm_inventory_predictions_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      gm_opportunities: {
        Row: {
          ai_analysis: string | null
          created_at: string | null
          description: string | null
          id: string
          implementation_effort: string | null
          opportunity_type: string
          outlet_id: string | null
          projected_revenue_increase: number | null
          projected_savings: number | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          ai_analysis?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          implementation_effort?: string | null
          opportunity_type: string
          outlet_id?: string | null
          projected_revenue_increase?: number | null
          projected_savings?: number | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          ai_analysis?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          implementation_effort?: string | null
          opportunity_type?: string
          outlet_id?: string | null
          projected_revenue_increase?: number | null
          projected_savings?: number | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gm_opportunities_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      gm_risk_alerts: {
        Row: {
          affected_item: string | null
          created_at: string | null
          description: string | null
          id: string
          outlet_id: string | null
          potential_cost_impact: number | null
          recommended_action: string | null
          resolved_at: string | null
          risk_type: string
          severity: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          affected_item?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          outlet_id?: string | null
          potential_cost_impact?: number | null
          recommended_action?: string | null
          resolved_at?: string | null
          risk_type: string
          severity?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          affected_item?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          outlet_id?: string | null
          potential_cost_impact?: number | null
          recommended_action?: string | null
          resolved_at?: string | null
          risk_type?: string
          severity?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gm_risk_alerts_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      gm_staff_performance: {
        Row: {
          ai_development_plan: string | null
          badges: Json | null
          complaints_score: number | null
          created_at: string | null
          guest_impact_rating: number | null
          id: string
          outlet_id: string | null
          overall_value_score: number | null
          period_end: string
          period_start: string
          revenue_contribution: number | null
          sales_conversion_rate: number | null
          speed_of_execution: number | null
          staff_member_id: string
          strengths: string[] | null
          training_completion_percentage: number | null
          upselling_success_rate: number | null
          user_id: string
          weaknesses: string[] | null
        }
        Insert: {
          ai_development_plan?: string | null
          badges?: Json | null
          complaints_score?: number | null
          created_at?: string | null
          guest_impact_rating?: number | null
          id?: string
          outlet_id?: string | null
          overall_value_score?: number | null
          period_end: string
          period_start: string
          revenue_contribution?: number | null
          sales_conversion_rate?: number | null
          speed_of_execution?: number | null
          staff_member_id: string
          strengths?: string[] | null
          training_completion_percentage?: number | null
          upselling_success_rate?: number | null
          user_id: string
          weaknesses?: string[] | null
        }
        Update: {
          ai_development_plan?: string | null
          badges?: Json | null
          complaints_score?: number | null
          created_at?: string | null
          guest_impact_rating?: number | null
          id?: string
          outlet_id?: string | null
          overall_value_score?: number | null
          period_end?: string
          period_start?: string
          revenue_contribution?: number | null
          sales_conversion_rate?: number | null
          speed_of_execution?: number | null
          staff_member_id?: string
          strengths?: string[] | null
          training_completion_percentage?: number | null
          upselling_success_rate?: number | null
          user_id?: string
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "gm_staff_performance_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
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
      history_events: {
        Row: {
          created_at: string
          draft_id: string | null
          event_data: Json | null
          event_type: string
          id: string
          post_id: string | null
          reel_id: string | null
          user_id: string
          version_number: number | null
        }
        Insert: {
          created_at?: string
          draft_id?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          post_id?: string | null
          reel_id?: string | null
          user_id: string
          version_number?: number | null
        }
        Update: {
          created_at?: string
          draft_id?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          post_id?: string | null
          reel_id?: string | null
          user_id?: string
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "history_events_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "studio_drafts"
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
      item_aliases: {
        Row: {
          alias: string
          category: string | null
          created_at: string | null
          id: string
          is_global: boolean | null
          item_name: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          alias: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_global?: boolean | null
          item_name: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          alias?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_global?: boolean | null
          item_name?: string
          user_id?: string | null
          workspace_id?: string | null
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
      lab_ops_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          outlet_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          outlet_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          outlet_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_audit_logs_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_bar_variance: {
        Row: {
          actual_consumption: number | null
          closing_stock: number | null
          created_at: string | null
          id: string
          ingredient_master_id: string | null
          opening_stock: number | null
          outlet_id: string | null
          period_end: string
          period_start: string
          purchases: number | null
          theoretical_consumption: number | null
          transfers_in: number | null
          transfers_out: number | null
          variance_cost: number | null
          variance_percent: number | null
          variance_qty: number | null
        }
        Insert: {
          actual_consumption?: number | null
          closing_stock?: number | null
          created_at?: string | null
          id?: string
          ingredient_master_id?: string | null
          opening_stock?: number | null
          outlet_id?: string | null
          period_end: string
          period_start: string
          purchases?: number | null
          theoretical_consumption?: number | null
          transfers_in?: number | null
          transfers_out?: number | null
          variance_cost?: number | null
          variance_percent?: number | null
          variance_qty?: number | null
        }
        Update: {
          actual_consumption?: number | null
          closing_stock?: number | null
          created_at?: string | null
          id?: string
          ingredient_master_id?: string | null
          opening_stock?: number | null
          outlet_id?: string | null
          period_end?: string
          period_start?: string
          purchases?: number | null
          theoretical_consumption?: number | null
          transfers_in?: number | null
          transfers_out?: number | null
          variance_cost?: number | null
          variance_percent?: number | null
          variance_qty?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_bar_variance_ingredient_master_id_fkey"
            columns: ["ingredient_master_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_ingredients_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_bar_variance_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_bartender_daily_stats: {
        Row: {
          avg_time_seconds: number | null
          bartender_id: string
          created_at: string | null
          efficiency_score: number | null
          id: string
          max_time_seconds: number | null
          min_time_seconds: number | null
          outlet_id: string
          shift_date: string | null
          station_id: string | null
          total_drinks_served: number | null
          updated_at: string | null
        }
        Insert: {
          avg_time_seconds?: number | null
          bartender_id: string
          created_at?: string | null
          efficiency_score?: number | null
          id?: string
          max_time_seconds?: number | null
          min_time_seconds?: number | null
          outlet_id: string
          shift_date?: string | null
          station_id?: string | null
          total_drinks_served?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_time_seconds?: number | null
          bartender_id?: string
          created_at?: string | null
          efficiency_score?: number | null
          id?: string
          max_time_seconds?: number | null
          min_time_seconds?: number | null
          outlet_id?: string
          shift_date?: string | null
          station_id?: string | null
          total_drinks_served?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_bartender_daily_stats_bartender_id_fkey"
            columns: ["bartender_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_bartender_daily_stats_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_bartender_daily_stats_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_bartender_item_performance: {
        Row: {
          bartender_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          menu_item_id: string
          order_item_id: string
          outlet_id: string
          shift_date: string | null
          started_at: string
          station_id: string | null
          time_seconds: number | null
        }
        Insert: {
          bartender_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          menu_item_id: string
          order_item_id: string
          outlet_id: string
          shift_date?: string | null
          started_at: string
          station_id?: string | null
          time_seconds?: number | null
        }
        Update: {
          bartender_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          menu_item_id?: string
          order_item_id?: string
          outlet_id?: string
          shift_date?: string | null
          started_at?: string
          station_id?: string | null
          time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_bartender_item_performance_bartender_id_fkey"
            columns: ["bartender_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_bartender_item_performance_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_bartender_item_performance_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_bartender_item_performance_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_bartender_item_performance_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_bottles: {
        Row: {
          bottle_name: string
          bottle_size_ml: number
          created_at: string
          current_level_ml: number
          id: string
          initial_level_ml: number
          item_id: string | null
          outlet_id: string
          pourer_id: string | null
          registered_at: string
          registered_by: string | null
          spirit_type: string
          status: string
          updated_at: string
        }
        Insert: {
          bottle_name: string
          bottle_size_ml?: number
          created_at?: string
          current_level_ml?: number
          id?: string
          initial_level_ml?: number
          item_id?: string | null
          outlet_id: string
          pourer_id?: string | null
          registered_at?: string
          registered_by?: string | null
          spirit_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          bottle_name?: string
          bottle_size_ml?: number
          created_at?: string
          current_level_ml?: number
          id?: string
          initial_level_ml?: number
          item_id?: string | null
          outlet_id?: string
          pourer_id?: string | null
          registered_at?: string
          registered_by?: string | null
          spirit_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_bottles_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_bottles_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
          outlet_id: string
          parent_id: string | null
          sort_order: number | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          outlet_id: string
          parent_id?: string | null
          sort_order?: number | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          outlet_id?: string
          parent_id?: string | null
          sort_order?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_categories_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_complimentary_log: {
        Row: {
          approved_by: string | null
          check_id: string | null
          comp_date: string
          cost_value: number | null
          created_at: string | null
          id: string
          menu_item_id: string | null
          outlet_id: string | null
          qty: number
          reason: string | null
        }
        Insert: {
          approved_by?: string | null
          check_id?: string | null
          comp_date?: string
          cost_value?: number | null
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          outlet_id?: string | null
          qty?: number
          reason?: string | null
        }
        Update: {
          approved_by?: string | null
          check_id?: string | null
          comp_date?: string
          cost_value?: number | null
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          outlet_id?: string | null
          qty?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_complimentary_log_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "lab_ops_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_complimentary_log_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_complimentary_log_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_daily_sales_summary: {
        Row: {
          avg_check: number | null
          beverage_revenue: number | null
          comp_total: number | null
          created_at: string | null
          discount_total: number | null
          food_revenue: number | null
          id: string
          outlet_id: string | null
          package_revenue: number | null
          sales_date: string
          total_covers: number | null
          total_orders: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          avg_check?: number | null
          beverage_revenue?: number | null
          comp_total?: number | null
          created_at?: string | null
          discount_total?: number | null
          food_revenue?: number | null
          id?: string
          outlet_id?: string | null
          package_revenue?: number | null
          sales_date: string
          total_covers?: number | null
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_check?: number | null
          beverage_revenue?: number | null
          comp_total?: number | null
          created_at?: string | null
          discount_total?: number | null
          food_revenue?: number | null
          id?: string
          outlet_id?: string | null
          package_revenue?: number | null
          sales_date?: string
          total_covers?: number | null
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_daily_sales_summary_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_data_imports: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_log: Json | null
          file_name: string | null
          id: string
          import_type: string
          imported_by: string | null
          outlet_id: string | null
          records_failed: number | null
          records_imported: number | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_log?: Json | null
          file_name?: string | null
          id?: string
          import_type: string
          imported_by?: string | null
          outlet_id?: string | null
          records_failed?: number | null
          records_imported?: number | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_log?: Json | null
          file_name?: string | null
          id?: string
          import_type?: string
          imported_by?: string | null
          outlet_id?: string | null
          records_failed?: number | null
          records_imported?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_data_imports_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_floor_plans: {
        Row: {
          background_image: string | null
          canvas_height: number | null
          canvas_width: number | null
          created_at: string | null
          floor_number: number | null
          id: string
          is_active: boolean | null
          name: string
          outlet_id: string
          updated_at: string | null
        }
        Insert: {
          background_image?: string | null
          canvas_height?: number | null
          canvas_width?: number | null
          created_at?: string | null
          floor_number?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          outlet_id: string
          updated_at?: string | null
        }
        Update: {
          background_image?: string | null
          canvas_height?: number | null
          canvas_width?: number | null
          created_at?: string | null
          floor_number?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          outlet_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_floor_plans_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_goods_receipt_lines: {
        Row: {
          batch_no: string | null
          created_at: string | null
          expiry_date: string | null
          final_unit_cost: number | null
          goods_receipt_id: string
          id: string
          inventory_item_id: string
          qty_received: number
        }
        Insert: {
          batch_no?: string | null
          created_at?: string | null
          expiry_date?: string | null
          final_unit_cost?: number | null
          goods_receipt_id: string
          id?: string
          inventory_item_id: string
          qty_received: number
        }
        Update: {
          batch_no?: string | null
          created_at?: string | null
          expiry_date?: string | null
          final_unit_cost?: number | null
          goods_receipt_id?: string
          id?: string
          inventory_item_id?: string
          qty_received?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_goods_receipt_lines_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_goods_receipt_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_goods_receipts: {
        Row: {
          created_at: string | null
          id: string
          location_id: string | null
          notes: string | null
          purchase_order_id: string
          received_by: string | null
          received_date: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          purchase_order_id: string
          received_by?: string | null
          received_date?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          purchase_order_id?: string
          received_by?: string | null
          received_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_goods_receipts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_goods_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_guest_feedback: {
        Row: {
          created_at: string | null
          feedback_date: string
          free_text: string | null
          id: string
          outlet_id: string | null
          rating_ambience: number | null
          rating_beverage: number | null
          rating_food: number | null
          rating_overall: number | null
          rating_service: number | null
          source: string | null
          staff_id: string | null
        }
        Insert: {
          created_at?: string | null
          feedback_date?: string
          free_text?: string | null
          id?: string
          outlet_id?: string | null
          rating_ambience?: number | null
          rating_beverage?: number | null
          rating_food?: number | null
          rating_overall?: number | null
          rating_service?: number | null
          source?: string | null
          staff_id?: string | null
        }
        Update: {
          created_at?: string | null
          feedback_date?: string
          free_text?: string | null
          id?: string
          outlet_id?: string | null
          rating_ambience?: number | null
          rating_beverage?: number | null
          rating_food?: number | null
          rating_overall?: number | null
          rating_service?: number | null
          source?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_guest_feedback_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_guest_feedback_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_ingredients_master: {
        Row: {
          base_unit_ml: number | null
          category: string | null
          created_at: string | null
          id: string
          ingredient_id: string
          ingredient_name: string
          is_bar_stock: boolean | null
          outlet_id: string | null
          standard_cost: number | null
          sub_category: string | null
          supplier_id: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          base_unit_ml?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          ingredient_id: string
          ingredient_name: string
          is_bar_stock?: boolean | null
          outlet_id?: string | null
          standard_cost?: number | null
          sub_category?: string | null
          supplier_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Update: {
          base_unit_ml?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          ingredient_id?: string
          ingredient_name?: string
          is_bar_stock?: boolean | null
          outlet_id?: string | null
          standard_cost?: number | null
          sub_category?: string | null
          supplier_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_ingredients_master_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_ingredients_master_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_inventory_counts: {
        Row: {
          count_datetime: string
          count_id: string
          count_type: string
          created_at: string | null
          created_by: string | null
          id: string
          ingredient_master_id: string | null
          location: string | null
          notes: string | null
          outlet_id: string | null
          qty_on_hand: number
        }
        Insert: {
          count_datetime?: string
          count_id: string
          count_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          ingredient_master_id?: string | null
          location?: string | null
          notes?: string | null
          outlet_id?: string | null
          qty_on_hand?: number
        }
        Update: {
          count_datetime?: string
          count_id?: string
          count_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          ingredient_master_id?: string | null
          location?: string | null
          notes?: string | null
          outlet_id?: string | null
          qty_on_hand?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_inventory_counts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "lab_ops_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_inventory_counts_ingredient_master_id_fkey"
            columns: ["ingredient_master_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_ingredients_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_inventory_counts_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_inventory_item_costs: {
        Row: {
          created_at: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          inventory_item_id: string
          supplier_id: string | null
          unit_cost: number
        }
        Insert: {
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          inventory_item_id: string
          supplier_id?: string | null
          unit_cost: number
        }
        Update: {
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          inventory_item_id?: string
          supplier_id?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_inventory_item_costs_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_inventory_item_costs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_inventory_items: {
        Row: {
          base_unit: string | null
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          outlet_id: string
          par_level: number | null
          sku: string | null
          updated_at: string | null
        }
        Insert: {
          base_unit?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          outlet_id: string
          par_level?: number | null
          sku?: string | null
          updated_at?: string | null
        }
        Update: {
          base_unit?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          outlet_id?: string
          par_level?: number | null
          sku?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_inventory_items_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_inventory_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          ingredient_master_id: string | null
          movement_datetime: string
          movement_id: string
          movement_type: string
          notes: string | null
          outlet_id: string | null
          qty: number
          supplier_id: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          ingredient_master_id?: string | null
          movement_datetime?: string
          movement_id: string
          movement_type: string
          notes?: string | null
          outlet_id?: string | null
          qty: number
          supplier_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          ingredient_master_id?: string | null
          movement_datetime?: string
          movement_id?: string
          movement_type?: string
          notes?: string | null
          outlet_id?: string | null
          qty?: number
          supplier_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "lab_ops_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_inventory_movements_ingredient_master_id_fkey"
            columns: ["ingredient_master_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_ingredients_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_inventory_movements_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_inventory_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_item_performance: {
        Row: {
          cost: number | null
          created_at: string | null
          id: string
          menu_item_id: string | null
          outlet_id: string | null
          period_end: string
          period_start: string
          popularity_rank: number | null
          profit: number | null
          profit_margin: number | null
          qty_sold: number | null
          revenue: number | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          outlet_id?: string | null
          period_end: string
          period_start: string
          popularity_rank?: number | null
          profit?: number | null
          profit_margin?: number | null
          qty_sold?: number | null
          revenue?: number | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          outlet_id?: string | null
          period_end?: string
          period_start?: string
          popularity_rank?: number | null
          profit?: number | null
          profit_margin?: number | null
          qty_sold?: number | null
          revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_item_performance_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_item_performance_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_locations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          outlet_id: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          outlet_id: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          outlet_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_locations_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_menu_item_modifiers: {
        Row: {
          id: string
          is_required: boolean | null
          menu_item_id: string
          modifier_id: string
        }
        Insert: {
          id?: string
          is_required?: boolean | null
          menu_item_id: string
          modifier_id: string
        }
        Update: {
          id?: string
          is_required?: boolean | null
          menu_item_id?: string
          modifier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_menu_item_modifiers_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_menu_item_modifiers_modifier_id_fkey"
            columns: ["modifier_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_modifiers"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_menu_item_stations: {
        Row: {
          id: string
          menu_item_id: string
          priority: number | null
          station_id: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          priority?: number | null
          station_id: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          priority?: number | null
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_menu_item_stations_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_menu_item_stations_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_menu_items: {
        Row: {
          base_price: number
          category_id: string | null
          created_at: string | null
          default_serving_ml: number | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_bar_item: boolean | null
          is_package: boolean | null
          is_recipe_based: boolean | null
          item_type: string | null
          name: string
          outlet_id: string
          sub_category: string | null
          tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          base_price: number
          category_id?: string | null
          created_at?: string | null
          default_serving_ml?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_bar_item?: boolean | null
          is_package?: boolean | null
          is_recipe_based?: boolean | null
          item_type?: string | null
          name: string
          outlet_id: string
          sub_category?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          default_serving_ml?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_bar_item?: boolean | null
          is_package?: boolean | null
          is_recipe_based?: boolean | null
          item_type?: string | null
          name?: string
          outlet_id?: string
          sub_category?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_menu_items_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_modifiers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          outlet_id: string
          price_delta: number | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          outlet_id: string
          price_delta?: number | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          outlet_id?: string
          price_delta?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_modifiers_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_order_items: {
        Row: {
          bartender_id: string | null
          course: number | null
          created_at: string | null
          discount_amount: number | null
          id: string
          menu_item_id: string
          modifiers: Json | null
          note: string | null
          notified_at: string | null
          order_id: string
          qty: number | null
          ready_at: string | null
          sent_at: string | null
          server_notified: boolean | null
          started_at: string | null
          station_id: string | null
          status:
            | Database["public"]["Enums"]["lab_ops_order_item_status"]
            | null
          tax_amount: number | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          bartender_id?: string | null
          course?: number | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          menu_item_id: string
          modifiers?: Json | null
          note?: string | null
          notified_at?: string | null
          order_id: string
          qty?: number | null
          ready_at?: string | null
          sent_at?: string | null
          server_notified?: boolean | null
          started_at?: string | null
          station_id?: string | null
          status?:
            | Database["public"]["Enums"]["lab_ops_order_item_status"]
            | null
          tax_amount?: number | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          bartender_id?: string | null
          course?: number | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          menu_item_id?: string
          modifiers?: Json | null
          note?: string | null
          notified_at?: string | null
          order_id?: string
          qty?: number | null
          ready_at?: string | null
          sent_at?: string | null
          server_notified?: boolean | null
          started_at?: string | null
          station_id?: string | null
          status?:
            | Database["public"]["Enums"]["lab_ops_order_item_status"]
            | null
          tax_amount?: number | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_order_items_bartender_id_fkey"
            columns: ["bartender_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_order_items_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_order_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          notification_type: string
          order_id: string
          order_item_id: string | null
          outlet_id: string
          server_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type?: string
          order_id: string
          order_item_id?: string | null
          outlet_id: string
          server_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type?: string
          order_id?: string
          order_item_id?: string | null
          outlet_id?: string
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_order_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_order_notifications_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_order_notifications_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_order_notifications_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_orders: {
        Row: {
          closed_at: string | null
          covers: number | null
          created_at: string | null
          discount_total: number | null
          id: string
          notes: string | null
          opened_at: string | null
          outlet_id: string
          server_id: string | null
          service_charge: number | null
          status: Database["public"]["Enums"]["lab_ops_order_status"] | null
          subtotal: number | null
          table_id: string | null
          tax_total: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          covers?: number | null
          created_at?: string | null
          discount_total?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          outlet_id: string
          server_id?: string | null
          service_charge?: number | null
          status?: Database["public"]["Enums"]["lab_ops_order_status"] | null
          subtotal?: number | null
          table_id?: string | null
          tax_total?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          covers?: number | null
          created_at?: string | null
          discount_total?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          outlet_id?: string
          server_id?: string | null
          service_charge?: number | null
          status?: Database["public"]["Enums"]["lab_ops_order_status"] | null
          subtotal?: number | null
          table_id?: string | null
          tax_total?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_orders_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_orders_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_outlets: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          seating_capacity: number | null
          settings: Json | null
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          seating_capacity?: number | null
          settings?: Json | null
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          seating_capacity?: number | null
          settings?: Json | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lab_ops_package_items: {
        Row: {
          created_at: string | null
          id: string
          max_qty_per_guest: number | null
          menu_item_id: string | null
          package_session_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_qty_per_guest?: number | null
          menu_item_id?: string | null
          package_session_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_qty_per_guest?: number | null
          menu_item_id?: string | null
          package_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_package_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_package_items_package_session_id_fkey"
            columns: ["package_session_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_package_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_package_sessions: {
        Row: {
          created_at: string | null
          end_datetime: string | null
          guest_count: number | null
          id: string
          outlet_id: string | null
          package_name: string
          package_price_per_guest: number | null
          package_type: string | null
          start_datetime: string
          status: string | null
          total_package_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_datetime?: string | null
          guest_count?: number | null
          id?: string
          outlet_id?: string | null
          package_name: string
          package_price_per_guest?: number | null
          package_type?: string | null
          start_datetime: string
          status?: string | null
          total_package_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_datetime?: string | null
          guest_count?: number | null
          id?: string
          outlet_id?: string | null
          package_name?: string
          package_price_per_guest?: number | null
          package_type?: string | null
          start_datetime?: string
          status?: string | null
          total_package_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_package_sessions_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          order_id: string
          payment_method: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          order_id: string
          payment_method: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          order_id?: string
          payment_method?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_pourer_readings: {
        Row: {
          bottle_id: string
          created_at: string
          id: string
          ml_dispensed: number
          new_level_ml: number | null
          notes: string | null
          outlet_id: string
          pour_duration_seconds: number | null
          previous_level_ml: number | null
          reading_timestamp: string
          recorded_by: string | null
          source: string | null
        }
        Insert: {
          bottle_id: string
          created_at?: string
          id?: string
          ml_dispensed: number
          new_level_ml?: number | null
          notes?: string | null
          outlet_id: string
          pour_duration_seconds?: number | null
          previous_level_ml?: number | null
          reading_timestamp?: string
          recorded_by?: string | null
          source?: string | null
        }
        Update: {
          bottle_id?: string
          created_at?: string
          id?: string
          ml_dispensed?: number
          new_level_ml?: number | null
          notes?: string | null
          outlet_id?: string
          pour_duration_seconds?: number | null
          previous_level_ml?: number | null
          reading_timestamp?: string
          recorded_by?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_pourer_readings_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_bottles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_pourer_readings_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_price_changes: {
        Row: {
          created_at: string | null
          created_by: string | null
          effective_date: string
          id: string
          menu_item_id: string | null
          new_price: number
          old_price: number
          outlet_id: string | null
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          id?: string
          menu_item_id?: string | null
          new_price: number
          old_price: number
          outlet_id?: string | null
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          id?: string
          menu_item_id?: string | null
          new_price?: number
          old_price?: number
          outlet_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_price_changes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "lab_ops_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_price_changes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_price_changes_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_purchase_order_lines: {
        Row: {
          created_at: string | null
          id: string
          inventory_item_id: string
          purchase_order_id: string
          qty_ordered: number
          qty_received: number | null
          unit_cost: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_item_id: string
          purchase_order_id: string
          qty_ordered: number
          qty_received?: number | null
          unit_cost: number
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_item_id?: string
          purchase_order_id?: string
          qty_ordered?: number
          qty_received?: number | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_purchase_order_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          expected_delivery: string | null
          id: string
          notes: string | null
          outlet_id: string
          po_date: string | null
          po_number: string | null
          status: Database["public"]["Enums"]["lab_ops_po_status"] | null
          supplier_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          outlet_id: string
          po_date?: string | null
          po_number?: string | null
          status?: Database["public"]["Enums"]["lab_ops_po_status"] | null
          supplier_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          outlet_id?: string
          po_date?: string | null
          po_number?: string | null
          status?: Database["public"]["Enums"]["lab_ops_po_status"] | null
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_purchase_orders_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_recipe_costing: {
        Row: {
          created_at: string | null
          id: string
          ingredient_master_id: string | null
          menu_item_id: string | null
          outlet_id: string | null
          qty_per_serving: number
          unit: string
          waste_factor: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_master_id?: string | null
          menu_item_id?: string | null
          outlet_id?: string | null
          qty_per_serving?: number
          unit?: string
          waste_factor?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_master_id?: string | null
          menu_item_id?: string | null
          outlet_id?: string | null
          qty_per_serving?: number
          unit?: string
          waste_factor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_recipe_costing_ingredient_master_id_fkey"
            columns: ["ingredient_master_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_ingredients_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_recipe_costing_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_recipe_costing_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_recipe_ingredients: {
        Row: {
          created_at: string | null
          id: string
          inventory_item_id: string
          qty: number
          recipe_id: string
          unit: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_item_id: string
          qty: number
          recipe_id: string
          unit: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_item_id?: string
          qty?: number
          recipe_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_recipe_ingredients_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_recipes: {
        Row: {
          created_at: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          menu_item_id: string
          updated_at: string | null
          version_number: number | null
          yield_qty: number | null
          yield_unit: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          menu_item_id: string
          updated_at?: string | null
          version_number?: number | null
          yield_qty?: number | null
          yield_unit?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          menu_item_id?: string
          updated_at?: string | null
          version_number?: number | null
          yield_qty?: number | null
          yield_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_reservations: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          notes: string | null
          outlet_id: string
          party_size: number
          reservation_date: string
          reservation_time: string
          seated_at: string | null
          special_requests: string | null
          status: string
          table_id: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          outlet_id: string
          party_size?: number
          reservation_date: string
          reservation_time: string
          seated_at?: string | null
          special_requests?: string | null
          status?: string
          table_id?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          outlet_id?: string
          party_size?: number
          reservation_date?: string
          reservation_time?: string
          seated_at?: string | null
          special_requests?: string | null
          status?: string
          table_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_reservations_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_sales: {
        Row: {
          created_at: string
          id: string
          item_name: string
          ml_per_serving: number
          order_id: string | null
          outlet_id: string
          pos_transaction_id: string | null
          quantity: number
          sold_at: string
          sold_by: string | null
          spirit_type: string | null
          total_ml_sold: number
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          ml_per_serving: number
          order_id?: string | null
          outlet_id: string
          pos_transaction_id?: string | null
          quantity?: number
          sold_at?: string
          sold_by?: string | null
          spirit_type?: string | null
          total_ml_sold: number
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          ml_per_serving?: number
          order_id?: string | null
          outlet_id?: string
          pos_transaction_id?: string | null
          quantity?: number
          sold_at?: string
          sold_by?: string | null
          spirit_type?: string | null
          total_ml_sold?: number
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_sales_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_sales_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_sales_transactions: {
        Row: {
          check_id: string | null
          created_at: string | null
          discount_amount: number | null
          gross_amount: number
          id: string
          is_complimentary: boolean | null
          menu_item_id: string | null
          net_amount: number
          outlet_id: string | null
          package_session_id: string | null
          qty: number
          staff_id: string | null
          table_id: string | null
          txn_datetime: string
          txn_id: string
        }
        Insert: {
          check_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          gross_amount?: number
          id?: string
          is_complimentary?: boolean | null
          menu_item_id?: string | null
          net_amount?: number
          outlet_id?: string | null
          package_session_id?: string | null
          qty?: number
          staff_id?: string | null
          table_id?: string | null
          txn_datetime?: string
          txn_id: string
        }
        Update: {
          check_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          gross_amount?: number
          id?: string
          is_complimentary?: boolean | null
          menu_item_id?: string | null
          net_amount?: number
          outlet_id?: string | null
          package_session_id?: string | null
          qty?: number
          staff_id?: string | null
          table_id?: string | null
          txn_datetime?: string
          txn_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_sales_transactions_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_sales_transactions_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_sales_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_sales_transactions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_staff: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          outlet_id: string
          permissions: Json | null
          pin_code: string | null
          role: Database["public"]["Enums"]["lab_ops_role"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          outlet_id: string
          permissions?: Json | null
          pin_code?: string | null
          role?: Database["public"]["Enums"]["lab_ops_role"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          outlet_id?: string
          permissions?: Json | null
          pin_code?: string | null
          role?: Database["public"]["Enums"]["lab_ops_role"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_staff_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_staff_performance: {
        Row: {
          avg_check: number | null
          created_at: string | null
          feedback_avg: number | null
          hours_worked: number | null
          id: string
          orders_handled: number | null
          outlet_id: string | null
          period_end: string
          period_start: string
          revenue_generated: number | null
          staff_id: string | null
          tips_collected: number | null
        }
        Insert: {
          avg_check?: number | null
          created_at?: string | null
          feedback_avg?: number | null
          hours_worked?: number | null
          id?: string
          orders_handled?: number | null
          outlet_id?: string | null
          period_end: string
          period_start: string
          revenue_generated?: number | null
          staff_id?: string | null
          tips_collected?: number | null
        }
        Update: {
          avg_check?: number | null
          created_at?: string | null
          feedback_avg?: number | null
          hours_worked?: number | null
          id?: string
          orders_handled?: number | null
          outlet_id?: string | null
          period_end?: string
          period_start?: string
          revenue_generated?: number | null
          staff_id?: string | null
          tips_collected?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_staff_performance_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_staff_performance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_staff_shifts: {
        Row: {
          created_at: string | null
          hours_worked: number | null
          id: string
          outlet_id: string | null
          role_for_shift: string | null
          shift_date: string
          staff_id: string | null
          time_in: string | null
          time_out: string | null
        }
        Insert: {
          created_at?: string | null
          hours_worked?: number | null
          id?: string
          outlet_id?: string | null
          role_for_shift?: string | null
          shift_date: string
          staff_id?: string | null
          time_in?: string | null
          time_out?: string | null
        }
        Update: {
          created_at?: string | null
          hours_worked?: number | null
          id?: string
          outlet_id?: string | null
          role_for_shift?: string | null
          shift_date?: string
          staff_id?: string | null
          time_in?: string | null
          time_out?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_staff_shifts_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_staff_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_station_consumption: {
        Row: {
          created_at: string | null
          id: string
          ingredient_id: string
          outlet_id: string
          physical_consumption_ml: number | null
          shift_date: string | null
          sop_consumption_ml: number | null
          station_id: string
          updated_at: string | null
          variance_ml: number | null
          variance_percent: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_id: string
          outlet_id: string
          physical_consumption_ml?: number | null
          shift_date?: string | null
          sop_consumption_ml?: number | null
          station_id: string
          updated_at?: string | null
          variance_ml?: number | null
          variance_percent?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_id?: string
          outlet_id?: string
          physical_consumption_ml?: number | null
          shift_date?: string | null
          sop_consumption_ml?: number | null
          station_id?: string
          updated_at?: string | null
          variance_ml?: number | null
          variance_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_station_consumption_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_station_consumption_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_station_consumption_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_stations: {
        Row: {
          assigned_bartender_id: string | null
          assigned_tables: number[] | null
          category_filter: Json | null
          created_at: string | null
          current_load: number | null
          id: string
          is_active: boolean | null
          max_orders_capacity: number | null
          name: string
          occupancy_threshold: number | null
          outlet_id: string
          overflow_station_id: string | null
          printer_config: Json | null
          type: string
        }
        Insert: {
          assigned_bartender_id?: string | null
          assigned_tables?: number[] | null
          category_filter?: Json | null
          created_at?: string | null
          current_load?: number | null
          id?: string
          is_active?: boolean | null
          max_orders_capacity?: number | null
          name: string
          occupancy_threshold?: number | null
          outlet_id: string
          overflow_station_id?: string | null
          printer_config?: Json | null
          type: string
        }
        Update: {
          assigned_bartender_id?: string | null
          assigned_tables?: number[] | null
          category_filter?: Json | null
          created_at?: string | null
          current_load?: number | null
          id?: string
          is_active?: boolean | null
          max_orders_capacity?: number | null
          name?: string
          occupancy_threshold?: number | null
          outlet_id?: string
          overflow_station_id?: string | null
          printer_config?: Json | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_stations_assigned_bartender_id_fkey"
            columns: ["assigned_bartender_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_stations_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_stations_overflow_station_id_fkey"
            columns: ["overflow_station_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_stock_levels: {
        Row: {
          id: string
          inventory_item_id: string
          location_id: string
          quantity: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          inventory_item_id: string
          location_id: string
          quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          inventory_item_id?: string
          location_id?: string
          quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_stock_levels_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_stock_levels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_stock_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          from_location_id: string | null
          id: string
          inventory_item_id: string
          movement_type: Database["public"]["Enums"]["lab_ops_movement_type"]
          notes: string | null
          qty: number
          reference_id: string | null
          reference_type: string | null
          to_location_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          from_location_id?: string | null
          id?: string
          inventory_item_id: string
          movement_type: Database["public"]["Enums"]["lab_ops_movement_type"]
          notes?: string | null
          qty: number
          reference_id?: string | null
          reference_type?: string | null
          to_location_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          from_location_id?: string | null
          id?: string
          inventory_item_id?: string
          movement_type?: Database["public"]["Enums"]["lab_ops_movement_type"]
          notes?: string | null
          qty?: number
          reference_id?: string | null
          reference_type?: string | null
          to_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_stock_movements_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_stock_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_stock_movements_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_stock_take_lines: {
        Row: {
          counted_qty: number | null
          created_at: string | null
          id: string
          inventory_item_id: string
          stock_take_id: string
          system_qty: number | null
          variance_cost: number | null
          variance_qty: number | null
        }
        Insert: {
          counted_qty?: number | null
          created_at?: string | null
          id?: string
          inventory_item_id: string
          stock_take_id: string
          system_qty?: number | null
          variance_cost?: number | null
          variance_qty?: number | null
        }
        Update: {
          counted_qty?: number | null
          created_at?: string | null
          id?: string
          inventory_item_id?: string
          stock_take_id?: string
          system_qty?: number | null
          variance_cost?: number | null
          variance_qty?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_stock_take_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_stock_take_lines_stock_take_id_fkey"
            columns: ["stock_take_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_stock_takes"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_stock_takes: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          location_id: string | null
          outlet_id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location_id?: string | null
          outlet_id: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location_id?: string | null
          outlet_id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_stock_takes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_stock_takes_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          lead_time_days: number | null
          name: string
          outlet_id: string
          payment_terms: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          name: string
          outlet_id: string
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          name?: string
          outlet_id?: string
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_suppliers_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_tables: {
        Row: {
          allocation: string | null
          capacity: number | null
          created_at: string | null
          floor_plan_id: string | null
          height: number | null
          id: string
          is_reservable: boolean | null
          min_covers: number | null
          name: string
          notes: string | null
          outlet_id: string
          position_x: number | null
          position_y: number | null
          shape: string | null
          standing_capacity: number | null
          status: Database["public"]["Enums"]["lab_ops_table_status"] | null
          table_number: number | null
          turnover_count: number | null
          updated_at: string | null
          width: number | null
        }
        Insert: {
          allocation?: string | null
          capacity?: number | null
          created_at?: string | null
          floor_plan_id?: string | null
          height?: number | null
          id?: string
          is_reservable?: boolean | null
          min_covers?: number | null
          name: string
          notes?: string | null
          outlet_id: string
          position_x?: number | null
          position_y?: number | null
          shape?: string | null
          standing_capacity?: number | null
          status?: Database["public"]["Enums"]["lab_ops_table_status"] | null
          table_number?: number | null
          turnover_count?: number | null
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          allocation?: string | null
          capacity?: number | null
          created_at?: string | null
          floor_plan_id?: string | null
          height?: number | null
          id?: string
          is_reservable?: boolean | null
          min_covers?: number | null
          name?: string
          notes?: string | null
          outlet_id?: string
          position_x?: number | null
          position_y?: number | null
          shape?: string | null
          standing_capacity?: number | null
          status?: Database["public"]["Enums"]["lab_ops_table_status"] | null
          table_number?: number | null
          turnover_count?: number | null
          updated_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_tables_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_tables_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_variance_reports: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          outlet_id: string
          period_end: string
          period_start: string
          physical_ml_consumed: number
          report_date: string
          reviewed_at: string | null
          reviewed_by: string | null
          spirit_type: string | null
          status: string | null
          variance_ml: number
          variance_percentage: number
          virtual_ml_sold: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          outlet_id: string
          period_end: string
          period_start: string
          physical_ml_consumed?: number
          report_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          spirit_type?: string | null
          status?: string | null
          variance_ml?: number
          variance_percentage?: number
          virtual_ml_sold?: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          outlet_id?: string
          period_end?: string
          period_start?: string
          physical_ml_consumed?: number
          report_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          spirit_type?: string | null
          status?: string | null
          variance_ml?: number
          variance_percentage?: number
          virtual_ml_sold?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_variance_reports_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_variance_thresholds: {
        Row: {
          created_at: string
          critical_threshold_percentage: number
          id: string
          outlet_id: string
          spirit_type: string | null
          updated_at: string
          warning_threshold_percentage: number
        }
        Insert: {
          created_at?: string
          critical_threshold_percentage?: number
          id?: string
          outlet_id: string
          spirit_type?: string | null
          updated_at?: string
          warning_threshold_percentage?: number
        }
        Update: {
          created_at?: string
          critical_threshold_percentage?: number
          id?: string
          outlet_id?: string
          spirit_type?: string | null
          updated_at?: string
          warning_threshold_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_variance_thresholds_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_venue_capacity: {
        Row: {
          created_at: string | null
          id: string
          max_occupancy: number | null
          notes: string | null
          outlet_id: string
          total_seated_capacity: number | null
          total_standing_capacity: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_occupancy?: number | null
          notes?: string | null
          outlet_id: string
          total_seated_capacity?: number | null
          total_standing_capacity?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_occupancy?: number | null
          notes?: string | null
          outlet_id?: string
          total_seated_capacity?: number | null
          total_standing_capacity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_venue_capacity_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: true
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_void_reasons: {
        Row: {
          code: string
          description: string | null
          id: string
          outlet_id: string
        }
        Insert: {
          code: string
          description?: string | null
          id?: string
          outlet_id: string
        }
        Update: {
          code?: string
          description?: string | null
          id?: string
          outlet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_void_reasons_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_ops_voids: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          order_item_id: string
          reason_id: string | null
          staff_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_item_id: string
          reason_id?: string | null
          staff_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_item_id?: string
          reason_id?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_ops_voids_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_voids_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_void_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_ops_voids_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "lab_ops_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      livestream_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          livestream_id: string
          reactions: Json | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          livestream_id: string
          reactions?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          livestream_id?: string
          reactions?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "livestream_comments_livestream_id_fkey"
            columns: ["livestream_id"]
            isOneToOne: false
            referencedRelation: "livestreams"
            referencedColumns: ["id"]
          },
        ]
      }
      livestream_viewers: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          livestream_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          livestream_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          livestream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "livestream_viewers_livestream_id_fkey"
            columns: ["livestream_id"]
            isOneToOne: false
            referencedRelation: "livestreams"
            referencedColumns: ["id"]
          },
        ]
      }
      livestreams: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          peak_viewers: number | null
          started_at: string | null
          status: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          user_id: string
          viewer_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          peak_viewers?: number | null
          started_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          viewer_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          peak_viewers?: number | null
          started_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          viewer_count?: number | null
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
      master_spirits: {
        Row: {
          bottle_size_ml: number
          brand: string | null
          category: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bottle_size_ml?: number
          brand?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bottle_size_ml?: number
          brand?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      matrix_document_chunks: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string | null
          document_id: string
          id: string
          keywords: string[] | null
          metadata: Json | null
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          created_at?: string | null
          document_id: string
          id?: string
          keywords?: string[] | null
          metadata?: Json | null
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string | null
          document_id?: string
          id?: string
          keywords?: string[] | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "matrix_document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "matrix_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      matrix_documents: {
        Row: {
          created_at: string | null
          document_type: string | null
          extracted_text: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          filename: string
          id: string
          is_processed: boolean | null
          metadata: Json | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          document_type?: string | null
          extracted_text?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          filename: string
          id?: string
          is_processed?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string | null
          extracted_text?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          filename?: string
          id?: string
          is_processed?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
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
      matrix_logs: {
        Row: {
          created_at: string | null
          device: string | null
          entities: Json | null
          error_message: string | null
          id: string
          intent: string | null
          raw_transcript: string | null
          response_summary: string | null
          response_time_ms: number | null
          success: boolean | null
          user_id: string
          wake_phrase: string | null
        }
        Insert: {
          created_at?: string | null
          device?: string | null
          entities?: Json | null
          error_message?: string | null
          id?: string
          intent?: string | null
          raw_transcript?: string | null
          response_summary?: string | null
          response_time_ms?: number | null
          success?: boolean | null
          user_id: string
          wake_phrase?: string | null
        }
        Update: {
          created_at?: string | null
          device?: string | null
          entities?: Json | null
          error_message?: string | null
          id?: string
          intent?: string | null
          raw_transcript?: string | null
          response_summary?: string | null
          response_time_ms?: number | null
          success?: boolean | null
          user_id?: string
          wake_phrase?: string | null
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
      matrix_user_preferences: {
        Row: {
          created_at: string | null
          custom_wake_phrases: string[] | null
          id: string
          tone_mode: string | null
          updated_at: string | null
          user_id: string
          voice_pitch: number | null
          voice_speed: number | null
          wake_phrase_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          custom_wake_phrases?: string[] | null
          id?: string
          tone_mode?: string | null
          updated_at?: string | null
          user_id: string
          voice_pitch?: number | null
          voice_speed?: number | null
          wake_phrase_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          custom_wake_phrases?: string[] | null
          id?: string
          tone_mode?: string | null
          updated_at?: string | null
          user_id?: string
          voice_pitch?: number | null
          voice_speed?: number | null
          wake_phrase_enabled?: boolean | null
        }
        Relationships: []
      }
      matrix_wake_phrases: {
        Row: {
          created_at: string | null
          device: string | null
          id: string
          phrase_text: string
          recognized: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device?: string | null
          id?: string
          phrase_text: string
          recognized?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device?: string | null
          id?: string
          phrase_text?: string
          recognized?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          asset_type: string
          created_at: string
          draft_id: string | null
          duration_ms: number | null
          file_size: number | null
          height: number | null
          hls_manifest_url: string | null
          id: string
          metadata_json: Json | null
          mime_type: string | null
          processing_error: string | null
          public_url: string | null
          renditions: Json | null
          status: string
          storage_path: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          asset_type: string
          created_at?: string
          draft_id?: string | null
          duration_ms?: number | null
          file_size?: number | null
          height?: number | null
          hls_manifest_url?: string | null
          id?: string
          metadata_json?: Json | null
          mime_type?: string | null
          processing_error?: string | null
          public_url?: string | null
          renditions?: Json | null
          status?: string
          storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          asset_type?: string
          created_at?: string
          draft_id?: string | null
          duration_ms?: number | null
          file_size?: number | null
          height?: number | null
          hls_manifest_url?: string | null
          id?: string
          metadata_json?: Json | null
          mime_type?: string | null
          processing_error?: string | null
          public_url?: string | null
          renditions?: Json | null
          status?: string
          storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "studio_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_analysis: {
        Row: {
          analysis_date: string | null
          avg_food_cost_pct: number | null
          created_at: string | null
          dogs_count: number | null
          id: string
          period_end: string | null
          period_start: string | null
          plowhorses_count: number | null
          puzzles_count: number | null
          stars_count: number | null
          total_food_cost: number | null
          total_items: number | null
          total_revenue: number | null
          user_id: string
        }
        Insert: {
          analysis_date?: string | null
          avg_food_cost_pct?: number | null
          created_at?: string | null
          dogs_count?: number | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          plowhorses_count?: number | null
          puzzles_count?: number | null
          stars_count?: number | null
          total_food_cost?: number | null
          total_items?: number | null
          total_revenue?: number | null
          user_id: string
        }
        Update: {
          analysis_date?: string | null
          avg_food_cost_pct?: number | null
          created_at?: string | null
          dogs_count?: number | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          plowhorses_count?: number | null
          puzzles_count?: number | null
          stars_count?: number | null
          total_food_cost?: number | null
          total_items?: number | null
          total_revenue?: number | null
          user_id?: string
        }
        Relationships: []
      }
      menu_import_batches: {
        Row: {
          error_message: string | null
          id: string
          import_date: string | null
          period_end: string | null
          period_start: string | null
          raw_data: Json | null
          records_imported: number | null
          source_name: string | null
          source_type: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          import_date?: string | null
          period_end?: string | null
          period_start?: string | null
          raw_data?: Json | null
          records_imported?: number | null
          source_name?: string | null
          source_type?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          error_message?: string | null
          id?: string
          import_date?: string | null
          period_end?: string | null
          period_start?: string | null
          raw_data?: Json | null
          records_imported?: number | null
          source_name?: string | null
          source_type?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      menu_item_analysis: {
        Row: {
          ai_recommendation: string | null
          analysis_id: string | null
          category: string | null
          contribution_margin: number | null
          created_at: string | null
          food_cost: number | null
          food_cost_pct: number | null
          id: string
          menu_item_id: string | null
          popularity_index: number | null
          profitability_index: number | null
          revenue: number | null
          sales_mix_pct: number | null
          units_sold: number | null
        }
        Insert: {
          ai_recommendation?: string | null
          analysis_id?: string | null
          category?: string | null
          contribution_margin?: number | null
          created_at?: string | null
          food_cost?: number | null
          food_cost_pct?: number | null
          id?: string
          menu_item_id?: string | null
          popularity_index?: number | null
          profitability_index?: number | null
          revenue?: number | null
          sales_mix_pct?: number | null
          units_sold?: number | null
        }
        Update: {
          ai_recommendation?: string | null
          analysis_id?: string | null
          category?: string | null
          contribution_margin?: number | null
          created_at?: string | null
          food_cost?: number | null
          food_cost_pct?: number | null
          id?: string
          menu_item_id?: string | null
          popularity_index?: number | null
          profitability_index?: number | null
          revenue?: number | null
          sales_mix_pct?: number | null
          units_sold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_analysis_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "menu_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_analysis_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string | null
          created_at: string | null
          food_cost: number | null
          id: string
          is_active: boolean | null
          item_name: string
          micros_item_id: string | null
          portion_size: string | null
          recipe_id: string | null
          selling_price: number | null
          subcategory: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          food_cost?: number | null
          id?: string
          is_active?: boolean | null
          item_name: string
          micros_item_id?: string | null
          portion_size?: string | null
          recipe_id?: string | null
          selling_price?: number | null
          subcategory?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          food_cost?: number | null
          id?: string
          is_active?: boolean | null
          item_name?: string
          micros_item_id?: string | null
          portion_size?: string | null
          recipe_id?: string | null
          selling_price?: number | null
          subcategory?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      menu_sales_data: {
        Row: {
          created_at: string | null
          daypart: string | null
          id: string
          import_batch_id: string | null
          menu_item_id: string | null
          modifier_revenue: number | null
          revenue: number | null
          sale_date: string
          units_sold: number | null
          user_id: string
          waste_cost: number | null
          waste_units: number | null
        }
        Insert: {
          created_at?: string | null
          daypart?: string | null
          id?: string
          import_batch_id?: string | null
          menu_item_id?: string | null
          modifier_revenue?: number | null
          revenue?: number | null
          sale_date: string
          units_sold?: number | null
          user_id: string
          waste_cost?: number | null
          waste_units?: number | null
        }
        Update: {
          created_at?: string | null
          daypart?: string | null
          id?: string
          import_batch_id?: string | null
          menu_item_id?: string | null
          modifier_revenue?: number | null
          revenue?: number | null
          sale_date?: string
          units_sold?: number | null
          user_id?: string
          waste_cost?: number | null
          waste_units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_sales_data_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
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
      mixologist_group_members: {
        Row: {
          group_id: string
          id: string
          is_active: boolean | null
          joined_at: string
          pin_code: string | null
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          is_active?: boolean | null
          joined_at?: string
          pin_code?: string | null
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string
          pin_code?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mixologist_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "mixologist_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      mixologist_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          qr_code_data: string | null
          submission_qr_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          qr_code_data?: string | null
          submission_qr_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          qr_code_data?: string | null
          submission_qr_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      music_popularity: {
        Row: {
          id: string
          last_updated: string
          like_count: number | null
          save_count: number | null
          share_count: number | null
          track_id: string
          usage_count: number | null
          usage_score: number | null
        }
        Insert: {
          id?: string
          last_updated?: string
          like_count?: number | null
          save_count?: number | null
          share_count?: number | null
          track_id: string
          usage_count?: number | null
          usage_score?: number | null
        }
        Update: {
          id?: string
          last_updated?: string
          like_count?: number | null
          save_count?: number | null
          share_count?: number | null
          track_id?: string
          usage_count?: number | null
          usage_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "music_popularity_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: true
            referencedRelation: "music_tracks"
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
      music_tracks: {
        Row: {
          artist: string | null
          bpm: number | null
          category: string | null
          created_at: string
          duration_sec: number | null
          file_size_bytes: number | null
          format: string | null
          id: string
          original_url: string | null
          preview_url: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          uploaded_by: string
          waveform_data: Json | null
        }
        Insert: {
          artist?: string | null
          bpm?: number | null
          category?: string | null
          created_at?: string
          duration_sec?: number | null
          file_size_bytes?: number | null
          format?: string | null
          id?: string
          original_url?: string | null
          preview_url?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          uploaded_by: string
          waveform_data?: Json | null
        }
        Update: {
          artist?: string | null
          bpm?: number | null
          category?: string | null
          created_at?: string
          duration_sec?: number | null
          file_size_bytes?: number | null
          format?: string | null
          id?: string
          original_url?: string | null
          preview_url?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          uploaded_by?: string
          waveform_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "music_tracks_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_tracks_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      music_usage: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          track_id: string
          trim_end_sec: number | null
          trim_start_sec: number | null
          user_id: string
          volume: number | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          track_id: string
          trim_end_sec?: number | null
          trim_start_sec?: number | null
          user_id: string
          volume?: number | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          track_id?: string
          trim_end_sec?: number | null
          trim_start_sec?: number | null
          user_id?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "music_usage_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_usage_user_id_fkey"
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
      password_reset_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      platform_bugs: {
        Row: {
          ai_analysis: string | null
          bug_type: string
          created_at: string
          description: string
          detected_at: string
          error_details: Json | null
          id: string
          location: string | null
          reproduction_steps: string[] | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_analysis?: string | null
          bug_type: string
          created_at?: string
          description: string
          detected_at?: string
          error_details?: Json | null
          id?: string
          location?: string | null
          reproduction_steps?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_analysis?: string | null
          bug_type?: string
          created_at?: string
          description?: string
          detected_at?: string
          error_details?: Json | null
          id?: string
          location?: string | null
          reproduction_steps?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_music_library: {
        Row: {
          added_by: string | null
          ai_description: string | null
          ai_tags: string[] | null
          album: string | null
          artist: string
          bpm: number | null
          cover_image_url: string | null
          created_at: string | null
          duration_seconds: number | null
          energy_level: string | null
          genre: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          mood: string | null
          popularity_score: number | null
          preview_url: string | null
          spotify_url: string | null
          title: string
          track_id: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          added_by?: string | null
          ai_description?: string | null
          ai_tags?: string[] | null
          album?: string | null
          artist: string
          bpm?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          energy_level?: string | null
          genre?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          mood?: string | null
          popularity_score?: number | null
          preview_url?: string | null
          spotify_url?: string | null
          title: string
          track_id: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          added_by?: string | null
          ai_description?: string | null
          ai_tags?: string[] | null
          album?: string | null
          artist?: string
          bpm?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          energy_level?: string | null
          genre?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          mood?: string | null
          popularity_score?: number | null
          preview_url?: string | null
          spotify_url?: string | null
          title?: string
          track_id?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      po_format_templates: {
        Row: {
          column_mappings: Json
          created_at: string
          created_by_email: string | null
          created_by_name: string | null
          currency: string | null
          date_format: string | null
          delimiter: string | null
          description: string | null
          format_type: string
          id: string
          name: string
          sample_headers: string[] | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          column_mappings?: Json
          created_at?: string
          created_by_email?: string | null
          created_by_name?: string | null
          currency?: string | null
          date_format?: string | null
          delimiter?: string | null
          description?: string | null
          format_type?: string
          id?: string
          name: string
          sample_headers?: string[] | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          column_mappings?: Json
          created_at?: string
          created_by_email?: string | null
          created_by_name?: string | null
          currency?: string | null
          date_format?: string | null
          delimiter?: string | null
          description?: string | null
          format_type?: string
          id?: string
          name?: string
          sample_headers?: string[] | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_format_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "procurement_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      po_price_history: {
        Row: {
          change_amount: number | null
          change_pct: number | null
          changed_at: string
          current_price: number
          id: string
          item_name: string
          previous_price: number | null
          user_id: string
        }
        Insert: {
          change_amount?: number | null
          change_pct?: number | null
          changed_at?: string
          current_price: number
          id?: string
          item_name: string
          previous_price?: number | null
          user_id: string
        }
        Update: {
          change_amount?: number | null
          change_pct?: number | null
          changed_at?: string
          current_price?: number
          id?: string
          item_name?: string
          previous_price?: number | null
          user_id?: string
        }
        Relationships: []
      }
      po_received_records: {
        Row: {
          created_at: string
          document_number: string | null
          id: string
          received_by_email: string | null
          received_by_name: string | null
          received_date: string
          status: string | null
          supplier_name: string | null
          total_items: number | null
          total_quantity: number | null
          total_value: number | null
          user_id: string
          variance_data: Json | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          document_number?: string | null
          id?: string
          received_by_email?: string | null
          received_by_name?: string | null
          received_date?: string
          status?: string | null
          supplier_name?: string | null
          total_items?: number | null
          total_quantity?: number | null
          total_value?: number | null
          user_id: string
          variance_data?: Json | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          document_number?: string | null
          id?: string
          received_by_email?: string | null
          received_by_name?: string | null
          received_date?: string
          status?: string | null
          supplier_name?: string | null
          total_items?: number | null
          total_quantity?: number | null
          total_value?: number | null
          user_id?: string
          variance_data?: Json | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_received_records_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "procurement_workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      post_audio: {
        Row: {
          created_at: string
          draft_id: string | null
          id: string
          mute_original: boolean | null
          post_id: string | null
          reel_id: string | null
          start_time: number | null
          track_artist: string | null
          track_id: string | null
          track_title: string | null
          track_url: string | null
          volume: number | null
        }
        Insert: {
          created_at?: string
          draft_id?: string | null
          id?: string
          mute_original?: boolean | null
          post_id?: string | null
          reel_id?: string | null
          start_time?: number | null
          track_artist?: string | null
          track_id?: string | null
          track_title?: string | null
          track_url?: string | null
          volume?: number | null
        }
        Update: {
          created_at?: string
          draft_id?: string | null
          id?: string
          mute_original?: boolean | null
          post_id?: string | null
          reel_id?: string | null
          start_time?: number | null
          track_artist?: string | null
          track_id?: string | null
          track_title?: string | null
          track_url?: string | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_audio_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "studio_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comment_reactions: {
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
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reposts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reposts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reposts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saves: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      post_versions: {
        Row: {
          caption: string | null
          created_at: string
          hashtags: string[] | null
          id: string
          media_asset_id: string | null
          metadata_json: Json | null
          post_id: string | null
          reel_id: string | null
          status: string
          version_number: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          hashtags?: string[] | null
          id?: string
          media_asset_id?: string | null
          metadata_json?: Json | null
          post_id?: string | null
          reel_id?: string | null
          status?: string
          version_number?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          hashtags?: string[] | null
          id?: string
          media_asset_id?: string | null
          metadata_json?: Json | null
          post_id?: string | null
          reel_id?: string | null
          status?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_versions_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
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
          music_track_id: string | null
          music_url: string | null
          repost_count: number | null
          save_count: number | null
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
          music_track_id?: string | null
          music_url?: string | null
          repost_count?: number | null
          save_count?: number | null
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
          music_track_id?: string | null
          music_url?: string | null
          repost_count?: number | null
          save_count?: number | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
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
      procurement_staff: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          permissions: Json | null
          pin_code: string
          role: string
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          permissions?: Json | null
          pin_code: string
          role?: string
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          permissions?: Json | null
          pin_code?: string
          role?: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_staff_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "procurement_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_workspace_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "procurement_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_workspaces: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
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
      purchase_order_items: {
        Row: {
          created_at: string
          delivery_date: string | null
          id: string
          item_code: string | null
          item_name: string
          price_per_unit: number
          price_total: number
          purchase_order_id: string
          quantity: number
          unit: string | null
        }
        Insert: {
          created_at?: string
          delivery_date?: string | null
          id?: string
          item_code?: string | null
          item_name: string
          price_per_unit?: number
          price_total?: number
          purchase_order_id: string
          quantity?: number
          unit?: string | null
        }
        Update: {
          created_at?: string
          delivery_date?: string | null
          id?: string
          item_code?: string | null
          item_name?: string
          price_per_unit?: number
          price_total?: number
          purchase_order_id?: string
          quantity?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_master_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          item_name: string
          last_price: number | null
          unit: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          item_name: string
          last_price?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          item_name?: string
          last_price?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_master_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "procurement_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_received_items: {
        Row: {
          created_at: string
          document_number: string | null
          id: string
          item_name: string
          master_item_id: string | null
          purchase_order_id: string | null
          quantity: number
          received_date: string
          record_id: string | null
          total_price: number | null
          unit: string | null
          unit_price: number | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          document_number?: string | null
          id?: string
          item_name: string
          master_item_id?: string | null
          purchase_order_id?: string | null
          quantity?: number
          received_date?: string
          record_id?: string | null
          total_price?: number | null
          unit?: string | null
          unit_price?: number | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          document_number?: string | null
          id?: string
          item_name?: string
          master_item_id?: string | null
          purchase_order_id?: string | null
          quantity?: number
          received_date?: string
          record_id?: string | null
          total_price?: number | null
          unit?: string | null
          unit_price?: number | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_received_items_master_item_id_fkey"
            columns: ["master_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_master_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_received_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_received_items_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "po_received_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_received_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "procurement_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          document_url: string | null
          id: string
          notes: string | null
          order_date: string | null
          order_number: string | null
          parsed_data: Json | null
          status: string | null
          submitted_by_email: string | null
          submitted_by_name: string | null
          supplier_name: string | null
          total_amount: number | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          document_url?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          parsed_data?: Json | null
          status?: string | null
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          document_url?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          parsed_data?: Json | null
          status?: string | null
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "procurement_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_codes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          metadata: Json | null
          qr_type: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          qr_type: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          qr_type?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      reel_reposts: {
        Row: {
          created_at: string
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_reposts_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_reposts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_reposts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_saves: {
        Row: {
          created_at: string
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_saves_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_saves_user_id_fkey"
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
          music_track_id: string | null
          music_url: string | null
          mute_original_audio: boolean | null
          repost_count: number | null
          save_count: number | null
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
          music_track_id?: string | null
          music_url?: string | null
          mute_original_audio?: boolean | null
          repost_count?: number | null
          save_count?: number | null
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
          music_track_id?: string | null
          music_url?: string | null
          mute_original_audio?: boolean | null
          repost_count?: number | null
          save_count?: number | null
          thumbnail_url?: string | null
          user_id?: string
          video_url?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reels_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
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
      skill_progress: {
        Row: {
          created_at: string | null
          current_level: number | null
          id: string
          last_practiced_at: string | null
          milestones: Json | null
          progress_percentage: number | null
          skill_name: string
          target_level: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_level?: number | null
          id?: string
          last_practiced_at?: string | null
          milestones?: Json | null
          progress_percentage?: number | null
          skill_name: string
          target_level?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_level?: number | null
          id?: string
          last_practiced_at?: string | null
          milestones?: Json | null
          progress_percentage?: number | null
          skill_name?: string
          target_level?: number | null
          updated_at?: string | null
          user_id?: string
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
      status_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          status_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          status_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          status_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "status_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      status_likes: {
        Row: {
          created_at: string
          id: string
          status_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status_id?: string
          user_id?: string
        }
        Relationships: []
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
          music_track_id: string | null
          text_overlays: Json | null
          trim_data: Json | null
          user_id: string
          view_count: number | null
          visibility: string | null
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
          music_track_id?: string | null
          text_overlays?: Json | null
          trim_data?: Json | null
          user_id: string
          view_count?: number | null
          visibility?: string | null
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
          music_track_id?: string | null
          text_overlays?: Json | null
          trim_data?: Json | null
          user_id?: string
          view_count?: number | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
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
          reply_to: string | null
          story_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          reactions?: Json | null
          reply_to?: string | null
          story_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          reactions?: Json | null
          reply_to?: string | null
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comments_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "story_comments"
            referencedColumns: ["id"]
          },
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
      story_highlights: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          story_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          story_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          story_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
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
      studio_analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata_json: Json | null
          post_id: string | null
          reel_id: string | null
          viewer_id: string | null
          watch_ms: number | null
          watch_percent: number | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata_json?: Json | null
          post_id?: string | null
          reel_id?: string | null
          viewer_id?: string | null
          watch_ms?: number | null
          watch_percent?: number | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata_json?: Json | null
          post_id?: string | null
          reel_id?: string | null
          viewer_id?: string | null
          watch_ms?: number | null
          watch_percent?: number | null
        }
        Relationships: []
      }
      studio_approval_requests: {
        Row: {
          created_at: string
          draft_id: string
          feedback: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          team_id: string | null
          updated_at: string
          user_id: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          draft_id: string
          feedback?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          draft_id?: string
          feedback?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_approval_requests_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "studio_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_drafts: {
        Row: {
          approval_venue_id: string | null
          aspect_ratio: string | null
          branch_label: string | null
          caption: string | null
          cover_asset_id: string | null
          created_at: string
          crop_data: Json | null
          draft_type: string
          hashtags: string[] | null
          id: string
          location: string | null
          mentions: string[] | null
          metadata_json: Json | null
          needs_approval: boolean | null
          parent_draft_id: string | null
          scheduled_at: string | null
          status: string
          trim_end: number | null
          trim_start: number | null
          updated_at: string
          user_id: string
          venue_id: string | null
          visibility: string
        }
        Insert: {
          approval_venue_id?: string | null
          aspect_ratio?: string | null
          branch_label?: string | null
          caption?: string | null
          cover_asset_id?: string | null
          created_at?: string
          crop_data?: Json | null
          draft_type?: string
          hashtags?: string[] | null
          id?: string
          location?: string | null
          mentions?: string[] | null
          metadata_json?: Json | null
          needs_approval?: boolean | null
          parent_draft_id?: string | null
          scheduled_at?: string | null
          status?: string
          trim_end?: number | null
          trim_start?: number | null
          updated_at?: string
          user_id: string
          venue_id?: string | null
          visibility?: string
        }
        Update: {
          approval_venue_id?: string | null
          aspect_ratio?: string | null
          branch_label?: string | null
          caption?: string | null
          cover_asset_id?: string | null
          created_at?: string
          crop_data?: Json | null
          draft_type?: string
          hashtags?: string[] | null
          id?: string
          location?: string | null
          mentions?: string[] | null
          metadata_json?: Json | null
          needs_approval?: boolean | null
          parent_draft_id?: string | null
          scheduled_at?: string | null
          status?: string
          trim_end?: number | null
          trim_start?: number | null
          updated_at?: string
          user_id?: string
          venue_id?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_drafts_parent_draft_id_fkey"
            columns: ["parent_draft_id"]
            isOneToOne: false
            referencedRelation: "studio_drafts"
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
      upload_chunks: {
        Row: {
          chunk_hash: string | null
          chunk_index: number
          chunk_size: number
          created_at: string
          id: string
          session_id: string
          storage_path: string | null
          uploaded: boolean
          verified: boolean
        }
        Insert: {
          chunk_hash?: string | null
          chunk_index: number
          chunk_size: number
          created_at?: string
          id?: string
          session_id: string
          storage_path?: string | null
          uploaded?: boolean
          verified?: boolean
        }
        Update: {
          chunk_hash?: string | null
          chunk_index?: number
          chunk_size?: number
          created_at?: string
          id?: string
          session_id?: string
          storage_path?: string | null
          uploaded?: boolean
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "upload_chunks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "upload_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_sessions: {
        Row: {
          chunk_size: number
          created_at: string
          error_message: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          media_asset_id: string | null
          priority: number
          status: string
          total_chunks: number
          updated_at: string
          uploaded_chunks: number
          user_id: string
        }
        Insert: {
          chunk_size?: number
          created_at?: string
          error_message?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          media_asset_id?: string | null
          priority?: number
          status?: string
          total_chunks: number
          updated_at?: string
          uploaded_chunks?: number
          user_id: string
        }
        Update: {
          chunk_size?: number
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          media_asset_id?: string | null
          priority?: number
          status?: string
          total_chunks?: number
          updated_at?: string
          uploaded_chunks?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_sessions_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          accuracy: number | null
          created_at: string | null
          custom_status: string | null
          ghost_mode: boolean | null
          id: string
          last_updated: string | null
          latitude: number
          longitude: number
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          custom_status?: string | null
          ghost_mode?: boolean | null
          id?: string
          last_updated?: string | null
          latitude: number
          longitude: number
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          custom_status?: string | null
          ghost_mode?: boolean | null
          id?: string
          last_updated?: string | null
          latitude?: number
          longitude?: number
          user_id?: string
        }
        Relationships: []
      }
      user_music_library: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
          music_album_art: string | null
          music_artist: string | null
          music_preview_url: string | null
          music_spotify_url: string | null
          music_track_id: string | null
          music_track_name: string | null
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
          music_album_art?: string | null
          music_artist?: string | null
          music_preview_url?: string | null
          music_spotify_url?: string | null
          music_track_id?: string | null
          music_track_name?: string | null
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
          music_album_art?: string | null
          music_artist?: string | null
          music_preview_url?: string | null
          music_spotify_url?: string | null
          music_track_id?: string | null
          music_track_name?: string | null
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
          address?: never
          avatar_url?: string | null
          badge_level?: Database["public"]["Enums"]["badge_level"] | null
          bio?: string | null
          career_score?: number | null
          city?: never
          country?: never
          cover_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: never
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
          postal_code?: never
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
          address?: never
          avatar_url?: string | null
          badge_level?: Database["public"]["Enums"]["badge_level"] | null
          bio?: string | null
          career_score?: number | null
          city?: never
          country?: never
          cover_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: never
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
          postal_code?: never
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
      calculate_lab_ops_variance: {
        Args: {
          p_end_time: string
          p_outlet_id: string
          p_spirit_type?: string
          p_start_time: string
        }
        Returns: {
          physical_ml: number
          spirit: string
          variance_ml: number
          variance_pct: number
          virtual_ml: number
        }[]
      }
      can_manage_batch_production: {
        Args: { production_id: string }
        Returns: boolean
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
      delete_old_po_received_records: { Args: never; Returns: undefined }
      expire_team_invitations: { Args: never; Returns: undefined }
      fire_automation_trigger: {
        Args: { p_payload: Json; p_trigger_type: string; p_user_id: string }
        Returns: undefined
      }
      generate_certificate_number: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
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
      has_creator_role: {
        Args: {
          _role: Database["public"]["Enums"]["creator_role"]
          _user_id: string
        }
        Returns: boolean
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
      is_lab_ops_outlet_member: {
        Args: { _outlet_id: string; _user_id: string }
        Returns: boolean
      }
      is_mixologist_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_procurement_workspace_member: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
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
      refresh_music_popularity: { Args: never; Returns: undefined }
      search_matrix_documents: {
        Args: { p_keywords: string[]; p_user_id: string }
        Returns: {
          chunk_id: string
          chunk_text: string
          document_id: string
          document_type: string
          filename: string
          relevance_score: number
        }[]
      }
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
      creator_role: "creator" | "pro_creator" | "venue_admin" | "moderator"
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
      lab_ops_movement_type:
        | "purchase"
        | "sale"
        | "wastage"
        | "breakage"
        | "transfer"
        | "adjustment"
      lab_ops_order_item_status:
        | "pending"
        | "sent"
        | "in_progress"
        | "ready"
        | "served"
        | "voided"
      lab_ops_order_status:
        | "open"
        | "sent"
        | "in_progress"
        | "ready"
        | "closed"
        | "cancelled"
      lab_ops_po_status:
        | "draft"
        | "issued"
        | "partially_received"
        | "closed"
        | "cancelled"
      lab_ops_role:
        | "waiter"
        | "bartender"
        | "kitchen"
        | "supervisor"
        | "manager"
        | "admin"
      lab_ops_table_status:
        | "free"
        | "seated"
        | "ordering"
        | "bill_requested"
        | "closed"
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
      creator_role: ["creator", "pro_creator", "venue_admin", "moderator"],
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
      lab_ops_movement_type: [
        "purchase",
        "sale",
        "wastage",
        "breakage",
        "transfer",
        "adjustment",
      ],
      lab_ops_order_item_status: [
        "pending",
        "sent",
        "in_progress",
        "ready",
        "served",
        "voided",
      ],
      lab_ops_order_status: [
        "open",
        "sent",
        "in_progress",
        "ready",
        "closed",
        "cancelled",
      ],
      lab_ops_po_status: [
        "draft",
        "issued",
        "partially_received",
        "closed",
        "cancelled",
      ],
      lab_ops_role: [
        "waiter",
        "bartender",
        "kitchen",
        "supervisor",
        "manager",
        "admin",
      ],
      lab_ops_table_status: [
        "free",
        "seated",
        "ordering",
        "bill_requested",
        "closed",
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
