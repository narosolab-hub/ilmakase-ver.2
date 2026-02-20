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
      career_documents: {
        Row: {
          company_id: string | null
          content: string | null
          created_at: string | null
          id: string
          period_end: string | null
          period_start: string | null
          priority_config: Json | null
          project_ids: string[] | null
          role: string | null
          team_size: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          priority_config?: Json | null
          project_ids?: string[] | null
          role?: string | null
          team_size?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          priority_config?: Json | null
          project_ids?: string[] | null
          role?: string | null
          team_size?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          department: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          name: string
          position: string | null
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          name: string
          position?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          name?: string
          position?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          completion_rate: number | null
          created_at: string | null
          id: string
          log_date: string
          parsed_tasks_count: number | null
          raw_content: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completion_rate?: number | null
          created_at?: string | null
          id?: string
          log_date?: string
          parsed_tasks_count?: number | null
          raw_content?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completion_rate?: number | null
          created_at?: string | null
          id?: string
          log_date?: string
          parsed_tasks_count?: number | null
          raw_content?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_reviews: {
        Row: {
          ai_insights: Json | null
          avg_completion_rate: number | null
          created_at: string | null
          id: string
          project_distribution: Json | null
          total_work_days: number | null
          updated_at: string | null
          user_id: string
          user_reflection: string | null
          year_month: string
        }
        Insert: {
          ai_insights?: Json | null
          avg_completion_rate?: number | null
          created_at?: string | null
          id?: string
          project_distribution?: Json | null
          total_work_days?: number | null
          updated_at?: string | null
          user_id: string
          user_reflection?: string | null
          year_month: string
        }
        Update: {
          ai_insights?: Json | null
          avg_completion_rate?: number | null
          created_at?: string | null
          id?: string
          project_distribution?: Json | null
          total_work_days?: number | null
          updated_at?: string | null
          user_id?: string
          user_reflection?: string | null
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          auto_matched: boolean | null
          company_id: string | null
          contribution: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          keywords: string[] | null
          name: string
          outcomes: Json | null
          role: string | null
          start_date: string | null
          status: string | null
          summary: string | null
          team_size: string | null
          tech_stack: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_matched?: boolean | null
          company_id?: string | null
          contribution?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          keywords?: string[] | null
          name: string
          outcomes?: Json | null
          role?: string | null
          start_date?: string | null
          status?: string | null
          summary?: string | null
          team_size?: string | null
          tech_stack?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_matched?: boolean | null
          company_id?: string | null
          contribution?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          keywords?: string[] | null
          name?: string
          outcomes?: Json | null
          role?: string | null
          start_date?: string | null
          status?: string | null
          summary?: string | null
          team_size?: string | null
          tech_stack?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          project_id: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          project_id: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          ai_credits_used: number | null
          career_doc_credits_used: number | null
          created_at: string | null
          credits_reset_at: string | null
          email: string
          emotional_phrase: string | null
          id: string
          main_work: string | null
          name: string | null
          plan: string | null
          record_reason: string | null
          situation: string | null
          time_preference: string | null
          updated_at: string | null
        }
        Insert: {
          ai_credits_used?: number | null
          career_doc_credits_used?: number | null
          created_at?: string | null
          credits_reset_at?: string | null
          email: string
          emotional_phrase?: string | null
          id: string
          main_work?: string | null
          name?: string | null
          plan?: string | null
          record_reason?: string | null
          situation?: string | null
          time_preference?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_credits_used?: number | null
          career_doc_credits_used?: number | null
          created_at?: string | null
          credits_reset_at?: string | null
          email?: string
          emotional_phrase?: string | null
          id?: string
          main_work?: string | null
          name?: string | null
          plan?: string | null
          record_reason?: string | null
          situation?: string | null
          time_preference?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      work_logs: {
        Row: {
          ai_analysis: Json | null
          content: string
          created_at: string | null
          detail: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          keywords: string[] | null
          memos: Json | null
          progress: number | null
          project_id: string | null
          status: string | null
          subtasks: Json | null
          task_id: string | null
          updated_at: string | null
          user_id: string
          work_date: string
        }
        Insert: {
          ai_analysis?: Json | null
          content: string
          created_at?: string | null
          detail?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          keywords?: string[] | null
          memos?: Json | null
          progress?: number | null
          project_id?: string | null
          status?: string | null
          subtasks?: Json | null
          task_id?: string | null
          updated_at?: string | null
          user_id: string
          work_date?: string
        }
        Update: {
          ai_analysis?: Json | null
          content?: string
          created_at?: string | null
          detail?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          keywords?: string[] | null
          memos?: Json | null
          progress?: number | null
          project_id?: string | null
          status?: string | null
          subtasks?: Json | null
          task_id?: string | null
          updated_at?: string | null
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
    Enums: {},
  },
} as const
