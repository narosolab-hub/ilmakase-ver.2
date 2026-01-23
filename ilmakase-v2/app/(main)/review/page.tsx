'use client'

import { useState, useEffect } from 'react'
import { format, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { Button, Card, CardHeader, CardTitle, CardContent, ProgressBar } from '@/components/UI'

interface MonthlyReview {
  id: string
  year_month: string
  total_work_days: number
  avg_completion_rate: number
  work_type_distribution: Record<string, number>
  project_distribution: Record<string, number>
  monthly_comparison: {
    completion_rate_change: number
    previous_month: string
  } | null
  ai_insights: {
    summary: string
    trends: string[]
    insights: string[]
    suggestions: string[]
  } | null
}

export default function ReviewPage() {
  const { user } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [review, setReview] = useState<MonthlyReview | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (user) fetchReview()
  }, [user, selectedMonth])

  const fetchReview = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/monthly-review?yearMonth=${selectedMonth}`)
      const data = await res.json()
      setReview(data.review)
    } catch (err) {
      console.error('회고 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateReview = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/monthly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearMonth: selectedMonth }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '회고 생성에 실패했습니다')
        return
      }

      const data = await res.json()
      setReview(data.review)
    } catch (err) {
      console.error('회고 생성 실패:', err)
      alert('회고 생성에 실패했습니다')
    } finally {
      setGenerating(false)
    }
  }

  // 최근 6개월
  const months = Array.from({ length: 6 }, (_, i) =>
    format(subMonths(new Date(), i), 'yyyy-MM')
  )

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
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
          </div>

          {/* 탭 메뉴 */}
          <div className="flex gap-2 mt-4">
            <a
              href="/worklog"
              className="px-5 py-2 rounded-xl font-medium text-gray-600 hover:text-gray-900 hover:bg-white/50"
            >
              <span className="flex items-center gap-2">
                <span>📝</span>
                <span>데일리 로그</span>
              </span>
            </a>
            <a
              href="/projects"
              className="px-5 py-2 rounded-xl font-medium text-gray-600 hover:text-gray-900 hover:bg-white/50"
            >
              <span className="flex items-center gap-2">
                <span>📁</span>
                <span>프로젝트</span>
              </span>
            </a>
            <a
              href="/review"
              className="px-5 py-2 rounded-xl font-medium bg-white text-primary-600 shadow-sm"
            >
              <span className="flex items-center gap-2">
                <span>📊</span>
                <span>회고</span>
              </span>
            </a>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-6 py-6">
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

        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : review ? (
          <div className="space-y-6">
            {/* 요약 카드 */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {format(new Date(selectedMonth + '-01'), 'yyyy년 M월', { locale: ko })} 요약
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-3xl font-bold text-gray-900">
                      {review.total_work_days}
                    </div>
                    <div className="text-sm text-gray-500">업무 일수</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-3xl font-bold text-primary-600">
                      {review.avg_completion_rate}%
                    </div>
                    <div className="text-sm text-gray-500">평균 완료율</div>
                  </div>
                  {review.monthly_comparison && (
                    <div className="text-center p-4 bg-gray-50 rounded-xl col-span-2">
                      <div className={`text-2xl font-bold ${
                        review.monthly_comparison.completion_rate_change >= 0
                          ? 'text-emerald-600'
                          : 'text-red-500'
                      }`}>
                        {review.monthly_comparison.completion_rate_change >= 0 ? '↑' : '↓'}{' '}
                        {Math.abs(review.monthly_comparison.completion_rate_change)}%p
                      </div>
                      <div className="text-sm text-gray-500">전월 대비</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 업무 유형 분포 */}
            {review.work_type_distribution && Object.keys(review.work_type_distribution).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>업무 유형별 분포</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(review.work_type_distribution)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, percentage]) => (
                        <div key={type}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700">{type}</span>
                            <span className="text-gray-500">{percentage}%</span>
                          </div>
                          <ProgressBar value={percentage} color="primary" />
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI 인사이트 */}
            {review.ai_insights && (
              <Card>
                <CardHeader>
                  <CardTitle>AI 인사이트</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700">{review.ai_insights.summary}</p>

                  {review.ai_insights.trends.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">발견된 트렌드</h4>
                      <ul className="space-y-1">
                        {review.ai_insights.trends.map((trend, i) => (
                          <li key={i} className="text-sm text-gray-600 flex gap-2">
                            <span>📈</span>
                            <span>{trend}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {review.ai_insights.suggestions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">다음 달 제안</h4>
                      <ul className="space-y-1">
                        {review.ai_insights.suggestions.map((suggestion, i) => (
                          <li key={i} className="text-sm text-gray-600 flex gap-2">
                            <span>💡</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-500 mb-4">
                {format(new Date(selectedMonth + '-01'), 'M월', { locale: ko })}의 회고가 없습니다.<br />
                AI가 이번 달을 분석해드릴게요!
              </p>
              <Button
                variant="primary"
                onClick={generateReview}
                loading={generating}
              >
                월간 회고 생성하기
              </Button>
              <p className="text-xs text-gray-400 mt-3">
                * 베이직 플랜 이상에서 사용 가능합니다
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
