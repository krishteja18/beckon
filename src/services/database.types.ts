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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      avoidance_goals: {
        Row: {
          active: boolean
          added_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          active?: boolean
          added_at?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          active?: boolean
          added_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          ends_at: string
          external_id: string
          id: string
          starts_at: string
          synced_at: string
          title: string
          user_id: string
        }
        Insert: {
          ends_at: string
          external_id: string
          id?: string
          starts_at: string
          synced_at?: string
          title: string
          user_id: string
        }
        Update: {
          ends_at?: string
          external_id?: string
          id?: string
          starts_at?: string
          synced_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          call_type: Database["public"]["Enums"]["call_type"]
          duration_seconds: number | null
          elevenlabs_conversation_id: string | null
          ended_at: string | null
          feedback_rating: number | null
          goal_ids: string[]
          id: string
          intensity: Database["public"]["Enums"]["intensity_level"]
          outcome: Json
          started_at: string
          summary: string | null
          transcript: string | null
          user_id: string
        }
        Insert: {
          call_type: Database["public"]["Enums"]["call_type"]
          duration_seconds?: number | null
          elevenlabs_conversation_id?: string | null
          ended_at?: string | null
          feedback_rating?: number | null
          goal_ids?: string[]
          id?: string
          intensity: Database["public"]["Enums"]["intensity_level"]
          outcome?: Json
          started_at?: string
          summary?: string | null
          transcript?: string | null
          user_id: string
        }
        Update: {
          call_type?: Database["public"]["Enums"]["call_type"]
          duration_seconds?: number | null
          elevenlabs_conversation_id?: string | null
          ended_at?: string | null
          feedback_rating?: number | null
          goal_ids?: string[]
          id?: string
          intensity?: Database["public"]["Enums"]["intensity_level"]
          outcome?: Json
          started_at?: string
          summary?: string | null
          transcript?: string | null
          user_id?: string
        }
        Relationships: []
      }
      frameworks: {
        Row: {
          best_for: string[]
          description: string
          display_name: string
          key: Database["public"]["Enums"]["framework_key"]
          one_liner: string
          system_prompt_addon: string
          vocabulary: Json
        }
        Insert: {
          best_for?: string[]
          description: string
          display_name: string
          key: Database["public"]["Enums"]["framework_key"]
          one_liner: string
          system_prompt_addon: string
          vocabulary?: Json
        }
        Update: {
          best_for?: string[]
          description?: string
          display_name?: string
          key?: Database["public"]["Enums"]["framework_key"]
          one_liner?: string
          system_prompt_addon?: string
          vocabulary?: Json
        }
        Relationships: []
      }
      goal_schedules: {
        Row: {
          active: boolean
          created_at: string
          goal_id: string
          id: string
          label: string | null
          scheduled_days: number[]
          scheduled_time: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          goal_id: string
          id?: string
          label?: string | null
          scheduled_days?: number[]
          scheduled_time: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          goal_id?: string
          id?: string
          label?: string | null
          scheduled_days?: number[]
          scheduled_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_schedules_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          archived_at: string | null
          batch_with_nearby: boolean
          cadence_per_week: number
          created_at: string
          deadline_date: string | null
          description: string | null
          framework: Database["public"]["Enums"]["framework_key"]
          id: string
          preferred_time_of_day: string
          status: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          batch_with_nearby?: boolean
          cadence_per_week?: number
          created_at?: string
          deadline_date?: string | null
          description?: string | null
          framework: Database["public"]["Enums"]["framework_key"]
          id?: string
          preferred_time_of_day?: string
          status?: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          batch_with_nearby?: boolean
          cadence_per_week?: number
          created_at?: string
          deadline_date?: string | null
          description?: string | null
          framework?: Database["public"]["Enums"]["framework_key"]
          id?: string
          preferred_time_of_day?: string
          status?: Database["public"]["Enums"]["goal_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          access_token: string | null
          connected_at: string
          expires_at: string | null
          id: string
          kind: Database["public"]["Enums"]["integration_kind"]
          last_synced_at: string | null
          metadata: Json
          refresh_token: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string
          expires_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["integration_kind"]
          last_synced_at?: string | null
          metadata?: Json
          refresh_token?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string
          expires_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["integration_kind"]
          last_synced_at?: string | null
          metadata?: Json
          refresh_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_framework: Database["public"]["Enums"]["framework_key"]
          display_name: string | null
          id: string
          intensity: Database["public"]["Enums"]["intensity_level"]
          morning_sync_time: string
          onboarding_completed_at: string | null
          preferred_check_in_local_time: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_framework?: Database["public"]["Enums"]["framework_key"]
          display_name?: string | null
          id: string
          intensity?: Database["public"]["Enums"]["intensity_level"]
          morning_sync_time?: string
          onboarding_completed_at?: string | null
          preferred_check_in_local_time?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_framework?: Database["public"]["Enums"]["framework_key"]
          display_name?: string | null
          id?: string
          intensity?: Database["public"]["Enums"]["intensity_level"]
          morning_sync_time?: string
          onboarding_completed_at?: string | null
          preferred_check_in_local_time?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          expo_token: string
          id: string
          last_used_at: string
          platform: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expo_token: string
          id?: string
          last_used_at?: string
          platform: string
          user_id: string
        }
        Update: {
          created_at?: string
          expo_token?: string
          id?: string
          last_used_at?: string
          platform?: string
          user_id?: string
        }
        Relationships: []
      }
      retros: {
        Row: {
          generated_at: string
          id: string
          period: Database["public"]["Enums"]["retro_period"]
          period_end_date: string
          period_start_date: string
          retro_type: Database["public"]["Enums"]["retro_type"]
          stats: Json
          summary_text: string
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          period: Database["public"]["Enums"]["retro_period"]
          period_end_date: string
          period_start_date: string
          retro_type?: Database["public"]["Enums"]["retro_type"]
          stats?: Json
          summary_text: string
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          period?: Database["public"]["Enums"]["retro_period"]
          period_end_date?: string
          period_start_date?: string
          retro_type?: Database["public"]["Enums"]["retro_type"]
          stats?: Json
          summary_text?: string
          user_id?: string
        }
        Relationships: []
      }
      routines: {
        Row: {
          active: boolean
          created_at: string
          id: string
          scheduled_days: number[]
          scheduled_time: string
          title: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          scheduled_days?: number[]
          scheduled_time: string
          title: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          scheduled_days?: number[]
          scheduled_time?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      schedule_overrides: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          original_time: string
          override_date: string
          override_time: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          original_time: string
          override_date: string
          override_time: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          original_time?: string
          override_date?: string
          override_time?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_overrides_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      task_events: {
        Row: {
          goal_id: string | null
          id: string
          kind: Database["public"]["Enums"]["task_event_kind"]
          note: string | null
          occurred_at: string
          snooze_count: number
          source: string
          time_bucket: string
          user_id: string
          user_local_date: string
          user_local_day_of_week: number
          user_local_hour: number
        }
        Insert: {
          goal_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["task_event_kind"]
          note?: string | null
          occurred_at?: string
          snooze_count?: number
          source?: string
          time_bucket: string
          user_id: string
          user_local_date: string
          user_local_day_of_week: number
          user_local_hour: number
        }
        Update: {
          goal_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["task_event_kind"]
          note?: string | null
          occurred_at?: string
          snooze_count?: number
          source?: string
          time_bucket?: string
          user_id?: string
          user_local_date?: string
          user_local_day_of_week?: number
          user_local_hour?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_events_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_token_log: {
        Row: {
          id: string
          issued_at: string
          user_id: string
        }
        Insert: {
          id?: string
          issued_at?: string
          user_id: string
        }
        Update: {
          id?: string
          issued_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_due_goal_calls: {
        Args: { window_minutes?: number }
        Returns: {
          batch_with_nearby: boolean
          goal_framework: Database["public"]["Enums"]["framework_key"]
          goal_id: string
          goal_title: string
          intensity: Database["public"]["Enums"]["intensity_level"]
          local_hour: number
          schedule_id: string
          scheduled_time: string
          timezone: string
          user_id: string
        }[]
      }
    }
    Enums: {
      call_type: "morning" | "midday" | "evening" | "wall" | "retro" | "routine"
      framework_key: "atomic_habits" | "ikigai" | "deep_work"
      goal_status: "active" | "paused" | "archived" | "completed"
      integration_kind: "google_calendar" | "notion" | "gmail"
      intensity_level: "gentle" | "firm" | "drill"
      retro_period: "daily" | "weekly" | "monthly"
      retro_type: "daily" | "weekly" | "monthly"
      task_event_kind:
        | "started"
        | "completed"
        | "skipped"
        | "failed"
        | "wall_hit"
        | "wall_recovered"
        | "rough_day"
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
      call_type: ["morning", "midday", "evening", "wall", "retro", "routine"],
      framework_key: ["atomic_habits", "ikigai", "deep_work"],
      goal_status: ["active", "paused", "archived", "completed"],
      integration_kind: ["google_calendar", "notion", "gmail"],
      intensity_level: ["gentle", "firm", "drill"],
      retro_period: ["daily", "weekly", "monthly"],
      retro_type: ["daily", "weekly", "monthly"],
      task_event_kind: [
        "started",
        "completed",
        "skipped",
        "failed",
        "wall_hit",
        "wall_recovered",
        "rough_day",
      ],
    },
  },
} as const
