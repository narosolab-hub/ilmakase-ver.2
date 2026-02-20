'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { dataCache, cacheKeys } from '@/lib/cache'
import { mapWorkLog, type WorkLog } from '@/lib/mappers'
import type { Memo } from '@/types'

export function useBacklog() {
  const { user } = useAuth()
  const [backlogItems, setBacklogItems] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBacklog = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    const cacheKey = cacheKeys.backlog(user.id)
    const cached = dataCache.getImmediate<WorkLog[]>(cacheKey)
    if (cached) {
      setBacklogItems(cached)
      setLoading(false)
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('work_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'backlog')
        .order('created_at', { ascending: false })

      if (error) throw error

      const mapped = (data || []).map(mapWorkLog)
      dataCache.set(cacheKey, mapped)
      setBacklogItems(mapped)
    } catch (err) {
      console.error('Failed to fetch backlog:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchBacklog()
  }, [fetchBacklog])

  // 백로그 아이템을 오늘 날짜로 이동 (work_date 변경 + status 해제)
  const moveToToday = useCallback(async (item: WorkLog, targetDate: string) => {
    if (!user) return
    const supabase = createClient()

    const { error } = await supabase
      .from('work_logs')
      .update({
        work_date: targetDate,
        status: null,
      })
      .eq('id', item.id)
      .eq('user_id', user.id)

    if (error) throw error

    setBacklogItems(prev => prev.filter(b => b.id !== item.id))
    dataCache.invalidate(cacheKeys.backlog(user.id))
  }, [user])

  // 백로그에 새 업무 직접 추가
  const addToBacklog = useCallback(async (
    content: string,
    projectName: string,
    projectId?: string | null
  ) => {
    if (!user) return
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('work_logs')
      .insert({
        user_id: user.id,
        content,
        work_date: today,
        keywords: [projectName],
        project_id: projectId ?? null,
        status: 'backlog',
        progress: 0,
        is_completed: false,
      })
      .select()
      .single()

    if (error) throw error

    const mapped = mapWorkLog(data)
    setBacklogItems(prev => [mapped, ...prev])
    dataCache.invalidate(cacheKeys.backlog(user.id))
  }, [user])

  // 백로그 아이템 메모 업데이트
  const updateBacklogMemo = useCallback(async (id: string, memos: Memo[] | null) => {
    if (!user) return
    const supabase = createClient()

    const { error } = await supabase
      .from('work_logs')
      .update({ memos: memos as unknown as null })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    setBacklogItems(prev => prev.map(item =>
      item.id === id ? { ...item, memos } : item
    ))
    dataCache.invalidate(cacheKeys.backlog(user.id))
  }, [user])

  // 백로그 아이템 삭제
  const deleteBacklog = useCallback(async (id: string) => {
    if (!user) return
    const supabase = createClient()

    const { error } = await supabase
      .from('work_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    setBacklogItems(prev => prev.filter(b => b.id !== id))
    dataCache.invalidate(cacheKeys.backlog(user.id))
  }, [user])

  return {
    backlogItems,
    loading,
    moveToToday,
    addToBacklog,
    updateBacklogMemo,
    deleteBacklog,
    reload: fetchBacklog,
  }
}
