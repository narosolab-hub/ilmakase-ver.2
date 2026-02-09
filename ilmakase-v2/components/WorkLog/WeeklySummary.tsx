'use client'

import { useState, useEffect } from 'react'
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { dataCache, cacheKeys } from '@/lib/cache'

interface DailyStat {
  date: string
  taskCount: number
  completedCount: number
}

interface WeeklySummaryProps {
  selectedDate: string
  refreshKey?: number
}

export default function WeeklySummary({ selectedDate, refreshKey = 0 }: WeeklySummaryProps) {
  const { user } = useAuth()
  const [weeklyStats, setWeeklyStats] = useState<DailyStat[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  const loadWeeklyStats = async (skipCache = false) => {
    if (!user) return

    const currentDate = new Date(selectedDate)
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    const cacheKey = cacheKeys.weeklyStats(user.id, weekStartStr)

    // 캐시에서 즉시 표시 (skipCache가 아닐 때만)
    if (!skipCache) {
      const cached = dataCache.getImmediate<DailyStat[]>(cacheKey)
      if (cached && cached.length > 0) {
        setWeeklyStats(cached)
        setLoading(false)
        setInitialLoadDone(true)
      }
    }

    try {
      if (!skipCache && (!dataCache.getImmediate(cacheKey))) setLoading(true)
      const supabase = createClient()

      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

      const { data: workLogs } = await supabase
        .from('work_logs')
        .select('work_date, progress, is_completed')
        .eq('user_id', user.id)
        .gte('work_date', weekStartStr)
        .lte('work_date', format(weekEnd, 'yyyy-MM-dd'))

      const dailyStatsMap = new Map<string, { total: number; completed: number }>()

      workLogs?.forEach(log => {
        if (!dailyStatsMap.has(log.work_date)) {
          dailyStatsMap.set(log.work_date, { total: 0, completed: 0 })
        }
        const stats = dailyStatsMap.get(log.work_date)!
        stats.total++
        if (log.is_completed || log.progress === 100) stats.completed++
      })

      const stats = weekDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayStat = dailyStatsMap.get(dateStr) || { total: 0, completed: 0 }
        return {
          date: dateStr,
          taskCount: dayStat.total,
          completedCount: dayStat.completed
        }
      })

      // 캐시 저장
      dataCache.set(cacheKey, stats)
      setWeeklyStats(stats)
    } catch (err) {
      console.error('주간 통계 로드 실패:', err)
    } finally {
      setLoading(false)
      setInitialLoadDone(true)
    }
  }

  useEffect(() => {
    loadWeeklyStats()
  }, [user, selectedDate])

  // refreshKey가 변경되면 캐시 무시하고 새로 로드 (저장 후 즉시 반영)
  useEffect(() => {
    if (refreshKey > 0) {
      loadWeeklyStats(true)
    }
  }, [refreshKey])

  // 초기 로딩 시에만 로딩 표시 (탭 전환 시 기존 데이터 유지)
  if (!initialLoadDone && loading) {
    return <div className="text-center py-4 text-gray-500 text-sm">불러오는 중...</div>
  }

  const totalTasks = weeklyStats.reduce((sum, day) => sum + day.taskCount, 0)
  const totalCompleted = weeklyStats.reduce((sum, day) => sum + day.completedCount, 0)
  const weeklyCompletionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0

  return (
    <div className="space-y-4">
      {/* 헤더 + 새로고침 버튼 */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-900">이번 주 요약</h3>
        <button
          onClick={() => loadWeeklyStats()}
          disabled={loading}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="새로고침"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
          <div className="text-[10px] text-gray-500 font-medium mb-0.5">전체</div>
          <div className="text-lg font-bold text-gray-900">{totalTasks}</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
          <div className="text-[10px] text-gray-500 font-medium mb-0.5">완료</div>
          <div className="text-lg font-bold text-emerald-600">{totalCompleted}</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
          <div className="text-[10px] text-gray-500 font-medium mb-0.5">완료율</div>
          <div className="text-lg font-bold text-primary-600">{weeklyCompletionRate}%</div>
        </div>
      </div>

      {/* 일별 차트 */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        {weeklyStats.map((day) => {
          const rate = day.taskCount > 0 ? (day.completedCount / day.taskCount) * 100 : 0
          const isSelected = day.date === selectedDate

          return (
            <div key={day.date} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-medium ${isSelected ? 'text-primary-600' : 'text-gray-600'}`}>
                  {format(new Date(day.date), 'E', { locale: ko })}
                </span>
                <span className="text-gray-400 text-[10px]">
                  {day.taskCount > 0 ? `${day.completedCount}/${day.taskCount}` : '-'}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all rounded-full ${
                    day.taskCount === 0
                      ? 'bg-gray-200'
                      : rate === 100
                        ? 'bg-emerald-500'
                        : rate > 0
                          ? 'bg-primary-500'
                          : 'bg-gray-300'
                  }`}
                  style={{ width: day.taskCount === 0 ? '100%' : `${rate}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
