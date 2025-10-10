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
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_ids: string[]
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_ids: string[]
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_ids?: string[]
        }
        Relationships: []
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
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          created_at: string
          expiration_date: string
          id: string
          item_id: string
          quantity: number
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expiration_date: string
          id?: string
          item_id: string
          quantity?: number
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expiration_date?: string
          id?: string
          item_id?: string
          quantity?: number
          store_id?: string
          user_id?: string
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
        ]
      }
      items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string
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
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read: boolean | null
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
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
        ]
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
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          avatar_url: string | null
          badge_level: Database["public"]["Enums"]["badge_level"] | null
          bio: string | null
          cover_url: string | null
          created_at: string | null
          follower_count: number | null
          following_count: number | null
          full_name: string
          id: string
          is_founder: boolean | null
          is_verified: boolean | null
          phone: string | null
          post_count: number | null
          professional_title:
            | Database["public"]["Enums"]["professional_title"]
            | null
          region: string | null
          show_phone: boolean | null
          show_website: boolean | null
          show_whatsapp: boolean | null
          updated_at: string | null
          username: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          badge_level?: Database["public"]["Enums"]["badge_level"] | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          follower_count?: number | null
          following_count?: number | null
          full_name: string
          id: string
          is_founder?: boolean | null
          is_verified?: boolean | null
          phone?: string | null
          post_count?: number | null
          professional_title?:
            | Database["public"]["Enums"]["professional_title"]
            | null
          region?: string | null
          show_phone?: boolean | null
          show_website?: boolean | null
          show_whatsapp?: boolean | null
          updated_at?: string | null
          username: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          badge_level?: Database["public"]["Enums"]["badge_level"] | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          follower_count?: number | null
          following_count?: number | null
          full_name?: string
          id?: string
          is_founder?: boolean | null
          is_verified?: boolean | null
          phone?: string | null
          post_count?: number | null
          professional_title?:
            | Database["public"]["Enums"]["professional_title"]
            | null
          region?: string | null
          show_phone?: boolean | null
          show_website?: boolean | null
          show_whatsapp?: boolean | null
          updated_at?: string | null
          username?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
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
        ]
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
        ]
      }
      stores: {
        Row: {
          area: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          area: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          area?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          comment_count: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          like_count: number | null
          media_types: string[]
          media_urls: string[]
          user_id: string
          view_count: number | null
        }
        Insert: {
          comment_count?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          like_count?: number | null
          media_types?: string[]
          media_urls?: string[]
          user_id: string
          view_count?: number | null
        }
        Update: {
          comment_count?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          like_count?: number | null
          media_types?: string[]
          media_urls?: string[]
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
        ]
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
      venues: {
        Row: {
          address: string | null
          city: string
          contact_email: string | null
          country: string
          created_at: string | null
          id: string
          name: string
          region: string
          type: string
          verified: boolean | null
        }
        Insert: {
          address?: string | null
          city: string
          contact_email?: string | null
          country?: string
          created_at?: string | null
          id?: string
          name: string
          region: string
          type: string
          verified?: boolean | null
        }
        Update: {
          address?: string | null
          city?: string
          contact_email?: string | null
          country?: string
          created_at?: string | null
          id?: string
          name?: string
          region?: string
          type?: string
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_notification: {
        Args: { p_content: string; p_type: string; p_user_id: string }
        Returns: undefined
      }
      recalculate_follow_counts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
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
