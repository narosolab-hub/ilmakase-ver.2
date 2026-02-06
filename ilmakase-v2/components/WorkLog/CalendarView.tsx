'use client'

import { useState, useEffect } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface CalendarViewProps {
  selectedDate: string
  onDateSelect: (date: string) => void
}

interface DateStats {
  [date: string]: {
    tasksCount: number
    completionRate: number
  }
}

export default function CalendarView({ selectedDate, onDateSelect }: CalendarViewProps) {
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(parseISO(selectedDate))
  const [dateStats, setDateStats] = useState<DateStats>({})

  // 날짜별 통계 불러오기
  useEffect(() => {
    if (!user) return

    const fetchStats = async () => {
      const supabase = createClient()
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

      const { data } = await supabase
        .from('daily_logs')
        .select('log_date, parsed_tasks_count, completion_rate')
        .eq('user_id', user.id)
        .gte('log_date', monthStart)
        .lte('log_date', monthEnd)

      if (data) {
        const stats: DateStats = {}
        data.forEach(log => {
          stats[log.log_date] = {
            tasksCount: log.parsed_tasks_count,
            completionRate: log.completion_rate,
          }
        })
        setDateStats(stats)
      }
    }

    fetchStats()
  }, [user, currentMonth])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  return (
    <div>
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold text-gray-900">
          {format(currentMonth, 'yyyy년 M월', { locale: ko })}
        </h2>
        <button
          onClick={goToNextMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const isSelected = isSameDay(day, parseISO(selectedDate))
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const stats = dateStats[dateStr]
          const hasData = stats && stats.tasksCount > 0

          return (
            <button
              key={dateStr}
              onClick={() => onDateSelect(dateStr)}
              className={`
                relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all
                ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                ${isSelected ? 'bg-primary-500 text-white' : 'hover:bg-gray-100'}
              `}
            >
              <span className={isSelected ? 'font-bold' : ''}>
                {format(day, 'd')}
              </span>
              {hasData && (
                <div
                  className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                    isSelected
                      ? 'bg-white'
                      : stats.completionRate >= 80
                        ? 'bg-emerald-500'
                        : stats.completionRate >= 50
                          ? 'bg-amber-500'
                          : 'bg-gray-400'
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
