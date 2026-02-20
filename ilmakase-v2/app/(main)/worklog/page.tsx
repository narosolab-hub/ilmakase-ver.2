'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DailyLogEditor, CalendarView, DatePicker, WeeklySummary, MobileCalendarPanel } from '@/components/WorkLog'
import { MobileBottomNav, DesktopTabs } from '@/components/UI'
import { getKSTDate } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useIsMobile } from '@/hooks/useIsMobile'

export default function WorkLogPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [selectedDate, setSelectedDate] = useState(getKSTDate())
  // 모바일: 기본 닫힘 / 데스크톱: 기본 열림 (window.innerWidth로 동기 초기화)
  const [showCalendar, setShowCalendar] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth >= 1024
  })
  const [refreshKey, setRefreshKey] = useState(0)

  const isGuest = !user

  const handleWorkLogsUpdate = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">잠시만요...</div>
      </div>
    )
  }

  // ─── 모바일 레이아웃 ───
  if (isMobile) {
    return (
      <div className="flex flex-col bg-white overflow-hidden" style={{ height: '100dvh' }}>
        {/* 헤더 */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 z-40">
          <div className="px-4 py-3 flex items-center">
            <button
              onClick={() => setShowCalendar(true)}
              className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all mr-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <div className="flex-1 flex justify-center">
              <DatePicker selectedDate={selectedDate} onChange={setSelectedDate} />
            </div>
            {isGuest && (
              <button
                onClick={() => router.push('/login')}
                className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors ml-2"
              >
                로그인
              </button>
            )}
          </div>
        </header>

        {/* 스크롤 가능한 콘텐츠 영역 */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 110px)' }}
        >
          <DailyLogEditor targetDate={selectedDate} onSave={handleWorkLogsUpdate} />
        </div>

        {/* 캘린더 패널 */}
        <MobileCalendarPanel
          isOpen={showCalendar}
          onClose={() => setShowCalendar(false)}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          refreshKey={refreshKey}
        />

        {/* 하단 탭 */}
        <MobileBottomNav />
      </div>
    )
  }

  // ─── 데스크톱 레이아웃 ───
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                <span className="text-xl">🍊</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">일마카세</h1>
                <p className="text-xs text-gray-500">업무 기록</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isGuest && (
                <>
                  <button
                    onClick={() => router.push('/login')}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => router.push('/signup')}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors shadow-sm"
                  >
                    시작하기
                  </button>
                </>
              )}
              <DatePicker selectedDate={selectedDate} onChange={setSelectedDate} />
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className={`p-2.5 rounded-xl transition-all ${
                  showCalendar
                    ? 'bg-primary-100 text-primary-600 shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                title="캘린더 보기"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
          <DesktopTabs />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {showCalendar && (
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <CalendarView selectedDate={selectedDate} onDateSelect={setSelectedDate} />
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <WeeklySummary selectedDate={selectedDate} refreshKey={refreshKey} />
                </div>
              </div>
            </div>
          )}
          <div className={showCalendar ? 'lg:col-span-3' : 'lg:col-span-4'}>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm p-4 lg:p-6">
              <DailyLogEditor targetDate={selectedDate} onSave={handleWorkLogsUpdate} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
