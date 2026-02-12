'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  addDays,
  subDays,
  parseISO,
} from 'date-fns'
import { ko } from 'date-fns/locale'

interface DateMovePickerProps {
  currentDate: string         // 현재 업무 날짜 'YYYY-MM-DD' (이동 불가 날짜)
  onMove: (date: string) => void
  disabled?: boolean
  compact?: boolean
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function DateMovePicker({ currentDate, onMove, disabled, compact }: DateMovePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const currentDateParsed = useMemo(() => parseISO(currentDate), [currentDate])

  // 바깥 클릭 시 닫힘
  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // 열릴 때 현재 업무 날짜 월로 이동
  useEffect(() => {
    if (isOpen) {
      setCurrentMonth(parseISO(currentDate))
    }
  }, [isOpen, currentDate])

  const handleSelect = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    if (dateStr !== currentDate) {
      onMove(dateStr)
    }
    setIsOpen(false)
  }, [onMove, currentDate])

  // 빠른 선택 옵션
  const quickOptions = useMemo(() => {
    const options: { label: string; date: Date }[] = []
    const cur = parseISO(currentDate)

    const yesterday = subDays(cur, 1)
    options.push({ label: '어제', date: yesterday })

    if (!isSameDay(cur, today)) {
      options.push({ label: '오늘', date: today })
    }

    const tomorrow = addDays(cur, 1)
    options.push({ label: '내일', date: tomorrow })

    return options
  }, [currentDate, today])

  // 달력 날짜 계산
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* 트리거 버튼 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled) setIsOpen(!isOpen)
        }}
        disabled={disabled}
        className={`inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          compact ? 'text-[11px] text-gray-400 px-2 py-1' : 'text-sm text-gray-400 px-3 py-2'
        }`}
      >
        <svg className={compact ? 'w-3 h-3' : 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        날짜 이동
      </button>

      {/* 팝오버 */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg popover-enter"
          style={{ left: 0, minWidth: 280 }}
        >
          {/* 빠른 선택 */}
          <div className="flex flex-wrap gap-1.5 p-3 border-b border-gray-100">
            {quickOptions.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => handleSelect(opt.date)}
                className="px-3 py-1 text-xs rounded-full border bg-white text-gray-600 border-gray-200 hover:bg-primary-50 hover:border-primary-300 transition-colors cursor-pointer"
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <button
              type="button"
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-700">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </span>
            <button
              type="button"
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 px-3">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-medium text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 px-3 pb-3">
            {calendarDays.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isToday = isSameDay(day, today)
              const isCurrent = isSameDay(day, currentDateParsed)
              const dayStr = format(day, 'yyyy-MM-dd')

              return (
                <button
                  key={dayStr}
                  type="button"
                  onClick={() => !isCurrent && handleSelect(day)}
                  disabled={isCurrent}
                  className={`relative w-9 h-9 flex items-center justify-center text-xs rounded-lg transition-colors mx-auto
                    ${isCurrent ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'cursor-pointer'}
                    ${!isCurrentMonth && !isCurrent ? 'text-gray-300' : ''}
                    ${isCurrentMonth && !isCurrent && !isToday ? 'text-gray-700 hover:bg-primary-50' : ''}
                    ${isToday && !isCurrent ? 'text-primary-600 font-bold' : ''}
                  `}
                >
                  {format(day, 'd')}
                  {isToday && !isCurrent && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-500" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
