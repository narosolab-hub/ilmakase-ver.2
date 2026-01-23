'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import type { AIAnalysis } from '@/types'

// 패턴 분석 목록 페이지

export default function AnalysesListPage() {
  const router = useRouter()
  const [analyses, setAnalyses] = useState<AIAnalysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalyses()
  }, [])

  const loadAnalyses = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('ai_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnalyses(data || [])
    } catch (error) {
      console.error('패턴 분석 로딩 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[date.getDay()]
    return `${year}.${month}.${day}(${weekday})`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="p-4 flex items-center gap-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <button onClick={() => router.push('/home')} className="text-gray-500 p-1">
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1 className="text-lg font-bold text-gray-800">패턴 분석</h1>
      </header>

      <div className="p-5 space-y-4">
        {analyses.length === 0 ? (
          <Card className="bg-white text-center py-12">
            <div className="text-gray-300 text-5xl mb-3">📊</div>
            <p className="text-gray-500 text-sm mb-4">아직 생성된 패턴 분석이 없어요</p>
            <p className="text-xs text-gray-400">
              5일간의 기록을 쌓으면<br />패턴 분석을 생성할 수 있어요
            </p>
          </Card>
        ) : (
          <>
            <div className="mb-2">
              <p className="text-sm text-gray-500">
                총 <span className="font-bold text-primary-600">{analyses.length}</span>개의 패턴 분석
              </p>
            </div>

            {analyses.map((analysis) => (
              <Card
                key={analysis.id}
                className="bg-white hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/analyses/${analysis.id}`)}
              >
                <div className="space-y-3">
                  {/* 헤더 */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500">
                          {formatDate(analysis.created_at)}
                        </span>
                        {analysis.project_id && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">
                            카드 생성됨
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-800 text-sm mb-2 line-clamp-1">
                        {analysis.pattern}
                      </h3>
                    </div>
                    <i className="fas fa-chevron-right text-gray-300 text-sm mt-1"></i>
                  </div>

                  {/* 키워드 */}
                  <div className="flex gap-2 flex-wrap">
                    {analysis.top_keywords.slice(0, 3).map((keyword: string, idx: number) => (
                      <span
                        key={idx}
                        className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full text-xs font-medium"
                      >
                        #{keyword}
                      </span>
                    ))}
                    {analysis.top_keywords.length > 3 && (
                      <span className="text-xs text-gray-400 px-2 py-0.5">
                        +{analysis.top_keywords.length - 3}
                      </span>
                    )}
                  </div>

                  {/* 인사이트 미리보기 */}
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {analysis.insight}
                  </p>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  )
}


