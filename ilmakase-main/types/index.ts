export type Situation = 'working' | 'job_seeking' | 'freelance'
export type TimePreference = '3min' | '5min' | 'flexible'

export interface User {
  id: string
  email: string
  name?: string
  created_at: string
  // 온보딩 정보
  situation?: Situation
  main_work?: string
  record_reason?: string
  time_preference?: TimePreference
  emotional_phrase?: string
}

export interface Record {
  id: string
  user_id: string
  contents: string[]  // 변경: 항목 단위 배열 (업무 1, 2, 3...)
  date: string
  created_at: string
  keywords?: string[]
  analysis_id?: string  // 패턴 분석 연결
  project_id?: string  // 포트폴리오 카드 연결
  ai_preview?: AIPreviewResponse | null  // AI 분석 결과
}

export interface AIAnalysis {
  id: string
  user_id: string
  record_ids: string[]  // 5개 기록 ID
  pattern: string
  workflow: string
  top_keywords: string[]
  insight: string
  project_id?: string  // 포트폴리오 카드 연결
  created_at: string
}

export interface ProjectCard {
  id: string
  user_id: string
  analysis_ids: string[]  // 4개 패턴 분석 ID
  record_ids: string[]  // 총 20개 기록 ID
  title: string
  period_start: string
  period_end: string
  tasks: string[]
  results: string[]
  thinking_summary: string
  image_url?: string
  created_at: string
}

// AI 응답 타입
export interface AIPreviewItem {
  original: string           // 원본 업무 내용
  skill: string              // 어떤 능력을 발휘했는지 (2-3줄)
  portfolioTerm: string      // 포트폴리오 표현
}

export interface AIPreviewResponse {
  items: AIPreviewItem[]
}

export interface AIAnalysisResponse {
  pattern: string
  workflow: string
  keywords: string[]
  insight: string
}

export interface AICardResponse {
  title: string
  tasks: string[]
  results: string[]
  thinking_summary: string
}

