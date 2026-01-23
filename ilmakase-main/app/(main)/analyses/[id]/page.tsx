'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { AIAnalysis } from '@/types'

interface AnalysisDetailPageProps {
  params: {
    id: string
  }
}

export default function AnalysisDetailPage({ params }: AnalysisDetailPageProps) {
  const router = useRouter()
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalysis()
  }, [params.id])

  const loadAnalysis = async () => {
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
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setAnalysis(data)
    } catch (error) {
      console.error('패턴 분석 로딩 실패:', error)
      alert('패턴 분석을 불러오는데 실패했습니다')
      router.push('/analyses')
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

  if (!analysis) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="p-4 flex items-center gap-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <button onClick={() => router.push('/analyses')} className="text-gray-500 p-1">
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1 className="text-lg font-bold text-gray-800">패턴 분석 상세</h1>
      </header>

      <div className="p-5 space-y-4">
        {/* 날짜 정보 */}
        <div className="text-center py-2">
          <p className="text-xs text-gray-500">
            {formatDate(analysis.created_at)}
            {analysis.project_id && (
              <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">
                포트폴리오 카드 생성됨
              </span>
            )}
          </p>
        </div>

        <Card className="animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">✨</span>
            <h3 className="font-bold text-gray-800">패턴 발견</h3>
          </div>
          <p className="text-gray-700 leading-relaxed">{analysis.pattern}</p>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">📈</span>
            <h3 className="font-bold text-gray-800">업무 흐름</h3>
          </div>
          <p className="text-gray-700 leading-relaxed">{analysis.workflow}</p>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🏷️</span>
            <h3 className="font-bold text-gray-800">자주 등장하는 키워드</h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            {analysis.top_keywords.map((keyword: string, idx: number) => (
              <span
                key={idx}
                className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-medium"
              >
                #{keyword}
              </span>
            ))}
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">인사이트</h3>
              <p className="text-sm leading-relaxed text-gray-700">{analysis.insight}</p>
            </div>
          </div>
        </Card>

        <Button variant="primary" size="lg" fullWidth onClick={() => router.push('/analyses')}>
          목록으로 돌아가기
        </Button>
      </div>
    </div>
  )
}


