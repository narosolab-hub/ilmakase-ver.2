/**
 * DB ↔ Client 타입 매핑
 *
 * DB: snake_case (Supabase)
 * Client: camelCase (React 컴포넌트)
 *
 * 사용법:
 * const clientData = mapWorkLog(dbRow)
 * const dbData = mapWorkLogToDB(clientData)
 */

import type { Database } from '@/types/database'
import type { Subtask, Memo } from '@/types'

// ============================================
// WorkLog
// ============================================

type WorkLogDB = Database['public']['Tables']['work_logs']['Row']

export interface WorkLog {
  id: string
  userId: string
  projectId: string | null
  content: string
  detail: string | null
  dueDate: string | null
  workDate: string
  progress: number
  isCompleted: boolean
  aiAnalysis: unknown | null
  keywords: string[]
  subtasks: Subtask[] | null
  memos: Memo[] | null
  createdAt: string
  updatedAt: string
}

export const mapWorkLog = (db: WorkLogDB): WorkLog => {
  // memos가 없고 detail이 있으면 detail을 legacy 메모로 자동 변환 (마이그레이션 전 backward compat)
  let memos = db.memos as Memo[] | null
  if (!memos && db.detail) {
    memos = [{ id: 'legacy', content: db.detail, created_at: db.work_date }]
  }
  return {
    id: db.id,
    userId: db.user_id,
    projectId: db.project_id,
    content: db.content,
    detail: db.detail,
    dueDate: db.due_date ?? null,
    workDate: db.work_date,
    progress: db.progress ?? 0,
    isCompleted: db.is_completed ?? false,
    aiAnalysis: db.ai_analysis,
    keywords: db.keywords ?? [],
    subtasks: db.subtasks as Subtask[] | null,
    memos,
    createdAt: db.created_at ?? '',
    updatedAt: db.updated_at ?? '',
  }
}

export const mapWorkLogToDB = (client: Partial<WorkLog>): Partial<WorkLogDB> => {
  const result: Partial<WorkLogDB> = {}
  if (client.id !== undefined) result.id = client.id
  if (client.userId !== undefined) result.user_id = client.userId
  if (client.projectId !== undefined) result.project_id = client.projectId
  if (client.content !== undefined) result.content = client.content
  if (client.detail !== undefined) result.detail = client.detail
  if (client.dueDate !== undefined) result.due_date = client.dueDate
  if (client.workDate !== undefined) result.work_date = client.workDate
  if (client.progress !== undefined) result.progress = client.progress
  if (client.isCompleted !== undefined) result.is_completed = client.isCompleted
  if (client.aiAnalysis !== undefined) result.ai_analysis = client.aiAnalysis as WorkLogDB['ai_analysis']
  if (client.keywords !== undefined) result.keywords = client.keywords
  if (client.subtasks !== undefined) result.subtasks = client.subtasks as WorkLogDB['subtasks']
  if (client.memos !== undefined) result.memos = client.memos as WorkLogDB['memos']
  return result
}

// ============================================
// DailyLog
// ============================================

type DailyLogDB = Database['public']['Tables']['daily_logs']['Row']

export interface DailyLog {
  id: string
  userId: string
  logDate: string
  rawContent: string | null
  parsedTasksCount: number
  completionRate: number
  createdAt: string
  updatedAt: string
}

export const mapDailyLog = (db: DailyLogDB): DailyLog => ({
  id: db.id,
  userId: db.user_id,
  logDate: db.log_date,
  rawContent: db.raw_content,
  parsedTasksCount: db.parsed_tasks_count ?? 0,
  completionRate: db.completion_rate ?? 0,
  createdAt: db.created_at ?? '',
  updatedAt: db.updated_at ?? '',
})

// ============================================
// CareerDocument
// ============================================

type CareerDocumentDB = Database['public']['Tables']['career_documents']['Row']

export interface CareerDocumentMapped {
  id: string
  userId: string
  companyId: string | null
  title: string
  content: string | null
  projectIds: string[]
  priorityConfig: { projectId: string; priority: string }[] | null
  periodStart: string | null
  periodEnd: string | null
  role: string | null
  createdAt: string
  updatedAt: string
}

export const mapCareerDocument = (db: CareerDocumentDB): CareerDocumentMapped => ({
  id: db.id,
  userId: db.user_id,
  companyId: db.company_id ?? null,
  title: db.title,
  content: db.content ?? null,
  projectIds: db.project_ids ?? [],
  priorityConfig: db.priority_config as CareerDocumentMapped['priorityConfig'],
  periodStart: db.period_start ?? null,
  periodEnd: db.period_end ?? null,
  role: db.role ?? null,
  createdAt: db.created_at ?? '',
  updatedAt: db.updated_at ?? '',
})
