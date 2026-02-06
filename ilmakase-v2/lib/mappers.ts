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
import type { Subtask } from '@/types'

// ============================================
// WorkLog
// ============================================

type WorkLogDB = Database['public']['Tables']['work_logs']['Row']

export interface WorkLog {
  id: string
  userId: string
  taskId: string | null
  projectId: string | null
  content: string
  detail: string | null
  workDate: string
  progress: number
  isCompleted: boolean
  aiAnalysis: unknown | null
  keywords: string[]
  subtasks: Subtask[] | null
  createdAt: string
  updatedAt: string
}

export const mapWorkLog = (db: WorkLogDB): WorkLog => ({
  id: db.id,
  userId: db.user_id,
  taskId: db.task_id,
  projectId: db.project_id,
  content: db.content,
  detail: db.detail,
  workDate: db.work_date,
  progress: db.progress,
  isCompleted: db.is_completed,
  aiAnalysis: db.ai_analysis,
  keywords: db.keywords,
  subtasks: db.subtasks as Subtask[] | null,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
})

export const mapWorkLogToDB = (client: Partial<WorkLog>): Partial<WorkLogDB> => {
  const result: Partial<WorkLogDB> = {}
  if (client.id !== undefined) result.id = client.id
  if (client.userId !== undefined) result.user_id = client.userId
  if (client.taskId !== undefined) result.task_id = client.taskId
  if (client.projectId !== undefined) result.project_id = client.projectId
  if (client.content !== undefined) result.content = client.content
  if (client.detail !== undefined) result.detail = client.detail
  if (client.workDate !== undefined) result.work_date = client.workDate
  if (client.progress !== undefined) result.progress = client.progress
  if (client.isCompleted !== undefined) result.is_completed = client.isCompleted
  if (client.aiAnalysis !== undefined) result.ai_analysis = client.aiAnalysis as WorkLogDB['ai_analysis']
  if (client.keywords !== undefined) result.keywords = client.keywords
  if (client.subtasks !== undefined) result.subtasks = client.subtasks as WorkLogDB['subtasks']
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
  parsedTasksCount: db.parsed_tasks_count,
  completionRate: db.completion_rate,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
})

// ============================================
// 필요 시 다른 테이블도 여기에 추가
// ============================================
