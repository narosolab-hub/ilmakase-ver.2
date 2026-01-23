'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { AIPreviewResponse } from '@/types'

interface PreviewPageProps {
  params: Promise<{ id: string }>
}

export default function PreviewPage({ params }: PreviewPageProps) {
  const router = useRouter()
  const [preview, setPreview] = useState<AIPreviewResponse | null>(null)
  const [recordId, setRecordId] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      const resolvedParams = await params
      setRecordId(resolvedParams.id)
    }
    init()
  }, [params])

  useEffect(() => {
    if (recordId) {
      loadPreview()
    }
  }, [recordId])

  const loadPreview = () => {
    try {
      // localStorage에서 미리보기 데이터 가져오기
      const savedPreview = localStorage.getItem('lastPreview')
      if (savedPreview) {
        setPreview(JSON.parse(savedPreview))
        // 사용 후 삭제
        localStorage.removeItem('lastPreview')
      }
    } catch (error) {
      console.error('localStorage 접근 실패:', error)
      // localStorage 접근 불가 시 기본값 설정
      setPreview({
        items: [
          {
            original: '기록이 저장되었습니다',
            skill: 'AI 분석을 준비 중입니다',
            portfolioTerm: '업무 기록'
          }
        ]
      })
    }
  }

  if (!preview) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">AI가 분석 중입니다...</p>
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
              기록되었습니다!
            </h1>
            <p className="text-sm text-gray-500">
              이 기록은 이렇게 쓸 수 있어요
            </p>
          </div>

          {/* AI 분석 결과 */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4">
              <span className="text-xl">🤖</span>
              AI가 분석한 오늘의 업무
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

          {/* Info */}
          <Card className="bg-blue-50 border-blue-100 mt-6">
            <div className="flex items-start gap-3">
              <div className="text-xl flex-shrink-0">💬</div>
              <p className="text-sm text-blue-900 flex-1 leading-relaxed">
                기록 몇 개만 더 쌓이면 <strong>완성된 포트폴리오 카드</strong>를 만들어드릴게요!
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-gray-100 bg-white flex gap-3">
        <Button
          variant="secondary"
          onClick={() => router.push('/home')}
          className="flex-1"
        >
          홈으로
        </Button>
        <Button
          variant="primary"
          onClick={() => router.push('/write')}
          className="flex-[2]"
        >
          계속 기록하기
        </Button>
      </div>
    </div>
  )
}
