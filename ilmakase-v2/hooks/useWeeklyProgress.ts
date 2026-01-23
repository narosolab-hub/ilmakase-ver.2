'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { startOfWeek, endOfWeek, format, eachDayOfInterval } from 'date-fns'
import { ko } from 'date-fns/locale'

interface DailyStats {
  date: string
  dayName: string
  totalTasks: number
  completedTasks: number
  completionRate: number
}

interface WeeklyStats {
  dailyStats: DailyStats[]
  totalTasks: number
  completedTasks: number
  averageCompletionRate: number
  weekStart: string
  weekEnd: string
}

export function useWeeklyProgress(targetDate: string) {
  const { user } = useAuth()
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchWeeklyStats = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()

      const currentDate = new Date(targetDate)
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // 월요일 시작
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

      const weekStartStr = format(weekStart, 'yyyy-MM-dd')
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

      // 해당 주의 모든 work_logs 조회
      const { data: workLogs, error: fetchError } = await supabase
        .from('work_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('work_date', weekStartStr)
        .lte('work_date', weekEndStr)

      if (fetchError) throw fetchError

      // 주의 모든 날짜
      const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })

      // 날짜별 통계 계산
      const dailyStats: DailyStats[] = daysOfWeek.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayLogs = (workLogs || []).filter(log => log.work_date === dateStr)
        const completedLogs = dayLogs.filter(log => log.is_completed)

        return {
          date: dateStr,
          dayName: format(day, 'EEE', { locale: ko }),
          totalTasks: dayLogs.length,
          completedTasks: completedLogs.length,
          completionRate: dayLogs.length > 0
            ? Math.round((completedLogs.length / dayLogs.length) * 100)
            : 0,
        }
      })

      // 전체 통계
      const totalTasks = (workLogs || []).length
      const completedTasks = (workLogs || []).filter(log => log.is_completed).length
      const daysWithTasks = dailyStats.filter(d => d.totalTasks > 0)
      const averageCompletionRate = daysWithTasks.length > 0
        ? Math.round(
            daysWithTasks.reduce((sum, d) => sum + d.completionRate, 0) / daysWithTasks.length
          )
        : 0

      setWeeklyStats({
        dailyStats,
        totalTasks,
        completedTasks,
        averageCompletionRate,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
      })
    } catch (err) {
      setError(err as Error)
      console.error('Failed to fetch weekly stats:', err)
    } finally {
      setLoading(false)
    }
  }, [user, targetDate])

  useEffect(() => {
    fetchWeeklyStats()
  }, [fetchWeeklyStats])

  return {
    weeklyStats,
    loading,
    error,
    reload: fetchWeeklyStats,
  }
}
