export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          user_id: string
          name: string
          position: string | null
          department: string | null
          start_date: string | null
          end_date: string | null
          is_current: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          position?: string | null
          department?: string | null
          start_date?: string | null
          end_date?: string | null
          is_current?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          position?: string | null
          department?: string | null
          start_date?: string | null
          end_date?: string | null
          is_current?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          situation: 'working' | 'job_seeking' | 'freelance' | null
          main_work: string | null
          record_reason: string | null
          time_preference: '3min' | '5min' | 'flexible' | null
          emotional_phrase: string | null
          plan: 'free' | 'basic' | 'premium'
          ai_credits_used: number
          career_doc_credits_used: number
          credits_reset_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          situation?: 'working' | 'job_seeking' | 'freelance' | null
          main_work?: string | null
          record_reason?: string | null
          time_preference?: '3min' | '5min' | 'flexible' | null
          emotional_phrase?: string | null
          plan?: 'free' | 'basic' | 'premium'
          ai_credits_used?: number
          career_doc_credits_used?: number
          credits_reset_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          situation?: 'working' | 'job_seeking' | 'freelance' | null
          main_work?: string | null
          record_reason?: string | null
          time_preference?: '3min' | '5min' | 'flexible' | null
          emotional_phrase?: string | null
          plan?: 'free' | 'basic' | 'premium'
          ai_credits_used?: number
          career_doc_credits_used?: number
          credits_reset_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          name: string
          description: string | null
          status: '진행중' | '완료' | '보류'
          start_date: string | null
          end_date: string | null
          auto_matched: boolean
          keywords: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id?: string | null
          name: string
          description?: string | null
          status?: '진행중' | '완료' | '보류'
          start_date?: string | null
          end_date?: string | null
          auto_matched?: boolean
          keywords?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string | null
          name?: string
          description?: string | null
          status?: '진행중' | '완료' | '보류'
          start_date?: string | null
          end_date?: string | null
          auto_matched?: boolean
          keywords?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          user_id: string
          name: string
          description: string | null
          status: '진행중' | '완료' | '보류'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          name: string
          description?: string | null
          status?: '진행중' | '완료' | '보류'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          name?: string
          description?: string | null
          status?: '진행중' | '완료' | '보류'
          created_at?: string
          updated_at?: string
        }
      }
      work_logs: {
        Row: {
          id: string
          user_id: string
          task_id: string | null
          project_id: string | null
          content: string
          detail: string | null
          work_date: string
          progress: number
          is_completed: boolean
          ai_analysis: Json | null
          keywords: string[]
          subtasks: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id?: string | null
          project_id?: string | null
          content: string
          detail?: string | null
          work_date?: string
          progress?: number
          is_completed?: boolean
          ai_analysis?: Json | null
          keywords?: string[]
          subtasks?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string | null
          project_id?: string | null
          content?: string
          detail?: string | null
          work_date?: string
          progress?: number
          is_completed?: boolean
          ai_analysis?: Json | null
          keywords?: string[]
          subtasks?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      ai_analyses: {
        Row: {
          id: string
          user_id: string
          work_log_ids: string[]
          pattern: string | null
          workflow: string | null
          top_keywords: string[] | null
          insight: string | null
          thinking_analysis: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          work_log_ids: string[]
          pattern?: string | null
          workflow?: string | null
          top_keywords?: string[] | null
          insight?: string | null
          thinking_analysis?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          work_log_ids?: string[]
          pattern?: string | null
          workflow?: string | null
          top_keywords?: string[] | null
          insight?: string | null
          thinking_analysis?: Json | null
          created_at?: string
        }
      }
      career_documents: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          title: string
          period_start: string | null
          period_end: string | null
          role: string | null
          team_size: string | null
          task_summary: Json | null
          brief_version: string | null
          detailed_version: string | null
          star_version: Json | null
          thinking_analysis: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          title: string
          period_start?: string | null
          period_end?: string | null
          role?: string | null
          team_size?: string | null
          task_summary?: Json | null
          brief_version?: string | null
          detailed_version?: string | null
          star_version?: Json | null
          thinking_analysis?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          title?: string
          period_start?: string | null
          period_end?: string | null
          role?: string | null
          team_size?: string | null
          task_summary?: Json | null
          brief_version?: string | null
          detailed_version?: string | null
          star_version?: Json | null
          thinking_analysis?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      monthly_reviews: {
        Row: {
          id: string
          user_id: string
          year_month: string
          total_work_days: number | null
          avg_completion_rate: number | null
          work_type_distribution: Json | null
          project_distribution: Json | null
          monthly_comparison: Json | null
          ai_insights: Json | null
          user_reflection: string | null
          goals_for_next_month: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          year_month: string
          total_work_days?: number | null
          avg_completion_rate?: number | null
          work_type_distribution?: Json | null
          project_distribution?: Json | null
          monthly_comparison?: Json | null
          ai_insights?: Json | null
          user_reflection?: string | null
          goals_for_next_month?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          year_month?: string
          total_work_days?: number | null
          avg_completion_rate?: number | null
          work_type_distribution?: Json | null
          project_distribution?: Json | null
          monthly_comparison?: Json | null
          ai_insights?: Json | null
          user_reflection?: string | null
          goals_for_next_month?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      daily_logs: {
        Row: {
          id: string
          user_id: string
          log_date: string
          raw_content: string | null
          parsed_tasks_count: number
          completion_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          log_date?: string
          raw_content?: string | null
          parsed_tasks_count?: number
          completion_rate?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          log_date?: string
          raw_content?: string | null
          parsed_tasks_count?: number
          completion_rate?: number
          created_at?: string
          updated_at?: string
        }
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
  }
}
