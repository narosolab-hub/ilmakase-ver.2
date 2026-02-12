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
  nextFriday,
  nextMonday,
  isAfter,
  isFriday,
  isMonday,
  parseISO,
} from 'date-fns'
import { ko } from 'date-fns/locale'

interface DueDatePickerProps {
  value: string | null        // 'YYYY-MM-DD' or null
  onChange: (date: string | null) => void
  disabled?: boolean
  compact?: boolean           // ProjectDetailPanel용 작은 사이즈
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function DueDatePicker({ value, onChange, disabled, compact }: DueDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() =>
    value ? parseISO(value) : new Date()
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const selectedDate = useMemo(() =>
    value ? parseISO(value) : null
  , [value])

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

  // 열릴 때 선택된 날짜 월로 이동
  useEffect(() => {
    if (isOpen && value) {
      setCurrentMonth(parseISO(value))
    } else if (isOpen) {
      setCurrentMonth(new Date())
    }
  }, [isOpen, value])

  const handleSelect = useCallback((date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'))
    setIsOpen(false)
  }, [onChange])

  const handleClear = useCallback(() => {
    onChange(null)
    setIsOpen(false)
  }, [onChange])

  // 빠른 선택 옵션 계산
  const quickOptions = useMemo(() => {
    const options: { label: string; date: Date }[] = []

    // 오늘
    options.push({ label: '오늘', date: today })

    // 내일
    options.push({ label: '내일', date: addDays(today, 1) })

    // 이번 주 금요일 (오늘이 금요일 이전이면)
    if (!isFriday(today) && !isAfter(today, nextFriday(today))) {
      const fri = nextFriday(today)
      // 같은 주인지 확인 (오늘이 토요일이면 다음주 금요일이므로 제외)
      if (today.getDay() !== 0 && today.getDay() !== 6) {
        options.push({ label: '금요일', date: fri })
      }
    }

    // 다음 주 월요일
    const mon = nextMonday(today)
    if (!isMonday(today)) {
      options.push({ label: '다음주 월', date: mon })
    } else {
      options.push({ label: '다음주 월', date: addDays(today, 7) })
    }

    return options
  }, [today])

  // 달력 날짜 계산
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  // 트리거 표시 텍스트
  const displayText = useMemo(() => {
    if (!value) return compact ? '마감일' : '마감일 설정'
    const d = parseISO(value)
    return format(d, 'M/d (EEE)', { locale: ko })
  }, [value, compact])

  // 트리거 색상
  const triggerClassName = useMemo(() => {
    if (!value) {
      return compact
        ? 'text-[11px] text-gray-400 border border-dashed border-gray-300 hover:border-gray-400'
        : 'text-sm text-gray-400 border border-dashed border-gray-300 hover:border-gray-400'
    }
    // 마감일이 있으면 D-day 상태에 따라 색상
    const due = parseISO(value)
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) {
      return compact
        ? 'text-[11px] text-red-500 bg-red-50 border border-red-200'
        : 'text-sm text-red-500 bg-red-50 border border-red-200'
    }
    if (diffDays === 0) {
      return compact
        ? 'text-[11px] text-amber-600 bg-amber-50 border border-amber-200'
        : 'text-sm text-amber-600 bg-amber-50 border border-amber-200'
    }
    return compact
      ? 'text-[11px] text-gray-600 bg-gray-50 border border-gray-200'
      : 'text-sm text-gray-600 bg-gray-50 border border-gray-200'
  }, [value, today, compact])

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
        className={`inline-flex items-center gap-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${triggerClassName} ${
          compact ? 'px-2 py-1' : 'px-3 py-2'
        }`}
      >
        <svg className={compact ? 'w-3 h-3' : 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {displayText}
      </button>

      {/* 팝오버 */}
      {isOpen && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg popover-enter"
          style={{ left: 0, minWidth: 280 }}
        >
          {/* 빠른 선택 */}
          <div className="flex flex-wrap gap-1.5 p-3 border-b border-gray-100">
            {quickOptions.map((opt) => {
              const isSelected = selectedDate && isSameDay(opt.date, selectedDate)
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleSelect(opt.date)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-primary-50 hover:border-primary-300'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
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
          <div className="grid grid-cols-7 px-3 pb-2">
            {calendarDays.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isToday = isSameDay(day, today)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const dayStr = format(day, 'yyyy-MM-dd')

              return (
                <button
                  key={dayStr}
                  type="button"
                  onClick={() => handleSelect(day)}
                  className={`relative w-9 h-9 flex items-center justify-center text-xs rounded-lg transition-colors cursor-pointer mx-auto
                    ${!isCurrentMonth ? 'text-gray-300' : ''}
                    ${isCurrentMonth && !isSelected && !isToday ? 'text-gray-700 hover:bg-primary-50' : ''}
                    ${isToday && !isSelected ? 'text-primary-600 font-bold' : ''}
                    ${isSelected ? 'bg-primary-500 text-white font-semibold' : ''}
                  `}
                >
                  {format(day, 'd')}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-500" />
                  )}
                </button>
              )
            })}
          </div>

          {/* 해제 버튼 */}
          {value && (
            <div className="border-t border-gray-100 px-3 py-2">
              <button
                type="button"
                onClick={handleClear}
                className="w-full text-center text-xs text-gray-400 hover:text-red-500 py-1 transition-colors cursor-pointer"
              >
                마감일 해제
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
