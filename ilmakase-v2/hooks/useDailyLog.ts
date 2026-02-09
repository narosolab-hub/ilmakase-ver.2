'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { dataCache, cacheKeys } from '@/lib/cache'

interface DailyLog {
  id: string
  log_date: string
  raw_content: string | null
  parsed_tasks_count: number
  completion_rate: number
}

export function useDailyLog(targetDate: string) {
  const { user } = useAuth()
  const [log, setLog] = useState<DailyLog | null>(() => {
    // 초기값으로 캐시된 데이터 사용
    if (user) {
      return dataCache.getImmediate<DailyLog>(cacheKeys.dailyLog(user.id, targetDate))
    }
    return null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchLog = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    const cacheKey = cacheKeys.dailyLog(user.id, targetDate)
    const cached = dataCache.getImmediate<DailyLog>(cacheKey)

    // 캐시 있으면 즉시 표시, 없으면 로딩
    if (cached) {
      setLog(cached)
      setLoading(false)
    } else {
      setLog(null)
      setLoading(true)
    }

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', targetDate)
        .maybeSingle()

      if (error) {
        throw error
      }

      // 캐시 저장
      if (data) {
        dataCache.set(cacheKey, data)
      }
      setLog(data as DailyLog | null)
    } catch (err) {
      setError(err as Error)
      console.error('Failed to fetch daily log:', err)
    } finally {
      setLoading(false)
    }
  }, [user, targetDate])

  useEffect(() => {
    fetchLog()
  }, [fetchLog])

  const saveLog = useCallback(async (rawContent: string, tasksCount?: number, completionRate?: number) => {
    if (!user) throw new Error('로그인이 필요합니다')

    const supabase = createClient()

    const logData = {
      user_id: user.id,
      log_date: targetDate,
      raw_content: rawContent,
      parsed_tasks_count: tasksCount ?? 0,
      completion_rate: completionRate ?? 0,
    }

    const { data, error } = await supabase
      .from('daily_logs')
      .upsert(logData, { onConflict: 'user_id,log_date' })
      .select()
      .maybeSingle()

    if (error) {
      console.error('[saveLog]', error)
      throw error
    }

    if (!data) {
      throw new Error('저장 후 데이터를 가져올 수 없습니다')
    }

    // 캐시 갱신
    const cacheKey = cacheKeys.dailyLog(user.id, targetDate)
    dataCache.set(cacheKey, data)

    setLog(data as DailyLog)
    return data
  }, [user, targetDate])

  const reload = useCallback(() => {
    fetchLog()
  }, [fetchLog])

  return { log, loading, error, saveLog, reload }
}
