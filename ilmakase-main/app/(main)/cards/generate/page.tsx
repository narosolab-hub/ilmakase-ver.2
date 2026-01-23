'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export default function CardGeneratePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cards/generate', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '카드 생성에 실패했습니다')
      }

      // 생성된 카드 상세 페이지로 이동
      if (data.card) {
        router.push(`/cards/${data.card.id}`)
      }
    } catch (error: any) {
      console.error('카드 생성 실패:', error)
      console.error('에러 상세:', error)
      const errorMessage = error.message || data?.error || '카드 생성에 실패했습니다. 다시 시도해주세요.'
      alert(errorMessage)
      router.push('/home')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-orange-50 to-white p-5">
      <div className="text-center max-w-md">
        <div className="text-7xl mb-6">🎨</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          차곡차곡 모은 업무 기록을<br />포트폴리오 카드로 바꿔볼까요?
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          AI가 5일간의 업무 기록을 분석해서 만들어 드릴게요.
        </p>

        {loading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto"></div>
            <p className="text-sm text-gray-500">
              AI가 열심히 분석 중입니다... (약 10초 소요)
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Button 
              variant="primary" 
              onClick={handleGenerate} 
              size="lg" 
              className="w-full"
            >
              만들어보기 🚀
            </Button>
            <button
              onClick={() => router.push('/home')}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
            >
              나중에 할게요
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

