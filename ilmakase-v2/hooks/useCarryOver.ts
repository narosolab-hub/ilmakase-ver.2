'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { dataCache, cacheKeys } from '@/lib/cache'
import type { Subtask, Memo } from '@/types'

export interface IncompleteTaskData {
  id: string
  content: string
  project: string
  date: string
  detail: string | null
  dueDate: string | null
  subtasks: Subtask[] | null
  memos: Memo[] | null
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

      // subtasks, detail, due_date, memos도 함께 가져오기
      const [{ data: allWorkLogs }, { data: todayWorkLogs }] = await Promise.all([
        supabase
          .from('work_logs')
          .select('id, content, keywords, work_date, progress, is_completed, detail, subtasks, due_date, memos, status')
          .eq('user_id', user.id)
          .gte('work_date', sevenDaysAgo.toISOString().split('T')[0])
          .lt('work_date', targetDate)
          .order('work_date', { ascending: false }),
        supabase
          .from('work_logs')
          .select('content')
          .eq('user_id', user.id)
          .eq('work_date', targetDate),
      ])

      if (!allWorkLogs || allWorkLogs.length === 0) {
        dataCache.set(cacheKey, [], 5 * 60 * 1000)
        return []
      }

      // 오늘 이미 존재하는 업무 내용 (이미 추가된 미완료 업무 제외용)
      const todayContents = new Set(
        (todayWorkLogs || []).map(log => log.content)
      )

      const completedContents = new Set(
        allWorkLogs
          .filter(log => log.is_completed)
          .map(log => log.content)
      )

      // 백로그 제외: JS에서 필터 (DB migration 전후 모두 안전, NULL != 'backlog' 처리)
      const workLogs = allWorkLogs.filter(log => !log.is_completed && (log as { status?: string | null }).status !== 'backlog')

      if (workLogs.length === 0) {
        dataCache.set(cacheKey, [], 5 * 60 * 1000)
        return []
      }

      // 중복 제거 + 메타데이터 보존
      const uniqueTasks = new Map<string, IncompleteTaskData>()

      workLogs.forEach(log => {
        if (completedContents.has(log.content)) return
        if (todayContents.has(log.content)) return

        if (!uniqueTasks.has(log.content)) {
          // memos가 없고 detail이 있으면 legacy 메모로 변환
          let memos = log.memos as Memo[] | null
          if (!memos && log.detail) {
            memos = [{ id: 'legacy', content: log.detail, created_at: log.work_date }]
          }
          uniqueTasks.set(log.content, {
            id: log.id,
            content: log.content,
            project: log.keywords?.[0] || '기타',
            date: log.work_date,
            detail: log.detail,
            dueDate: log.due_date ?? null,
            subtasks: log.subtasks as Subtask[] | null,
            memos,
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

  // 미완료 업무를 백로그로 이동 (status = 'backlog')
  const moveToBacklog = useCallback(async (id: string) => {
    if (!user) return
    const supabase = createClient()
    await supabase
      .from('work_logs')
      .update({ status: 'backlog' })
      .eq('id', id)
      .eq('user_id', user.id)
  }, [user])

  return { getIncompleteTasks, invalidateCache, carryingOver, moveToBacklog }
}
