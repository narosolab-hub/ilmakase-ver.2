'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { dataCache, cacheKeys } from '@/lib/cache'
import { mapWorkLog, mapWorkLogToDB, type WorkLog } from '@/lib/mappers'
import type { ParsedTask, Subtask } from '@/types'

// 세부 업무 기반 진척도 계산
// 세부 업무 있을 때: (완료된 세부 업무 / 전체 세부 업무) * 90 + (메인 완료 ? 10 : 0)
// 세부 업무 없을 때: 기존 수동 진척도 또는 완료 여부에 따른 진척도
export function calculateProgressFromSubtasks(
  subtasks: Subtask[] | null | undefined,
  isCompleted: boolean,
  manualProgress?: number
): number {
  if (!subtasks || subtasks.length === 0) {
    // 세부 업무 없으면 기존 로직
    if (isCompleted) return 100
    return manualProgress ?? 0
  }

  const completedCount = subtasks.filter(s => s.is_completed).length
  const subtaskProgress = (completedCount / subtasks.length) * 90
  const mainBonus = isCompleted ? 10 : 0

  return Math.round(subtaskProgress + mainBonus)
}

export function useWorkLogs(targetDate: string) {
  const { user } = useAuth()
  const [workLogs, setWorkLogs] = useState<WorkLog[]>(() => {
    // 초기값으로 캐시된 데이터 사용
    if (user) {
      return dataCache.getImmediate<WorkLog[]>(cacheKeys.workLogs(user.id, targetDate)) || []
    }
    return []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchWorkLogs = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    // 캐시에서 즉시 표시
    const cacheKey = cacheKeys.workLogs(user.id, targetDate)
    const cached = dataCache.getImmediate<WorkLog[]>(cacheKey)
    if (cached && cached.length > 0) {
      setWorkLogs(cached)
      setLoading(false)
    }

    try {
      if (!cached || cached.length === 0) setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('work_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('work_date', targetDate)
        .order('created_at', { ascending: true })

      if (error) throw error

      // DB → Client 변환 후 캐시 저장
      const mapped = (data || []).map(mapWorkLog)
      dataCache.set(cacheKey, mapped)
      setWorkLogs(mapped)
    } catch (err) {
      setError(err as Error)
      console.error('Failed to fetch work logs:', err)
    } finally {
      setLoading(false)
    }
  }, [user, targetDate])

  useEffect(() => {
    fetchWorkLogs()
  }, [fetchWorkLogs])

  // 파싱된 태스크로부터 work_logs 동기화
  // 기존 진행도/완료 상태를 보존하면서 동기화
  // carryOverData: 미완료 업무에서 가져온 세부 업무/메모 데이터
  const syncFromParsedTasks = useCallback(async (
    tasks: ParsedTask[],
    projectMappings: Record<string, string> = {},
    carryOverData?: Map<string, { detail?: string | null; subtasks?: Subtask[] | null; progress?: number }>
  ) => {
    if (!user) throw new Error('로그인이 필요합니다')

    const supabase = createClient()

    // 현재 DB에 있는 로그 조회
    const { data: existingLogs } = await supabase
      .from('work_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('work_date', targetDate)

    // 기존 로그의 content를 키로 하는 맵 생성 (진행도 보존용)
    const existingLogMap = new Map(
      (existingLogs || []).map(log => [log.content, log])
    )

    // 새로운 태스크의 content 목록
    const newTaskContents = new Set(tasks.map(t => t.content))

    // 삭제해야 할 로그들 (새 태스크에 없는 것들)
    const logsToDelete = (existingLogs || []).filter(
      log => !newTaskContents.has(log.content)
    )

    // 삭제 실행
    if (logsToDelete.length > 0) {
      await supabase
        .from('work_logs')
        .delete()
        .in('id', logsToDelete.map(l => l.id))
    }

    if (tasks.length === 0) {
      setWorkLogs([])
      return
    }

    // 새로 추가해야 할 태스크들 (기존에 없던 것들)
    const tasksToInsert = tasks.filter(
      task => !existingLogMap.has(task.content)
    )

    // 업데이트해야 할 태스크들 (기존에 있지만 project 변경 등)
    const tasksToUpdate = tasks.filter(
      task => existingLogMap.has(task.content)
    )

    // 새 로그 삽입
    if (tasksToInsert.length > 0) {
      const logsToInsert = tasksToInsert.map(task => {
        // carryOverData에서 세부 업무/메모 가져오기
        const cacheKey = `${task.project_name}:${task.content}`
        const carryOver = carryOverData?.get(cacheKey)

        return {
          user_id: user.id,
          project_id: projectMappings[task.project_name] || null,
          content: task.content,
          work_date: targetDate,
          progress: carryOver?.progress ?? 0,
          is_completed: false,
          keywords: [task.project_name],
          detail: carryOver?.detail ?? null,
          subtasks: carryOver?.subtasks ?? null,
        }
      })

      await supabase.from('work_logs').insert(logsToInsert)
    }

    // 기존 로그 업데이트 (프로젝트 변경 시에만)
    for (const task of tasksToUpdate) {
      const existingLog = existingLogMap.get(task.content)
      if (existingLog) {
        const newProjectId = projectMappings[task.project_name] || null
        // 프로젝트나 키워드가 변경된 경우에만 업데이트
        if (existingLog.project_id !== newProjectId ||
            !existingLog.keywords?.includes(task.project_name)) {
          await supabase
            .from('work_logs')
            .update({
              project_id: newProjectId,
              keywords: [task.project_name],
            })
            .eq('id', existingLog.id)
        }
      }
    }

    // 최신 데이터 조회
    const { data: updatedLogs, error } = await supabase
      .from('work_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('work_date', targetDate)
      .order('created_at', { ascending: true })

    if (error) throw error

    // DB → Client 변환 후 캐시 갱신
    const mapped = (updatedLogs || []).map(mapWorkLog)
    const cacheKey = cacheKeys.workLogs(user.id, targetDate)
    dataCache.set(cacheKey, mapped)

    setWorkLogs(mapped)
    return mapped
  }, [user, targetDate])

  const updateWorkLog = useCallback(async (
    id: string,
    updates: Partial<WorkLog>
  ) => {
    if (!user) throw new Error('로그인이 필요합니다')

    const supabase = createClient()
    const dbUpdates = mapWorkLogToDB(updates)

    const { data, error } = await supabase
      .from('work_logs')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    const mapped = mapWorkLog(data)
    setWorkLogs(prev => prev.map(log => log.id === id ? mapped : log))
    return mapped
  }, [user])

  const deleteWorkLog = useCallback(async (id: string) => {
    if (!user) throw new Error('로그인이 필요합니다')

    const supabase = createClient()

    const { error } = await supabase
      .from('work_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    setWorkLogs(prev => prev.filter(log => log.id !== id))
  }, [user])

  return {
    workLogs,
    loading,
    error,
    syncFromParsedTasks,
    updateWorkLog,
    deleteWorkLog,
    reload: fetchWorkLogs,
  }
}
