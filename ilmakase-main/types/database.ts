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
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          created_at: string
          // 온보딩 정보
          situation: 'working' | 'job_seeking' | 'freelance' | null
          main_work: string | null
          record_reason: string | null
          time_preference: '3min' | '5min' | 'flexible' | null
          emotional_phrase: string | null
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          created_at?: string
          situation?: 'working' | 'job_seeking' | 'freelance' | null
          main_work?: string | null
          record_reason?: string | null
          time_preference?: '3min' | '5min' | 'flexible' | null
          emotional_phrase?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          created_at?: string
          situation?: 'working' | 'job_seeking' | 'freelance' | null
          main_work?: string | null
          record_reason?: string | null
          time_preference?: '3min' | '5min' | 'flexible' | null
          emotional_phrase?: string | null
        }
      }
      records: {
        Row: {
          id: string
          user_id: string
          contents: string[]  // 변경: 항목 단위 배열
          date: string
          created_at: string
          // AI 추출 정보
          keywords: string[] | null
          analysis_id: string | null  // 패턴 분석 연결
          project_id: string | null  // 포트폴리오 카드 연결
          ai_preview: Json | null  // AI 분석 결과 (AIPreviewResponse)
        }
        Insert: {
          id?: string
          user_id: string
          contents: string[]  // 변경: 항목 단위 배열
          date?: string
          created_at?: string
          keywords?: string[] | null
          analysis_id?: string | null
          project_id?: string | null
          ai_preview?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          contents?: string[]  // 변경: 항목 단위 배열
          date?: string
          created_at?: string
          keywords?: string[] | null
          analysis_id?: string | null
          project_id?: string | null
          ai_preview?: Json | null
        }
      }
      ai_analyses: {
        Row: {
          id: string
          user_id: string
          record_ids: string[]
          pattern: string
          workflow: string
          top_keywords: string[]
          insight: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          record_ids: string[]
          pattern: string
          workflow: string
          top_keywords: string[]
          insight: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          record_ids?: string[]
          pattern?: string
          workflow?: string
          top_keywords?: string[]
          insight?: string
          created_at?: string
        }
      }
      project_cards: {
        Row: {
          id: string
          user_id: string
          record_ids: string[]
          title: string
          period_start: string
          period_end: string
          tasks: string[]
          results: string[]
          thinking_summary: string
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          record_ids: string[]
          title: string
          period_start: string
          period_end: string
          tasks: string[]
          results: string[]
          thinking_summary: string
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          record_ids?: string[]
          title?: string
          period_start?: string
          period_end?: string
          tasks?: string[]
          results?: string[]
          thinking_summary?: string
          image_url?: string | null
          created_at?: string
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

