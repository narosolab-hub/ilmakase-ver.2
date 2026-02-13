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
  const [showCalendar, setShowCalendar] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const isGuest = !user

  // DailyLogEditor에서 저장 완료 시 호출
  const handleWorkLogsUpdate = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  // 인증 로딩 중일 때 (아주 짧은 시간)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">잠시만요...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 lg:py-4">
          {/* 모바일 헤더 */}
          {isMobile ? (
            <div className="flex items-center">
              {/* 캘린더 버튼 */}
              <button
                onClick={() => setShowCalendar(true)}
                className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all mr-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              {/* 날짜 네비게이션 (가운데) */}
              <div className="flex-1 flex justify-center">
                <DatePicker
                  selectedDate={selectedDate}
                  onChange={setSelectedDate}
                />
              </div>

              {/* 게스트: 로그인 버튼 */}
              {isGuest && (
                <button
                  onClick={() => router.push('/login')}
                  className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors ml-2"
                >
                  로그인
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                {/* 로고 */}
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
                  {/* 게스트: 로그인/시작하기 */}
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

                  {/* 날짜 선택 & 캘린더 토글 */}
                  <DatePicker
                    selectedDate={selectedDate}
                    onChange={setSelectedDate}
                  />
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
            </>
          )}
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6 pb-36 lg:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 사이드바 - 캘린더 + 주간 요약 (데스크톱) */}
          {!isMobile && showCalendar && (
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <CalendarView
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                  />
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <WeeklySummary selectedDate={selectedDate} refreshKey={refreshKey} />
                </div>
              </div>
            </div>
          )}

          {/* 메인 에디터 */}
          <div className={!isMobile && showCalendar ? 'lg:col-span-3' : 'lg:col-span-4'}>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm p-4 lg:p-6">
              <DailyLogEditor targetDate={selectedDate} onSave={handleWorkLogsUpdate} />
            </div>
          </div>
        </div>
      </main>

      {/* 모바일: 캘린더 사이드 패널 */}
      {isMobile && (
        <MobileCalendarPanel
          isOpen={showCalendar}
          onClose={() => setShowCalendar(false)}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          refreshKey={refreshKey}
        />
      )}

      {/* 모바일: 하단 탭 */}
      <MobileBottomNav />
    </div>
  )
}
