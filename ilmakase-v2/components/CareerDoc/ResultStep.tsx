'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardContent } from '@/components/UI'
import type { Company } from '@/types'

interface ResultStepProps {
  company: Company
  generatedContent: string
  isGenerating: boolean
  onBack: () => void
  onRegenerate: () => void
}

export default function ResultStep({
  company,
  generatedContent,
  isGenerating,
  onBack,
  onRegenerate,
}: ResultStepProps) {
  const [content, setContent] = useState(generatedContent)
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    setContent(generatedContent)
  }, [generatedContent])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('복사 실패:', err)
      alert('복사에 실패했습니다.')
    }
  }

  const formatPeriod = () => {
    if (!company.start_date) return ''
    const start = company.start_date.slice(0, 7).replace('-', '.')
    if (company.is_current) return `${start} ~ 현재`
    if (company.end_date) {
      const end = company.end_date.slice(0, 7).replace('-', '.')
      return `${start} ~ ${end}`
    }
    return start
  }

  if (isGenerating) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">경력기술서 생성 중...</h2>
          <p className="text-sm text-gray-600">
            AI가 {company.name}에서의 경력을 정리하고 있어요.
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent mb-4" />
            <p className="text-gray-600">잠시만 기다려주세요...</p>
            <p className="text-sm text-gray-500 mt-2">
              프로젝트 수와 업무 기록량에 따라 시간이 걸릴 수 있어요.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">경력기술서 완성!</h2>
        <p className="text-sm text-gray-600">
          내용을 확인하고 필요하면 수정하세요. 수정한 내용은 복사할 때 반영돼요.
        </p>
      </div>

      {/* 회사 정보 요약 */}
      <div className="p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{company.name}</h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
              {company.position && <span>{company.position}</span>}
              {company.department && <span>· {company.department}</span>}
            </div>
            {company.start_date && (
              <p className="text-xs text-gray-500 mt-1">{formatPeriod()}</p>
            )}
          </div>
        </div>
      </div>

      {/* 경력기술서 내용 */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">경력기술서</h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? '미리보기' : '편집'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
              >
                다시 생성
              </Button>
            </div>
          </div>

          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-[400px] p-4 border border-gray-300 rounded-xl text-sm font-mono leading-relaxed focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="경력기술서 내용..."
            />
          ) : (
            <div className="p-4 bg-gray-50 rounded-xl max-h-[400px] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                {content}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 도움말 */}
      <div className="p-4 bg-amber-50 rounded-xl">
        <h4 className="text-sm font-medium text-amber-800 mb-2">작성 팁</h4>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• 수치가 있으면 더 구체적으로 수정해보세요 (예: "성과 개선" → "전환율 30% 향상")</li>
          <li>• 어색한 표현이 있으면 직접 다듬어주세요</li>
          <li>• 회사나 프로젝트에 대한 구체적인 맥락을 추가하면 더 좋아요</li>
        </ul>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 pt-4">
        <Button variant="ghost" onClick={onBack}>
          이전
        </Button>
        <Button
          variant="primary"
          fullWidth
          size="lg"
          onClick={handleCopy}
        >
          {copied ? '복사 완료!' : '경력기술서 복사하기'}
        </Button>
      </div>

      {/* AI 안내 */}
      <p className="text-xs text-center text-gray-500">
        AI가 생성한 내용이에요. 실제 사실과 다른 부분이 있을 수 있으니 꼭 확인해주세요.
      </p>
    </div>
  )
}
