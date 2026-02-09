'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { dataCache, cacheKeys } from '@/lib/cache'
import type { Subtask } from '@/types'

export interface IncompleteTaskData {
  content: string
  project: string
  date: string
  detail: string | null
  dueDate: string | null
  subtasks: Subtask[] | null
  progress: number
}

export function useCarryOver() {
  const { user } = useAuth()
  const [carryingOver, setCarryingOver] = useState(false)

  // 캐시 무효화 (업무 상태 변경 시 호출)
  const invalidateCache = useCallback((targetDate?: string) => {
    if (!user) return
    if (targetDate) {
      dataCache.invalidate(cacheKeys.incompleteTasks(user.id, targetDate) + ':data')
    } else {
      // 모든 날짜의 미완료 캐시 삭제 (패턴 매칭)
      dataCache.invalidatePattern(`incomplete:${user.id}:`)
    }
  }, [user])

  // 미완료 업무 데이터 (세부 업무/메모 포함)
  const getIncompleteTasks = useCallback(async (targetDate: string, skipCache = false): Promise<IncompleteTaskData[]> => {
    if (!user) return []

    // 캐시 확인
    const cacheKey = cacheKeys.incompleteTasks(user.id, targetDate) + ':data'
    if (!skipCache) {
      const cached = dataCache.get<IncompleteTaskData[]>(cacheKey)
      if (cached !== null) {
        return cached
      }
    }

    setCarryingOver(true)

    try {
      const supabase = createClient()

      const targetDateObj = new Date(targetDate)
      const sevenDaysAgo = new Date(targetDateObj)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      // subtasks, detail, due_date도 함께 가져오기
      const { data: allWorkLogs } = await supabase
        .from('work_logs')
        .select('content, keywords, work_date, progress, is_completed, detail, subtasks, due_date')
        .eq('user_id', user.id)
        .gte('work_date', sevenDaysAgo.toISOString().split('T')[0])
        .lt('work_date', targetDate)
        .order('work_date', { ascending: false })

      if (!allWorkLogs || allWorkLogs.length === 0) {
        dataCache.set(cacheKey, [], 5 * 60 * 1000)
        return []
      }

      const completedContents = new Set(
        allWorkLogs
          .filter(log => log.is_completed)
          .map(log => log.content)
      )

      const workLogs = allWorkLogs.filter(log => !log.is_completed)

      if (workLogs.length === 0) {
        dataCache.set(cacheKey, [], 5 * 60 * 1000)
        return []
      }

      // 중복 제거 + 메타데이터 보존
      const uniqueTasks = new Map<string, IncompleteTaskData>()

      workLogs.forEach(log => {
        if (completedContents.has(log.content)) return

        if (!uniqueTasks.has(log.content)) {
          uniqueTasks.set(log.content, {
            content: log.content,
            project: log.keywords?.[0] || '기타',
            date: log.work_date,
            detail: log.detail,
            dueDate: log.due_date ?? null,
            subtasks: log.subtasks as Subtask[] | null,
            progress: log.progress ?? 0,
          })
        }
      })

      const result = Array.from(uniqueTasks.values())
      dataCache.set(cacheKey, result, 5 * 60 * 1000)
      return result
    } catch (err) {
      console.error('Carry over failed:', err)
      return []
    } finally {
      setCarryingOver(false)
    }
  }, [user])

  return { getIncompleteTasks, invalidateCache, carryingOver }
}
