'use client'

import { useState, useEffect } from 'react'
import CalendarView from './CalendarView'
import WeeklySummary from './WeeklySummary'

interface MobileCalendarPanelProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: string
  onDateSelect: (date: string) => void
  refreshKey: number
}

export default function MobileCalendarPanel({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
  refreshKey,
}: MobileCalendarPanelProps) {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      setAnimating(true)
      const timer = setTimeout(() => setAnimating(false), 300)
      return () => clearTimeout(timer)
    } else if (visible) {
      setAnimating(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setAnimating(false)
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen, visible])

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [visible])

  if (!visible) return null

  const handleDateSelect = (date: string) => {
    onDateSelect(date)
    onClose()
  }

  return (
    <>
      {/* 백드롭 */}
      <div
        className={`fixed inset-0 z-[55] bg-black/40 ${isOpen ? 'mobile-backdrop-enter' : 'mobile-backdrop-exit'}`}
        onClick={onClose}
      />

      {/* 사이드 패널 (왼쪽 → 오른쪽 슬라이드) */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-[56] w-[85%] max-w-[320px] bg-white shadow-2xl flex flex-col ${
          isOpen ? 'mobile-panel-enter-left' : 'mobile-panel-exit-left'
        }`}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">캘린더</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 캘린더 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <CalendarView
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          </div>

          {/* 이번 주 요약 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <WeeklySummary selectedDate={selectedDate} refreshKey={refreshKey} />
          </div>
        </div>
      </div>
    </>
  )
}
