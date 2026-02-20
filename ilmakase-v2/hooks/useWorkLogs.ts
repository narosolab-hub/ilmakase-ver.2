'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { dataCache, storageCache, cacheKeys } from '@/lib/cache'
import { mapWorkLog, mapWorkLogToDB, type WorkLog } from '@/lib/mappers'
import type { ParsedTask, Subtask, Memo } from '@/types'
import type { Json } from '@/types/database'

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

    const cacheKey = cacheKeys.workLogs(user.id, targetDate)
    const memCached = dataCache.getImmediate<WorkLog[]>(cacheKey)

    if (memCached && memCached.length > 0) {
      // 메모리 캐시: 탭 전환 시 즉시 표시
      setWorkLogs(memCached)
      setLoading(false)
    } else {
      // localStorage 캐시: 새로고침 후에도 즉시 표시
      const storageCached = storageCache.get<WorkLog[]>(cacheKey)
      if (storageCached && storageCached.length > 0) {
        setWorkLogs(storageCached)
        setLoading(false)
      }
    }

    try {
      if (!memCached || memCached.length === 0) setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('work_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('work_date', targetDate)
        .order('created_at', { ascending: true })

      if (error) throw error

      // DB → Client 변환 후 메모리 + localStorage 캐시 저장 (10분 TTL)
      const mapped = (data || []).map(mapWorkLog)
      dataCache.set(cacheKey, mapped)
      storageCache.set(cacheKey, mapped, 10 * 60 * 1000)
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
    carryOverData?: Map<string, { detail?: string | null; subtasks?: Subtask[] | null; progress?: number; dueDate?: string | null; memos?: Memo[] | null }>
  ) => {
    if (!user) return null

    const supabase = createClient()

    // 현재 DB에 있는 로그 조회 (backlog 제외 — status='backlog'는 syncFromParsedTasks 대상 아님)
    const { data: existingLogs } = await supabase
      .from('work_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('work_date', targetDate)
      .is('status', null)

    const existing = existingLogs || []

    // 1단계: content 정확 매치
    const exactMatchByContent = new Map(
      existing.map(log => [log.content, log])
    )
    const matchedLogIds = new Set<string>()
    const matchedTaskIndices = new Set<number>()
    // task index → matched log
    const taskLogPairs = new Map<number, typeof existing[0]>()

    for (let i = 0; i < tasks.length; i++) {
      const log = exactMatchByContent.get(tasks[i].content)
      if (log && !matchedLogIds.has(log.id)) {
        taskLogPairs.set(i, log)
        matchedLogIds.add(log.id)
        matchedTaskIndices.add(i)
      }
    }

    // 2단계: 매칭 안 된 태스크 ↔ 매칭 안 된 로그 간 유사도 매칭
    // (띄어쓰기 변경, 오타 수정 등 감지)
    const unmatchedTasks = tasks
      .map((t, i) => ({ task: t, index: i }))
      .filter(({ index }) => !matchedTaskIndices.has(index))
    const unmatchedLogs = existing.filter(l => !matchedLogIds.has(l.id))

    if (unmatchedTasks.length > 0 && unmatchedLogs.length > 0) {
      // 공백 제거 후 비교 (띄어쓰기 변경 감지)
      const normalize = (s: string) => s.replace(/\s+/g, '')

      for (const { task, index } of unmatchedTasks) {
        const normalizedTask = normalize(task.content)
        // 같은 프로젝트 + 공백 제거 후 동일 → 내용 수정(띄어쓰기 변경)으로 판단
        const match = unmatchedLogs.find(log =>
          !matchedLogIds.has(log.id) &&
          log.keywords?.[0] === task.project_name &&
          normalize(log.content) === normalizedTask
        )
        if (match) {
          taskLogPairs.set(index, match)
          matchedLogIds.add(match.id)
          matchedTaskIndices.add(index)
          continue
        }
        // 같은 프로젝트 + 한쪽이 다른 쪽을 포함 → 내용 수정으로 판단
        const partialMatch = unmatchedLogs.find(log =>
          !matchedLogIds.has(log.id) &&
          log.keywords?.[0] === task.project_name &&
          (normalizedTask.includes(normalize(log.content)) ||
           normalize(log.content).includes(normalizedTask))
        )
        if (partialMatch) {
          taskLogPairs.set(index, partialMatch)
          matchedLogIds.add(partialMatch.id)
          matchedTaskIndices.add(index)
        }
      }
    }

    // 삭제: 어떤 태스크와도 매칭 안 된 기존 로그
    const logsToDelete = existing.filter(l => !matchedLogIds.has(l.id))

    if (tasks.length === 0) {
      if (logsToDelete.length > 0) {
        await supabase
          .from('work_logs')
          .delete()
          .in('id', logsToDelete.map(l => l.id))
      }
      setWorkLogs([])
      return
    }

    // 새로 추가: 매칭 안 된 태스크
    const tasksToInsert = tasks.filter((_, i) => !matchedTaskIndices.has(i))
    const logsToInsert = tasksToInsert.map(task => {
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
        due_date: carryOver?.dueDate ?? null,
        subtasks: (carryOver?.subtasks ?? null) as unknown as Json,
        memos: (carryOver?.memos ?? null) as unknown as Json,
      }
    })

    // 업데이트: 매칭된 태스크 (content 변경, 프로젝트 변경 등)
    const updateOps: Promise<unknown>[] = []
    for (let i = 0; i < tasks.length; i++) {
      const log = taskLogPairs.get(i)
      if (!log) continue
      const task = tasks[i]
      const newProjectId = projectMappings[task.project_name] || null
      const contentChanged = log.content !== task.content
      const projectChanged = log.project_id !== newProjectId ||
        !log.keywords?.includes(task.project_name)

      if (contentChanged || projectChanged) {
        const updates: Record<string, unknown> = {
          keywords: [task.project_name],
          project_id: newProjectId,
        }
        if (contentChanged) {
          updates.content = task.content
        }
        updateOps.push(
          Promise.resolve(supabase.from('work_logs').update(updates).eq('id', log.id))
        )
      }
    }

    // DELETE + INSERT + UPDATE 병렬 실행 (서로 다른 행이므로 안전)
    await Promise.all([
      logsToDelete.length > 0
        ? Promise.resolve(supabase.from('work_logs').delete().in('id', logsToDelete.map(l => l.id)))
        : Promise.resolve(),
      logsToInsert.length > 0
        ? Promise.resolve(supabase.from('work_logs').insert(logsToInsert))
        : Promise.resolve(),
      ...updateOps,
    ])

    // 최신 데이터 조회
    const { data: updatedLogs, error } = await supabase
      .from('work_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('work_date', targetDate)
      .order('created_at', { ascending: true })

    if (error) throw error

    // DB → Client 변환 후 메모리 + localStorage 캐시 갱신
    const mapped = (updatedLogs || []).map(mapWorkLog)
    const cacheKey = cacheKeys.workLogs(user.id, targetDate)
    dataCache.set(cacheKey, mapped)
    storageCache.set(cacheKey, mapped, 10 * 60 * 1000)

    setWorkLogs(mapped)
    return mapped
  }, [user, targetDate])

  const updateWorkLog = useCallback(async (
    id: string,
    updates: Partial<WorkLog>
  ) => {
    if (!user) return null

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
    if (!user) return

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
