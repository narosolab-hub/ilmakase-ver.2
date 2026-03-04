'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { MonthlyWorkSummary, MentorFeedback, KPTReflection } from '@/components/Review'
import { useRouter } from 'next/navigation'
import { MobileBottomNav, DesktopTabs } from '@/components/UI'
import { dataCache, cacheKeys } from '@/lib/cache'
import type { MonthlyWorkSummary as MonthlyWorkSummaryType, MentorFeedback as MentorFeedbackType, KPTReflection as KPTReflectionType } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import { useConfirm } from '@/contexts/ConfirmContext'

interface MonthlyReviewData {
  id?: string
  year_month: string
  total_work_days: number
  avg_completion_rate: number
  ai_insights: MentorFeedbackType | null
  user_reflection: string | null
}

export default function ReviewPage() {
  const { user } = useAuth()
  const router = useRouter()
  const isGuest = !user
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [review, setReview] = useState<MonthlyReviewData | null>(null)
  const [workSummary, setWorkSummary] = useState<MonthlyWorkSummaryType | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [savingKPT, setSavingKPT] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  const fetchReview = useCallback(async () => {
    if (!user) return

    // 캐시 확인
    const cachedReview = dataCache.getImmediate<MonthlyReviewData>(cacheKeys.monthlyReview(user.id, selectedMonth))
    const cachedSummary = dataCache.getImmediate<MonthlyWorkSummaryType>(cacheKeys.monthlyWorkSummary(user.id, selectedMonth))

    if (cachedReview !== null || cachedSummary !== null) {
      if (cachedReview) setReview(cachedReview)
      if (cachedSummary) setWorkSummary(cachedSummary)
      setInitialLoadDone(true)
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/monthly-review?yearMonth=${selectedMonth}&includeWorkSummary=true`)
      const data = await res.json()

      setReview(data.review || null)
      setWorkSummary(data.workSummary || null)

      // 캐시 저장
      if (data.review) dataCache.set(cacheKeys.monthlyReview(user.id, selectedMonth), data.review)
      if (data.workSummary) dataCache.set(cacheKeys.monthlyWorkSummary(user.id, selectedMonth), data.workSummary)
    } catch (err) {
      console.error('회고 조회 실패:', err)
    } finally {
      setLoading(false)
      setInitialLoadDone(true)
    }
  }, [user, selectedMonth])

  useEffect(() => {
    fetchReview()
  }, [fetchReview])

  // AI 피드백 생성
  const generateFeedback = async () => {
    if (!user) {
      const ok = await confirm({ message: '이 기능을 사용하려면 로그인이 필요합니다.\n로그인 페이지로 이동할까요?', confirmLabel: '로그인' })
      if (ok) router.push('/login')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/monthly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearMonth: selectedMonth }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || '피드백 생성에 실패했습니다')
        return
      }

      const data = await res.json()
      setReview(data.review)
      dataCache.set(cacheKeys.monthlyReview(user.id, selectedMonth), data.review)
    } catch (err) {
      console.error('피드백 생성 실패:', err)
      toast.error('피드백 생성에 실패했습니다')
    } finally {
      setGenerating(false)
    }
  }

  // KPT 저장
  const saveKPT = async (kpt: KPTReflectionType) => {
    if (!user) {
      const ok = await confirm({ message: '이 기능을 사용하려면 로그인이 필요합니다.\n로그인 페이지로 이동할까요?', confirmLabel: '로그인' })
      if (ok) router.push('/login')
      return
    }
    setSavingKPT(true)
    try {
      const res = await fetch('/api/monthly-review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearMonth: selectedMonth,
          userReflection: JSON.stringify(kpt),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'KPT 저장에 실패했습니다')
        return
      }

      const data = await res.json()
      setReview(data.review)
      dataCache.set(cacheKeys.monthlyReview(user.id, selectedMonth), data.review)
      toast.success('회고가 저장됐어요')
    } catch (err) {
      console.error('KPT 저장 실패:', err)
      toast.error('KPT 저장에 실패했습니다')
    } finally {
      setSavingKPT(false)
    }
  }

  // ai_insights에서 MentorFeedback 추출 (이전 형식 호환)
  const getMentorFeedback = (): MentorFeedbackType | null => {
    if (!review?.ai_insights) return null
    // mentorSummary 키가 있으면 새 형식
    if ('mentorSummary' in review.ai_insights) {
      return review.ai_insights as MentorFeedbackType
    }
    // 이전 형식이면 null (새 피드백 받기 유도)
    return null
  }

  // user_reflection에서 KPT 추출
  const getKPT = (): KPTReflectionType => {
    if (!review?.user_reflection) return { keep: '', problem: '', try: '' }
    try {
      return JSON.parse(review.user_reflection) as KPTReflectionType
    } catch {
      // 이전에 plain text로 저장된 경우
      return { keep: review.user_reflection, problem: '', try: '' }
    }
  }

  // 최근 6개월
  const months = Array.from({ length: 6 }, (_, i) =>
    format(subMonths(new Date(), i), 'yyyy-MM')
  )

  const hasWorkLogs = (workSummary?.totalTasks ?? 0) > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                <span className="text-xl">🍊</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">일마카세</h1>
                <p className="text-xs text-gray-500">월간 회고</p>
              </div>
            </div>

            {isGuest && (
              <div className="flex items-center gap-2">
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
              </div>
            )}
          </div>

          <DesktopTabs />
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 lg:px-6 py-6 pb-20 lg:pb-6">
        {/* 월 선택 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {months.map((month) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(month)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedMonth === month
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {format(new Date(month + '-01'), 'yyyy년 M월', { locale: ko })}
            </button>
          ))}
        </div>

        {/* 로딩 (초기 로딩만) */}
        {!initialLoadDone && loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : (
          <div className="space-y-6">
            {/* 요약 바 + 프로젝트 분포 */}
            {workSummary && workSummary.totalTasks > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-4">
                {/* 통계 */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">업무일</span>
                    <span className="font-bold text-gray-900">{review?.total_work_days ?? '-'}일</span>
                  </div>
                  <div className="w-px h-6 bg-gray-200" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">업무</span>
                    <span className="font-bold text-gray-900">{workSummary.totalTasks}개</span>
                  </div>
                  <div className="w-px h-6 bg-gray-200" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">완료율</span>
                    <span className="font-bold text-primary-600">
                      {Math.round((workSummary.completedTasks / workSummary.totalTasks) * 100)}%
                    </span>
                  </div>
                </div>

                {/* 프로젝트 분포 */}
                {workSummary.projects.length > 0 && (
                  <div className="mt-3">
                    <div className="h-2 rounded-full overflow-hidden flex mb-2">
                      {workSummary.projects.map((p, i) => {
                        const pct = Math.round((p.totalCount / workSummary.totalTasks) * 100)
                        const colors = ['bg-primary-500', 'bg-blue-400', 'bg-emerald-400', 'bg-amber-400', 'bg-purple-400', 'bg-rose-400']
                        return (
                          <div
                            key={p.projectId ?? '__none__'}
                            className={colors[i % colors.length]}
                            style={{ width: `${pct}%` }}
                            title={`${p.projectName} ${pct}%`}
                          />
                        )
                      })}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {workSummary.projects.map((p, i) => {
                        const pct = Math.round((p.totalCount / workSummary.totalTasks) * 100)
                        const dotColors = ['bg-primary-500', 'bg-blue-400', 'bg-emerald-400', 'bg-amber-400', 'bg-purple-400', 'bg-rose-400']
                        return (
                          <div key={p.projectId ?? '__none__'} className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-sm flex-shrink-0 ${dotColors[i % dotColors.length]}`} />
                            <span className="text-xs text-gray-600">{p.projectName}</span>
                            <span className="text-xs text-gray-400">{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 섹션 1: 이번 달 뭐 했지? (기본 접힘) */}
            {workSummary && <MonthlyWorkSummary workSummary={workSummary} yearMonth={selectedMonth} />}

            {/* 섹션 2: AI 사수 피드백 */}
            <MentorFeedback
              feedback={getMentorFeedback()}
              generating={generating}
              hasWorkLogs={hasWorkLogs}
              onGenerate={generateFeedback}
            />

            {/* 섹션 3: 내 회고 (KPT) */}
            <KPTReflection
              initialKPT={getKPT()}
              saving={savingKPT}
              onSave={saveKPT}
            />
          </div>
        )}
      </main>

      {/* 모바일: 하단 탭 */}
      <MobileBottomNav />
    </div>
  )
}
