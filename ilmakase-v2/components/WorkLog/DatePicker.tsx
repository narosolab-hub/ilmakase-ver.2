'use client'

import { format, parseISO, addDays, subDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getKSTDate } from '@/lib/utils'

interface DatePickerProps {
  selectedDate: string
  onChange: (date: string) => void
}

export default function DatePicker({ selectedDate, onChange }: DatePickerProps) {
  const today = getKSTDate()
  const isToday = selectedDate === today

  const goPrev = () => onChange(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))
  const goNext = () => onChange(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))
  const goToday = () => onChange(today)

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={goPrev}
        className="p-2 hover:bg-gray-100 rounded-lg transition"
        title="이전 날"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-gray-900">
          {format(parseISO(selectedDate), 'M월 d일', { locale: ko })}
        </span>
        <span className="text-sm text-gray-500">
          {format(parseISO(selectedDate), 'EEEE', { locale: ko })}
        </span>
      </div>

      <button
        onClick={goNext}
        className="p-2 hover:bg-gray-100 rounded-lg transition"
        title="다음 날"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {!isToday && (
        <button
          onClick={goToday}
          className="ml-2 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition"
        >
          오늘
        </button>
      )}
    </div>
  )
}
