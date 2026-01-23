'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { AIPreviewResponse } from '@/types'

export default function TryPreviewPage() {
  const router = useRouter()
  const [preview, setPreview] = useState<AIPreviewResponse | null>(null)

  useEffect(() => {
    loadPreview()
  }, [])

  const loadPreview = () => {
    try {
      const savedPreview = localStorage.getItem('demoPreview')
      if (savedPreview) {
        setPreview(JSON.parse(savedPreview))
      } else {
        // 데이터가 없으면 체험 페이지로 리다이렉트
        router.push('/try')
      }
    } catch (error) {
      console.error('localStorage 접근 실패:', error)
      router.push('/try')
    }
  }

  if (!preview) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8 py-6">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
              <i className="fas fa-check text-green-500 text-2xl"></i>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              AI 분석 완료! 🎉
            </h1>
            <p className="text-sm text-gray-500">
              이렇게 포트폴리오로 활용할 수 있어요
            </p>
          </div>

          {/* AI 분석 결과 */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4">
              <span className="text-xl">🤖</span>
              AI가 분석한 업무
            </h2>

            {preview.items.map((item, index) => (
              <Card key={index} className="bg-white border border-gray-100">
                {/* 넘버링 + 원본 업무 */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                    {index + 1}
                  </div>
                  <p className="flex-1 text-sm text-gray-700 leading-relaxed">
                    {item.original}
                  </p>
                </div>

                {/* AI 분석 박스 */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-100 space-y-3">
                  {/* 업무 한줄평 */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-600 text-base">💡</span>
                      <span className="text-xs text-green-700 font-bold">업무 한줄평</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {item.skill}
                    </p>
                  </div>

                  {/* 포트폴리오 표현 */}
                  <div className="pt-3 border-t border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-600 text-base">📝</span>
                      <span className="text-xs text-green-700 font-bold">포트폴리오 표현</span>
                    </div>
                    <p className="text-sm text-gray-800 font-medium">
                      "{item.portfolioTerm}"
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* 체험 모드 안내 */}
          <Card className="bg-amber-50 border-amber-100 mt-6">
            <div className="flex items-start gap-3">
              <div className="text-xl flex-shrink-0">⚠️</div>
              <div className="flex-1 text-sm">
                <p className="font-bold text-amber-900 mb-1">체험 모드</p>
                <p className="text-amber-700 text-xs leading-relaxed">
                  지금은 체험 모드입니다. 이 결과는 저장되지 않아요.
                  <br />
                  계속 사용하고 저장하려면 회원가입이 필요해요!
                </p>
              </div>
            </div>
          </Card>

          {/* 추가 기능 안내 */}
          <Card className="bg-blue-50 border-blue-100">
            <div className="flex items-start gap-3">
              <div className="text-xl flex-shrink-0">💬</div>
              <div className="flex-1 text-sm">
                <p className="font-bold text-blue-900 mb-1">회원가입하면</p>
                <ul className="text-blue-700 text-xs leading-relaxed space-y-1 list-disc list-inside">
                  <li>매일 업무 기록을 저장할 수 있어요</li>
                  <li>5일 기록이 쌓이면 자동으로 포트폴리오 카드가 생성돼요</li>
                  <li>3일 기록 시 AI 패턴 분석을 받을 수 있어요</li>
                  <li>모든 기록을 안전하게 보관할 수 있어요</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-gray-100 bg-white flex flex-col gap-3">
        <Button
          variant="primary"
          onClick={() => router.push('/signup')}
          className="w-full"
          size="lg"
        >
          <i className="fas fa-user-plus mr-2"></i>
          회원가입하고 저장하기
        </Button>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push('/try')}
            className="flex-1"
          >
            다시 체험하기
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/')}
            className="flex-1"
          >
            홈으로
          </Button>
        </div>
      </div>
    </div>
  )
}


