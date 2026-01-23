'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function AnalysisPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<any>(null)

  useEffect(() => {
    handleAnalyze()
  }, [])

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setAnalysis(data.analysis)
      } else {
        alert(data.error || 'AI 분석에 실패했습니다')
        router.push('/home')
      }
    } catch (error) {
      console.error('AI 분석 실패:', error)
      alert('AI 분석에 실패했습니다')
      router.push('/home')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="p-4 flex items-center gap-3 border-b border-gray-100">
          <button onClick={() => router.push('/home')} className="text-gray-500 p-1">
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 className="text-lg font-bold text-gray-800">AI 분석</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            AI가 분석 중이에요...
          </h2>
          <p className="text-gray-500 text-sm">
            당신의 업무 패턴을 찾고 있어요
          </p>
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
        <button onClick={() => router.push('/home')} className="text-gray-500 p-1">
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1 className="text-lg font-bold text-gray-800">AI 분석 결과</h1>
      </header>

      <div className="p-5 space-y-4">
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

        <Button variant="primary" size="lg" fullWidth onClick={() => router.push('/home')}>
          확인
        </Button>
      </div>
    </div>
  )
}

